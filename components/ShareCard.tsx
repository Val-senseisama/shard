import React, { forwardRef } from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { hud, FONT, RADIUS, Num, WordMark } from '~/components/hud';

export interface ShareCardData {
  headline: string;
  subline?: string | null;
  questTitle?: string | null;
  completion?: number | null;
  xpEarned?: number | null;
  daysTaken?: number | null;
  onTime?: boolean | null;
}

/**
 * The completion artifact — the thing people actually post.
 *
 * Designed to be legible to a stranger who has never heard of Shard, because
 * that's the entire audience for a share. So the hierarchy is
 * **outcome → effort → source**: what got finished, how long it took, and only
 * then whose app it was. XP and levels are deliberately small; they mean nothing
 * outside the app and leading with them is what makes gamified-app shares read
 * as spam.
 *
 * Fixed 4:5 portrait — the aspect ratio that survives Instagram, WhatsApp status
 * and X without being cropped into nonsense.
 */
const ShareCard = forwardRef<View, { data: ShareCardData; isDark?: boolean }>(
  ({ data, isDark = true }, ref) => {
    const c = hud(isDark);
    const days = data.daysTaken ?? null;

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{
          width: 320,
          height: 400,
          borderRadius: RADIUS.lg,
          overflow: 'hidden',
          backgroundColor: c.bg,
        }}>
        <LinearGradient
          colors={isDark ? ['#1B1230', '#0F0E0E', '#0F0E0E'] : ['#EDE9FE', '#F3F2F8', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, padding: 28, justifyContent: 'space-between' }}>
          {/* Top: the claim */}
          <View>
            <Text
              style={{
                fontFamily: FONT.semibold,
                fontSize: 12,
                letterSpacing: 0.4,
                color: c.violet,
                marginBottom: 14,
              }}>
              Quest complete
            </Text>

            <Text
              style={{
                fontFamily: FONT.extrabold,
                fontSize: 30,
                lineHeight: 35,
                letterSpacing: -0.6,
                color: c.text,
              }}
              numberOfLines={4}>
              {data.questTitle || data.headline}
            </Text>
          </View>

          {/* Middle: the effort, in numerals */}
          <View style={{ flexDirection: 'row', gap: 24 }}>
            {days != null && (
              <View>
                <Num color={c.cyan} size={30}>
                  {days}
                </Num>
                <Text style={{ fontFamily: FONT.medium, fontSize: 11, color: c.textDim, marginTop: 2 }}>
                  {days === 1 ? 'day' : 'days'}
                </Text>
              </View>
            )}

            {data.completion != null && (
              <View>
                <Num color={c.text} size={30}>
                  {`${data.completion}%`}
                </Num>
                <Text style={{ fontFamily: FONT.medium, fontSize: 11, color: c.textDim, marginTop: 2 }}>
                  complete
                </Text>
              </View>
            )}

            {data.onTime ? (
              <View style={{ justifyContent: 'flex-end' }}>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: RADIUS.pill,
                    backgroundColor: `${c.cyan}1F`,
                  }}>
                  <Text style={{ fontFamily: FONT.semibold, fontSize: 11, color: c.cyan }}>
                    On time
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Bottom: attribution, small on purpose */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <WordMark size={15} color={c.text} accent={c.violet} />
            <Text style={{ fontFamily: FONT.regular, fontSize: 11, color: c.textFaint }}>
              Planned with Shard
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }
);

ShareCard.displayName = 'ShareCard';
export default ShareCard;
