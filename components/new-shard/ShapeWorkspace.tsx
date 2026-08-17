import React, { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { hud, FONT, RADIUS, Num, HudLabel } from '~/components/hud';
import AnimatedPressable from '~/components/AnimatedPressable';
import type { DraftPlan, DraftEdit, DraftMiniQuest } from '~/hooks/useQuestDraft';

/**
 * The plan, as something you work on rather than accept.
 *
 * Every control here writes to a DRAFT — nothing is a real quest until commit —
 * which is why editing can be immediate and undramatic: no confirmations, no
 * destructive writes, no orphaned quests if the user walks away.
 *
 * Deliberately no Reanimated `entering` on any container: rows expand and
 * collapse constantly here, and a layout-animated ancestor doesn't report its
 * new height, so everything below it stops moving.
 */
export default function ShapeWorkspace({
  plan,
  warning,
  onEdit,
  isDark,
  busy,
  onChangeDeadline,
  onChangeRhythm,
}: {
  plan: DraftPlan;
  warning?: string | null;
  onEdit: (edit: DraftEdit) => Promise<unknown>;
  isDark: boolean;
  busy?: boolean;
  /** Opens the deadline picker. Absent hides the fix. */
  onChangeDeadline?: () => void;
  /** Jumps back to the rhythm question. Absent hides the fix. */
  onChangeRhythm?: () => void;
}) {
  const c = hud(isDark);
  const [openPhase, setOpenPhase] = useState<string | null>(plan.miniQuests[0]?.id ?? null);

  const totalTasks = plan.miniQuests.reduce((n, p) => n + p.steps.length, 0);

  return (
    <View>
      {/* Quest header — the title is editable too; it's often the most generic part. */}
      <View
        style={{
          backgroundColor: c.panel,
          borderColor: c.panelBorder,
          borderWidth: 1,
          borderRadius: RADIUS.md,
          padding: 18,
          marginBottom: 14,
        }}>
        <HudLabel color={c.textDim}>Your plan</HudLabel>
        <EditableText
          value={plan.mainQuest.title}
          onSave={(v) => onEdit({ op: 'renameQuest', value: v })}
          isDark={isDark}
          textStyle={{
            color: c.text,
            fontFamily: FONT.extrabold,
            fontSize: 19,
            letterSpacing: -0.3,
            marginTop: 4,
          }}
        />
        <Text style={{ color: c.textFaint, fontSize: 12, marginTop: 8 }}>
          <Num>{plan.miniQuests.length}</Num> phases · <Num>{totalTasks}</Num> tasks
        </Text>
      </View>

      {/* The honest-arithmetic moment. Shown plainly, never softened. */}
      {!!warning && (
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            padding: 14,
            marginBottom: 14,
            borderRadius: RADIUS.md,
            borderWidth: 1,
            borderColor: 'rgba(245,158,11,0.35)',
            backgroundColor: 'rgba(245,158,11,0.08)',
          }}>
          <Ionicons name="alert-circle-outline" size={18} color="#f59e0b" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.textDim, fontSize: 13, lineHeight: 19 }}>{warning}</Text>

            {/* Telling someone their plan doesn't fit and leaving them there is
                the worst version of honesty. Both fixes change inputs the
                scheduler actually reads at commit. */}
            {(onChangeRhythm || onChangeDeadline) && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {!!onChangeRhythm && (
                  <WarningFix label="Add a day" icon="calendar-outline" onPress={onChangeRhythm} />
                )}
                {!!onChangeDeadline && (
                  <WarningFix label="Move the date" icon="time-outline" onPress={onChangeDeadline} />
                )}
              </View>
            )}
          </View>
        </View>
      )}

      {plan.miniQuests.map((phase, i) => (
        <PhaseCard
          key={phase.id}
          phase={phase}
          index={i}
          total={plan.miniQuests.length}
          open={openPhase === phase.id}
          onToggle={() => setOpenPhase(openPhase === phase.id ? null : phase.id)}
          onEdit={onEdit}
          isDark={isDark}
        />
      ))}

      {plan.miniQuests.length === 0 && (
        <Text style={{ color: c.textFaint, fontSize: 13, textAlign: 'center', paddingVertical: 24 }}>
          You&apos;ve removed every phase. Add one back, or start over.
        </Text>
      )}

      {busy && (
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <ActivityIndicator color={c.violet} />
        </View>
      )}
    </View>
  );
}

