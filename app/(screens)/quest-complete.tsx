import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Share, Platform } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { GET_SHARE_CARD } from '~/Graphql/Queries';
import { RECORD_SHARE } from '~/Graphql/Mutations';
import ShareCard from '~/components/ShareCard';
import { hud, FONT, RADIUS, HudLabel, HudButton, Num } from '~/components/hud';
import { track } from '~/helpers/analytics';
import { openPaywall } from '~/helpers/paywall';
import { haptic } from '~/helpers/motion';

/**
 * The moment after finishing a quest.
 *
 * Two jobs, in this order:
 *
 *  1. **Hand the user something worth posting.** This is the product's only
 *     outward-facing growth loop — a completion is the most flattering, most
 *     legible thing that happens in the app, and until now it produced nothing
 *     anyone outside could see.
 *  2. **Then, and only on the first completion, make the Pro case.** The paywall
 *     used to run during onboarding, before the user had created a single quest.
 *     Here they have just proved the product works for them, which is the only
 *     honest place to ask for money.
 */
export default function QuestComplete() {
  const { shareId, xpEarned, firstCompletion } = useLocalSearchParams<{
    shareId?: string;
    xpEarned?: string;
    firstCompletion?: string;
  }>();

  const isDark = useColorScheme() === 'dark';
  const c = hud(isDark);
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const isFirstCompletion = firstCompletion === '1';

  // One success pattern on arrival: this screen only ever opens after a win.
  useEffect(() => {
    haptic.celebrate();
  }, []);

  const { data } = useQuery(GET_SHARE_CARD, {
    variables: { shareId },
    skip: !shareId,
  });
  const [recordShare] = useMutation(RECORD_SHARE);

  const card = data?.getShareCard?.card;

  const handleShare = useCallback(async () => {
    if (!card || sharing) return;
    setSharing(true);
    track('share_tapped', { props: { type: card.type } });

    try {
      // Try the image first — a visual artifact is the whole point, and a
      // text-only share of "I finished a thing" travels nowhere.
      let sharedAsImage = false;
      if (cardRef.current && (await Sharing.isAvailableAsync())) {
        try {
          const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: card.headline,
            UTI: 'public.png',
          });
          sharedAsImage = true;
        } catch {
          // Capture or the sheet failed — fall through to text.
        }
      }

      if (!sharedAsImage) {
        // Text still carries the link, so the loop degrades rather than breaking.
        await Share.share(
          Platform.OS === 'ios'
            ? { message: card.shareText }
            : { message: card.shareText, title: card.headline }
        );
      }

      // Recorded optimistically: the OS sheet doesn't reliably report whether the
      // user completed or cancelled, and under-counting a loop you're trying to
      // measure is worse than a small over-count.
      await recordShare({ variables: { shareId: card.id, platform: 'custom' } }).catch(() => {});
    } finally {
      setSharing(false);
    }
  }, [card, sharing, recordShare]);

  const handleDone = useCallback(() => {
    if (isFirstCompletion) {
      // The trial has just ended on a high note. Make the case here.
      openPaywall('first_completion');
      return;
    }
    router.replace('/(screens)/Home');
  }, [isFirstCompletion]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, alignItems: 'center', paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', marginBottom: 22 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: RADIUS.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${c.violet}1F`,
              marginBottom: 14,
            }}>
            <Ionicons name="trophy" size={28} color={c.violet} />
          </View>

          <Text
            style={{
              fontFamily: FONT.extrabold,
              fontSize: 24,
              letterSpacing: -0.5,
              color: c.text,
              textAlign: 'center',
            }}>
            You finished it
          </Text>

          {xpEarned ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 6 }}>
              <Num color={c.violet} size={16}>
                {`+${xpEarned}`}
              </Num>
              <Text style={{ fontFamily: FONT.medium, fontSize: 13, color: c.textDim }}>XP</Text>
            </View>
          ) : null}
        </Animated.View>

        {card ? (
          <Animated.View entering={FadeInDown.delay(150).duration(260)}>
            <ShareCard ref={cardRef} data={card} isDark={isDark} />
          </Animated.View>
        ) : null}

        <Animated.View
          entering={FadeInDown.delay(150).duration(260)}
          style={{ width: '100%', maxWidth: 340, marginTop: 26, gap: 10 }}>
          {card ? (
            <>
              <HudLabel color={c.textDim} style={{ textAlign: 'center', marginBottom: 4 }}>
                Worth showing someone. It's the proof you did it.
              </HudLabel>
              <HudButton
                label={sharing ? 'Opening…' : 'Share this'}
                onPress={handleShare}
                isDark={isDark}
                variant="primary"
                size="lg"
                icon="share-social"
                loading={sharing}
                fullWidth
              />
            </>
          ) : null}

          <HudButton
            label={isFirstCompletion ? 'See what Pro adds' : 'Back to my quests'}
            onPress={handleDone}
            isDark={isDark}
            variant={isFirstCompletion ? 'secondary' : 'ghost'}
            size="lg"
            fullWidth
          />

          {isFirstCompletion ? (
            <HudButton
              label="Not now"
              onPress={() => router.replace('/(screens)/Home')}
              isDark={isDark}
              variant="ghost"
              size="md"
              fullWidth
            />
          ) : null}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
