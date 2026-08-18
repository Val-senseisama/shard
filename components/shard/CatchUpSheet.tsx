import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sheet, hud, TYPE, Num, HudButton, RADIUS } from '~/components/hud';

export interface CatchUpTarget {
  miniGoalId: string;
  taskIndex: number;
  /** The task being caught up TO — named in the confirmation. */
  taskTitle: string;
  /** How many tasks this completes, including the target. */
  count: number;
  /** Total XP those tasks are worth. */
  xp: number;
}

/**
 * Confirmation for a catch-up.
 *
 * This marks an arbitrary number of tasks complete in one action, so it must
 * never be reachable by a single mis-tap, and it has to say exactly what it is
 * about to do — the count, and where it stops. "Catch up" alone doesn't tell
 * anyone whether they're about to complete three tasks or thirty.
 */
export default function CatchUpSheet({
  target,
  visible,
  isDark,
  busy,
  onConfirm,
  onClose,
}: {
  target: CatchUpTarget | null;
  visible: boolean;
  isDark: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const c = hud(isDark);

  return (
    <Sheet visible={visible} onClose={onClose} isDark={isDark}>
      {target && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: RADIUS.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${c.violet}1F`,
              }}>
              <Ionicons name="checkmark-done" size={20} color={c.violet} />
            </View>
            <Text style={[TYPE.title(17), { color: c.text, flex: 1 }]}>Catch up</Text>
          </View>

          <Text style={[TYPE.body(14), { color: c.textDim }]}>
            This marks{' '}
            <Text style={{ color: c.text }}>
              {target.count} task{target.count === 1 ? '' : 's'}
            </Text>{' '}
            complete, up to and including “{target.taskTitle}”.
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 12,
              borderRadius: RADIUS.md,
              backgroundColor: c.bgElev,
              borderWidth: 1,
              borderColor: c.panelBorder,
            }}>
            <Text style={[TYPE.label(13), { color: c.textDim }]}>You&apos;ll earn</Text>
            <Num size={15} color={c.ember}>
              +{target.xp} XP
            </Num>
          </View>

          <HudButton
            label={busy ? 'Catching up…' : `Mark ${target.count} complete`}
            onPress={onConfirm}
            isDark={isDark}
            variant="primary"
            size="md"
            disabled={busy}
          />
          <HudButton
            label="Cancel"
            onPress={onClose}
            isDark={isDark}
            variant="ghost"
            size="md"
          />
        </View>
      )}
    </Sheet>
  );
}