/** Amber in both themes on purpose — a warning has to read as one either way. */
function WarningFix({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: any;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.4)',
      }}>
      <Ionicons name={icon} size={13} color="#f59e0b" />
      <Text style={{ color: '#f59e0b', fontSize: 12, fontFamily: FONT.semibold }}>{label}</Text>
    </AnimatedPressable>
  );
}

function PhaseCard({
  phase,
  index,
  total,
  open,
  onToggle,
  onEdit,
  isDark,
}: {
  phase: DraftMiniQuest;
  index: number;
  total: number;
  open: boolean;
  onToggle: () => void;
  onEdit: (edit: DraftEdit) => Promise<unknown>;
  isDark: boolean;
}) {
  const c = hud(isDark);
  const [adding, setAdding] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [picking, setPicking] = useState(false);
  const due = phase.dueDate ? new Date(Number(phase.dueDate) || phase.dueDate) : null;

  const move = (dir: -1 | 1) =>
    onEdit({ op: 'reorderPhase', phaseId: phase.id, toIndex: index + dir });

  return (
    <View
      style={{
        backgroundColor: c.panel,
        borderColor: c.panelBorder,
        borderWidth: 1,
        borderRadius: RADIUS.md,
        padding: 16,
        marginBottom: 10,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AnimatedPressable
          onPress={onToggle}
          scaleDown={0.99}
          containerStyle={{ flex: 1 }}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${phase.title}, ${phase.steps.length} tasks`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={16} color={c.textDim} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontFamily: FONT.semibold, fontSize: 15 }}>
              {phase.title}
            </Text>
            <Text style={{ color: c.textFaint, fontSize: 12, marginTop: 2 }}>
              <Num>{phase.steps.length}</Num> tasks
              {due
                ? ` · by ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : phase.estimatedDuration
                  ? ` · ${phase.estimatedDuration}` 
                  : ''}
            </Text>
          </View>
        </AnimatedPressable>

        {/* Reorder by button, not drag: a drag handle inside a scroll view fights
            the scroll, and up/down is unambiguous with a screen reader. */}
        <AnimatedPressable
          onPress={() => move(-1)}
          disabled={index === 0}
          hitSlop={8}
          accessibilityLabel={`Move ${phase.title} up`}
          style={{ padding: 4, opacity: index === 0 ? 0.25 : 1 }}>
          <Ionicons name="arrow-up" size={16} color={c.textDim} />
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => move(1)}
          disabled={index === total - 1}
          hitSlop={8}
          accessibilityLabel={`Move ${phase.title} down`}
          style={{ padding: 4, opacity: index === total - 1 ? 0.25 : 1 }}>
          <Ionicons name="arrow-down" size={16} color={c.textDim} />
        </AnimatedPressable>
      </View>

      {open && (
        <View style={{ marginTop: 14 }}>
          <EditableText
            value={phase.title}
            onSave={(v) => onEdit({ op: 'renamePhase', phaseId: phase.id, value: v })}
            isDark={isDark}
            label="Phase name"
            textStyle={{ color: c.text, fontSize: 14, fontFamily: FONT.semibold }}
          />

          {/* Without this you can restructure a plan but not say when any of it
              is due — and a date the user picks beats one the scheduler infers. */}
          <AnimatedPressable
            onPress={() => setPicking(true)}
            accessibilityLabel={
              due ? `Change due date for ${phase.title}` : `Set a due date for ${phase.title}`
            }
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <Ionicons name="calendar-outline" size={14} color={due ? c.violet : c.textFaint} />
            <Text style={{ color: due ? c.violet : c.textFaint, fontSize: 12 }}>
              {due
                ? `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'Set a due date'}
            </Text>
          </AnimatedPressable>

          {picking && (
            <DateTimePicker
              value={due ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={new Date()}
              onChange={(_, d) => {
                setPicking(Platform.OS === 'ios');
                if (d) onEdit({ op: 'redatePhase', phaseId: phase.id, dueDate: String(d.getTime()) });
              }}
            />
          )}

          {!!phase.searchHint && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginTop: 12,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: RADIUS.pill,
                backgroundColor: 'rgba(72,224,238,0.08)',
              }}>
              <Ionicons name="search" size={13} color={c.cyan ?? '#48E0EE'} />
              <Text style={{ flex: 1, color: c.textDim, fontSize: 12 }}>
                Search: {phase.searchHint}
              </Text>
            </View>
          )}

          <View style={{ marginTop: 12, gap: 8 }}>
            {phase.steps.map((step) => (
              <View
                key={step.id}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <EditableText
                    value={step.text}
                    onSave={(v) =>
                      onEdit({ op: 'editTask', phaseId: phase.id, taskId: step.id, value: v })
                    }
                    isDark={isDark}
                    textStyle={{ color: c.textDim, fontSize: 13, lineHeight: 19 }}
                  />
                </View>
                <AnimatedPressable
                  onPress={() => onEdit({ op: 'removeTask', phaseId: phase.id, taskId: step.id })}
                  hitSlop={8}
                  accessibilityLabel={`Remove task: ${step.text}`}
                  style={{ padding: 2 }}>
                  <Ionicons name="close" size={15} color={c.textFaint} />
                </AnimatedPressable>
              </View>
            ))}
          </View>

          {adding ? (
            <TextInput
              value={newTask}
              onChangeText={setNewTask}
              placeholder="What's the task?"
              placeholderTextColor={c.textFaint}
              autoFocus
              onBlur={() => {
                if (newTask.trim()) onEdit({ op: 'addTask', phaseId: phase.id, value: newTask });
                setNewTask('');
                setAdding(false);
              }}
              onSubmitEditing={() => {
                if (newTask.trim()) onEdit({ op: 'addTask', phaseId: phase.id, value: newTask });
                setNewTask('');
                setAdding(false);
              }}
              style={{
                color: c.text,
                fontSize: 13,
                marginTop: 12,
                paddingVertical: 8,
                borderBottomWidth: 1.5,
                borderBottomColor: c.violet,
              }}
            />
          ) : (
            <AnimatedPressable
              onPress={() => setAdding(true)}
              accessibilityLabel={`Add a task to ${phase.title}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
              <Ionicons name="add" size={15} color={c.violet} />
              <Text style={{ color: c.violet, fontSize: 13, fontFamily: FONT.semibold }}>
                Add a task
              </Text>
            </AnimatedPressable>
          )}

          <AnimatedPressable
            onPress={() => onEdit({ op: 'removePhase', phaseId: phase.id })}
            accessibilityLabel={`Remove phase: ${phase.title}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 16,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: c.panelBorder,
            }}>
            <Ionicons name="trash-outline" size={14} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: 12, fontFamily: FONT.semibold }}>
              Remove this phase
            </Text>
          </AnimatedPressable>
        </View>
      )}
    </View>
  );
}

/**
 * Tap to edit, blur to save.
 *
 * No explicit save button: this is a draft, so a mistaken edit costs nothing and
 * a confirmation step on every rename would make shaping a plan feel like filing
 * paperwork.
 */
function EditableText({
  value,
  onSave,
  isDark,
  textStyle,
  label,
}: {
  value: string;
  onSave: (value: string) => void;
  isDark: boolean;
  textStyle?: any;
  label?: string;
}) {
  const c = hud(isDark);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  const commit = () => {
    const trimmed = text.trim();
    // An empty title would be rejected server-side anyway; snapping back is
    // gentler than an error toast for what is usually a mis-tap.
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setText(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <TextInput
        value={text}
        onChangeText={setText}
        autoFocus
        multiline
        onBlur={commit}
        style={[
          textStyle,
          { borderBottomWidth: 1.5, borderBottomColor: c.violet, paddingVertical: 4 },
        ]}
      />
    );
  }

  return (
    <AnimatedPressable
      onPress={() => {
        setText(value);
        setEditing(true);
      }}
      scaleDown={0.995}
      accessibilityLabel={`${label ?? 'Edit'}: ${value}`}
      accessibilityHint="Tap to edit"
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
      <Text style={[textStyle, { flex: 1 }]}>{value}</Text>
      <Ionicons name="pencil" size={12} color={c.textFaint} style={{ marginTop: 4 }} />
    </AnimatedPressable>
  );
}
