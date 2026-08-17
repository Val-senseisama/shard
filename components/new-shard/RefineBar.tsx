import React, { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { hud, FONT, RADIUS, Num } from '~/components/hud';
import AnimatedPressable from '~/components/AnimatedPressable';
import type { PlanChange } from '~/hooks/useQuestDraft';

/**
 * Saying what's wrong with the plan.
 *
 * The tap-to-edit surface above handles anything you can point at. This handles
 * what you can't: "too much, I already run 10k" is not a gesture, and it's the
 * kind of correction that turns a generic plan into one that fits.
 *
 * Free within the credit already spent, capped rather than billed — charging per
 * refinement would teach people not to ask for the change that makes the plan
 * work.
 */
export default function RefineBar({
  refinements,
  remaining,
  changes,
  canUndo,
  busy,
  onRefine,
  onUndo,
  onDismissChanges,
  isDark,
}: {
  refinements: string[];
  remaining: number;
  changes: PlanChange[];
  canUndo: boolean;
  busy?: boolean;
  onRefine: (instruction: string) => void;
  onUndo: () => void;
  onDismissChanges: () => void;
  isDark: boolean;
}) {
  const c = hud(isDark);
  const [text, setText] = useState('');
  const exhausted = remaining <= 0;

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || busy || exhausted) return;
    setText('');
    onRefine(trimmed);
  };

  return (
    <View style={{ marginTop: 6 }}>
      {/* What the last refinement actually did. Without this a refinement is a
          slot machine — the screen changes and you're left diffing by eye. */}
      {changes.length > 0 && (
        <View
          style={{
            padding: 14,
            marginBottom: 12,
            borderRadius: RADIUS.md,
            borderWidth: 1,
            borderColor: c.panelBorder,
            backgroundColor: c.bgElev,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ flex: 1, color: c.textDim, fontSize: 12, fontFamily: FONT.semibold }}>
              What changed
            </Text>
            {canUndo && (
              <AnimatedPressable
                onPress={onUndo}
                accessibilityLabel="Undo the last change"
                style={{ paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: c.violet, fontSize: 12, fontFamily: FONT.semibold }}>
                  Undo
                </Text>
              </AnimatedPressable>
            )}
            <AnimatedPressable
              onPress={onDismissChanges}
              hitSlop={8}
              accessibilityLabel="Dismiss the change summary"
              style={{ paddingLeft: 6 }}>
              <Ionicons name="close" size={14} color={c.textFaint} />
            </AnimatedPressable>
          </View>

          {changes.map((ch) => (
            <View
              key={`${ch.kind}-${ch.phaseId}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}>
              <Ionicons
                name={CHANGE_ICON[ch.kind]}
                size={13}
                color={ch.kind === 'removed' ? '#ef4444' : ch.kind === 'added' ? '#22c55e' : c.textDim}
              />
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  color: c.textDim,
                  fontSize: 12,
                  textDecorationLine: ch.kind === 'removed' ? 'line-through' : 'none',
                }}>
                {ch.title}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Asked-for changes, kept visible so the user can see what they've said. */}
      {refinements.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {refinements.map((r, i) => (
            <View
              key={`${i}-${r}`}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: RADIUS.pill,
                backgroundColor: 'rgba(139,92,246,0.10)',
              }}>
              <Text numberOfLines={1} style={{ color: c.violet, fontSize: 11, maxWidth: 220 }}>
                {r}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 4,
          borderRadius: RADIUS.md,
          borderWidth: 1,
          borderColor: c.panelBorderStrong,
          opacity: exhausted ? 0.6 : 1,
        }}>
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={c.textFaint} />
        <TextInput
          value={text}
          onChangeText={setText}
          editable={!exhausted && !busy}
          onSubmitEditing={submit}
          returnKeyType="send"
          placeholder={
            exhausted ? 'Start the quest to keep tuning it' : 'What should be different?'
          }
          placeholderTextColor={c.textFaint}
          style={{ flex: 1, color: c.text, fontSize: 14, paddingVertical: 12 }}
        />
        {busy ? (
          <ActivityIndicator color={c.violet} size="small" />
        ) : (
          <>
            <Text style={{ color: c.textFaint, fontSize: 11 }}>
              <Num>{remaining}</Num> left
            </Text>
            <AnimatedPressable
              onPress={submit}
              disabled={!text.trim() || exhausted}
              hitSlop={8}
              accessibilityLabel="Apply this change"
              style={{ opacity: text.trim() && !exhausted ? 1 : 0.3 }}>
              <Ionicons name="arrow-up-circle" size={24} color={c.violet} />
            </AnimatedPressable>
          </>
        )}
      </View>
    </View>
  );
}

const CHANGE_ICON: Record<PlanChange['kind'], any> = {
  added: 'add-circle-outline',
  removed: 'remove-circle-outline',
  changed: 'pencil',
  reordered: 'swap-vertical',
};
