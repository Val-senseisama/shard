import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client';
import { GET_STREAKS } from '~/Graphql/Queries';
import { REPAIR_STREAK } from '~/Graphql/Mutations';
import { hud, FONT, RADIUS, HudLabel, Num, HudButton } from '~/components/hud';

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

  const { data, refetch } = useQuery(GET_STREAKS, { fetchPolicy: 'cache-and-network' });
  const [repair, { loading: repairing }] = useMutation(REPAIR_STREAK);

  const streak: StreakInfo | undefined = data?.getStreaks?.streaks?.[0];

  const handleRepair = useCallback(async () => {
    try {
      const res = await repair();
      const payload = res.data?.repairStreak;
      if (payload?.success) {
        onRepaired?.(payload.restored ?? 0);
        refetch();
      }
    } catch {
      // The mutation surfaces its own message; nothing useful to add here.
    }
  }, [repair, refetch, onRepaired]);

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
            You can still get it back — repairs are open for a couple of days.
          </HudLabel>
          <HudButton
            label={repairing ? 'Repairing…' : 'Repair my streak'}
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
