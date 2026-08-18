import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client';
import { GET_STREAKS } from '~/Graphql/Queries';
import { REPAIR_STREAK } from '~/Graphql/Mutations';
import { hud, FONT, RADIUS, HudLabel, HudSkeleton, Num, HudButton } from '~/components/hud';
import { openPaywall } from '~/helpers/paywall';
import { useAppStore } from '~/store/app.store';
import { useUserStore } from '~/store/user.store';

/**
 * The streak, with the state it's actually in.
 *
 * Worth having as its own surface because the streak now has states beyond a
 * number: it can be at risk, held up by a freeze, or broken and repairable.
 * Previously the UI showed a bare count that never decayed — a user who last
 * completed something three weeks ago still saw "🔥 12", because nothing on the
 * server ever set the streak back to zero.
 */

type StreakState = 'none' | 'active' | 'at_risk' | 'frozen' | 'broken';

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  state?: StreakState | null;
  freezesAvailable?: number | null;
  atRiskToday?: boolean | null;
}

export default function StreakCard({ onRepaired }: { onRepaired?: (days: number) => void }) {
  const isDark = useColorScheme() === 'dark';
  const c = hud(isDark);

  const addAlert = useAppStore((s) => s.addAlert);
  // Repair is Pro-only, so the card has to say so rather than offer it and then
  // bounce the user to a paywall they weren't expecting.
  const isPro = useUserStore(
    (s) => s.user?.subscriptionTier === 'pro' || !!s.user?.isInTrial
  );

  const { data, loading, refetch } = useQuery(GET_STREAKS, { fetchPolicy: 'cache-and-network' });
  const [repair, { loading: repairing }] = useMutation(REPAIR_STREAK);

  const streak: StreakInfo | undefined = data?.getStreaks?.streaks?.[0];

  const handleRepair = useCallback(async () => {
    try {
      const res = await repair();
      const payload = res.data?.repairStreak;

      if (payload?.success) {
        onRepaired?.(payload.restored ?? 0);
        refetch();
        return;
      }

      // Repair is Pro-only. This is the strongest upgrade moment in the product
      // — someone who just lost a 23-day streak — and it used to be a button
      // that did nothing: the resolver returned `success: false` with a real
      // explanation and this handler dropped it on the floor.
      if (payload?.needsUpgrade) {
        openPaywall('streak_repair');
        return;
      }

      if (payload?.message) {
        addAlert({ str: payload.message, type: 'info' });
      }
    } catch (e: any) {
      addAlert({ str: e?.message || "Couldn't repair your streak.", type: 'error' });
    }
  }, [repair, refetch, onRepaired, addAlert]);

  // Hold the slot while the first fetch is in flight.
  //
  // This used to `return null` until GET_STREAKS resolved, which is what caused
  // the card to render on top of the Pro banner and the Account list. An empty
  // wrapper measures zero, every sibling below it gets laid out at that zero
  // height, and then the card's ~190px of content arrives and paints outside its
  // own bounds — RN Android does not clip an overflowing View — landing behind
  // whatever was placed in the space it never reserved. A skeleton makes the
  // slot the same height from the first frame, so nothing after it ever moves.
  //
  // `data === undefined` rather than `loading`: this is cache-and-network, so
  // `loading` is also true during background refetches, and blanking a card the
  // user is already reading would be its own bug.
  if (data === undefined && loading) {
    return (
      <View
        style={{
          backgroundColor: c.panel,
          borderColor: c.panelBorder,
          borderWidth: 1,
          borderRadius: RADIUS.md,
          padding: 16,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <HudSkeleton isDark={isDark} width={40} height={40} radius={RADIUS.pill} />
          <View style={{ flex: 1, gap: 6 }}>
            <HudSkeleton isDark={isDark} width={72} height={22} radius={6} />
            <HudSkeleton isDark={isDark} width="60%" height={12} radius={4} />
          </View>
        </View>
      </View>
    );
  }

  if (!streak) return null;

  const state: StreakState = (streak.state as StreakState) ?? 'none';
  const freezes = streak.freezesAvailable ?? 0;

  // Copy and colour per state. `broken` is the only one with an action, and it's
  // the highest-value moment in the whole streak loop — a user who just lost a
  // long streak is the most motivated they will ever be.
  const presentation: Record<
    StreakState,
    { tint: string; icon: keyof typeof Ionicons.glyphMap; caption: string }
  > = {
    active: {
      tint: c.ember,
      icon: 'flame',
      caption: streak.currentStreak === 1 ? 'Day one. Come back tomorrow.' : "Today's secured.",
    },
    at_risk: {
      tint: c.ember,
      icon: 'flame-outline',
      caption: freezes > 0 ? 'Not secured yet today.' : 'Finish one task to keep it.',
    },
    frozen: { tint: c.cyan, icon: 'snow', caption: 'A freeze is holding your streak.' },
    broken: { tint: c.textDim, icon: 'flame-outline', caption: 'Your streak ended.' },
    none: { tint: c.textDim, icon: 'flame-outline', caption: 'Complete a task to start one.' },
  };

  const p = presentation[state];
  const showRepair = state === 'broken';

  return (
    <View
      style={{
        backgroundColor: c.panel,
        borderColor: state === 'at_risk' ? c.ember : c.panelBorder,
        borderWidth: 1,
        borderRadius: RADIUS.md,
        padding: 16,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: RADIUS.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${p.tint}1F`,
          }}>
          <Ionicons name={p.icon} size={20} color={p.tint} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            {/* Numerals only — see the mono rule in components/hud. */}
            <Num color={p.tint} size={24}>
              {streak.currentStreak}
            </Num>
            <Text style={{ fontFamily: FONT.semibold, fontSize: 13, color: c.textDim }}>
              {streak.currentStreak === 1 ? 'day' : 'days'}
            </Text>
          </View>
          <HudLabel color={c.textDim} style={{ marginTop: 2 }}>
            {p.caption}
          </HudLabel>
        </View>

        {freezes > 0 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: RADIUS.pill,
              backgroundColor: `${c.cyan}14`,
            }}>
            <Ionicons name="snow-outline" size={12} color={c.cyan} />
            <Num color={c.cyan} size={11}>
              {freezes}
            </Num>
          </View>
        )}
      </View>

      {showRepair && (
        <View style={{ marginTop: 14 }}>
          <HudLabel color={c.textDim} style={{ marginBottom: 10 }}>
            {isPro
              ? 'You can still get it back — repairs are open for a couple of days.'
              : 'Freezes cover single missed days. Bringing a broken streak back is a Pro feature.'}
          </HudLabel>
          <HudButton
            label={
              repairing ? 'Repairing…' : isPro ? 'Repair my streak' : 'Repair with Pro'
            }
            onPress={handleRepair}
            isDark={isDark}
            variant="primary"
            size="md"
            icon="refresh"
            loading={repairing}
            fullWidth
          />
        </View>
      )}
    </View>
  );
}
