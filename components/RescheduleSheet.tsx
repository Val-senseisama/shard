import React, { useCallback, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@apollo/client';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { RESOLVE_OVERDUE_TASK, RESCHEDULE_MINI_GOAL } from '~/Graphql/Mutations';
import AnimatedPressable from './AnimatedPressable';
import { hud, FONT, RADIUS, Sheet } from '~/components/hud';

/**
 * Move a task to another day, or drop it.
 *
 * `resolveOverdueTask` has been on the server — permission-checked, recording
 * `originalDueDate` on the first move so RescheduledBadge can say where a task
 * came from — and `RESOLVE_OVERDUE_TASK` has been in Graphql/Mutations.ts, with
 * no call site anywhere in the app. A missed task could therefore only be
 * completed late or left to rot; there was no way to say "not today, Thursday".
 *
 * The presets are the whole point. A date picker alone makes the common case
 * (move it to tomorrow) a three-tap dialog, and the reason people abandon a plan
 * is that fixing it costs more than ignoring it.
 */

export interface RescheduleTarget {
  miniGoalId: string;
  /**
   * 0-based position in the mini-goal — how `resolveOverdueTask` addresses it.
   * Omit to move the WHOLE mini-goal, which carries every open task with it.
   */
  taskIndex?: number;
  title: string;
  /** How many open tasks will move. Shown only for a mini-goal. */
  taskCount?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  task: RescheduleTarget | null;
  isDark: boolean;
  /** Refetch the schedule; the mutation returns only success/message. */
  onResolved?: () => void;
}

/** Local midnight `offsetDays` from today, at 9am — a due *time* nobody set. */
function dayAt9am(offsetDays: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(9, 0, 0, 0);
  return d;
}

const PRESETS: { label: string; hint: string; offset: number }[] = [
  { label: 'Today', hint: 'Still doable', offset: 0 },
  { label: 'Tomorrow', hint: 'Most common', offset: 1 },
  { label: 'Next week', hint: 'Needs a proper slot', offset: 7 },
];

const RescheduleSheet: React.FC<Props> = ({ visible, onClose, task, isDark, onResolved }) => {
  const c = hud(isDark);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [resolveOverdue] = useMutation(RESOLVE_OVERDUE_TASK);
  const [rescheduleMiniGoal] = useMutation(RESCHEDULE_MINI_GOAL);

  // Absent taskIndex means the target is the mini-goal itself.
  const isMiniGoal = task != null && task.taskIndex === undefined;

  const run = useCallback(
    async (action: 'reschedule' | 'drop', newDueDate?: Date) => {
      if (!task || busy) return;
      setBusy(true);
      try {
        // Two mutations, deliberately not one. Moving a mini-goal is a shift of
        // several tasks that has to preserve their spacing and can legitimately
        // be refused (it would strand work in the past); moving one task is a
        // single assignment that never fails that way. Folding them together
        // would mean one resolver guessing which it was being asked to do.
        const res = isMiniGoal
          ? await rescheduleMiniGoal({
              variables: {
                miniGoalId: task.miniGoalId,
                newDueDate: String((newDueDate ?? new Date()).getTime()),
              },
            })
          : await resolveOverdue({
              variables: {
                miniGoalId: task.miniGoalId,
                taskIndex: task.taskIndex,
                action,
                // Epoch millis as a string — the resolver runs it through
                // `Number(newDueDate) || newDueDate`, and millis is what every
                // other date crossing this API uses.
                newDueDate: newDueDate ? String(newDueDate.getTime()) : undefined,
              },
            });

        const payload = isMiniGoal
          ? res?.data?.rescheduleMiniGoal
          : res?.data?.resolveOverdueTask;
        const ok = payload?.success;

        Toast.show({
          type: ok ? 'success' : 'error',
          // The server explains a refusal precisely ("that would put 3 tasks in
          // the past"), so surface its message rather than a generic failure.
          text1: payload?.message ?? (ok ? 'Task updated' : 'Could not update that.'),
        });
        if (ok) {
          onResolved?.();
          onClose();
        }
      } catch {
        Toast.show({ type: 'error', text1: 'Could not update that.' });
      } finally {
        setBusy(false);
      }
    },
    [task, busy, isMiniGoal, resolveOverdue, rescheduleMiniGoal, onResolved, onClose]
  );

  if (!task) return null;

  return (
    <Sheet visible={visible} onClose={onClose} isDark={isDark}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 28, gap: 4 }}>
        <Text style={{ fontFamily: FONT.bold, fontSize: 17, color: c.text }}>
          {isMiniGoal ? 'Move this mini-goal' : 'Move this task'}
        </Text>
        <Text
          numberOfLines={2}
          style={{ fontFamily: FONT.regular, fontSize: 14, color: c.textDim }}>
          {task.title}
        </Text>
        {/* Say what will actually happen before it happens: a mini-goal move
            touches several days at once, and the date the user picks is where
            the LAST task lands, not the first. */}
        <Text
          style={{
            fontFamily: FONT.regular,
            fontSize: 12,
            color: c.textFaint,
            marginTop: 4,
            marginBottom: 14,
          }}>
          {isMiniGoal
            ? task.taskCount
              ? `Finishes on the day you pick. ${task.taskCount} open task${
                  task.taskCount === 1 ? '' : 's'
                } move with it, keeping their spacing.`
              : 'Finishes on the day you pick. Its open tasks move with it, keeping their spacing.'
            : 'Moves this one task. Nothing else changes.'}
        </Text>

        {PRESETS.map((preset) => (
          <AnimatedPressable
            key={preset.label}
            scaleDown={0.98}
            disabled={busy}
            onPress={() => run('reschedule', dayAt9am(preset.offset))}
            accessibilityLabel={`Move to ${preset.label}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: RADIUS.md,
              backgroundColor: c.panel,
              borderWidth: 1,
              borderColor: c.panelBorder,
              marginBottom: 8,
            }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT.semibold, fontSize: 15, color: c.text }}>
                {preset.label}
              </Text>
              <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: c.textFaint, marginTop: 2 }}>
                {preset.hint}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={c.textFaint} />
          </AnimatedPressable>
        ))}

        <AnimatedPressable
          scaleDown={0.98}
          disabled={busy}
          onPress={() => setPickerOpen(true)}
          accessibilityLabel="Pick a date"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: RADIUS.md,
            backgroundColor: c.panel,
            borderWidth: 1,
            borderColor: c.panelBorder,
            marginBottom: 8,
          }}>
          <Ionicons name="calendar-outline" size={17} color={c.violet} />
          <Text style={{ flex: 1, fontFamily: FONT.semibold, fontSize: 15, color: c.text }}>
            Pick a date…
          </Text>
        </AnimatedPressable>

        {/* Task-only. `resolveOverdueTask` soft-deletes ONE task; removing a
            whole mini-goal is `deleteMiniGoal`, which is owner-only and
            permanent — not something to put one tap from "Next week".

            Destructive, so it sits apart from the three ways to keep the task. */}
        {!isMiniGoal && (
        <AnimatedPressable
          scaleDown={0.98}
          disabled={busy}
          onPress={() => run('drop')}
          accessibilityLabel={`Drop ${task.title}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: RADIUS.md,
            borderWidth: 1,
            borderColor: 'rgba(240,97,109,0.35)',
            marginTop: 8,
          }}>
          <Ionicons name="trash-outline" size={17} color={c.danger} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT.semibold, fontSize: 15, color: c.danger }}>
              Drop it
            </Text>
            <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: c.textFaint, marginTop: 2 }}>
              Removes it from the plan. Progress recalculates.
            </Text>
          </View>
        </AnimatedPressable>
        )}

        {pickerOpen && (
          <DateTimePicker
            value={dayAt9am(1)}
            mode="date"
            // Nothing can be moved into the past — that is what it is already.
            minimumDate={new Date()}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(event, date) => {
              // Android fires this for dismissal too, with type 'dismissed'.
              setPickerOpen(false);
              if (event.type === 'set' && date) {
                const target = new Date(date);
                target.setHours(9, 0, 0, 0);
                run('reschedule', target);
              }
            }}
          />
        )}
      </View>
    </Sheet>
  );
};

export default RescheduleSheet;
