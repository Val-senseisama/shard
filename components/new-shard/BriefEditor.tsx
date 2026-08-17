import React, { useState } from 'react';
import { View, Text, TextInput, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@apollo/client';
import { hud, FONT, RADIUS, HudLabel } from '~/components/hud';
import AnimatedPressable from '~/components/AnimatedPressable';
import { UPDATE_SHARD_BRIEF } from '~/Graphql/Mutations';

/**
 * "Actually, what I meant was…"
 *
 * The brief is what the user said the quest was FOR, and every later AI touch
 * reads it — the coach, the reflection at the end, weekly task generation, and
 * the nudge copy that quotes their reason back at them. So being able to correct
 * it matters more than it looks: a wrong brief quietly skews all four, forever.
 *
 * Saving deliberately does NOT regenerate the plan. Rewriting work the user has
 * already started against, because they fixed a typo in "why", would be a far
 * bigger action than the one they asked for.
 */

export interface EditableBrief {
  done?: string | null;
  why?: string | null;
  blockers?: string | null;
  aids?: string | null;
}

const FIELDS: { key: keyof EditableBrief; label: string; placeholder: string }[] = [
  {
    key: 'done',
    label: 'What finishing looks like',
    placeholder: 'e.g. I can hold a 10-minute conversation without notes',
  },
  {
    key: 'why',
    label: 'Why it matters',
    placeholder: "What changes for you when this is done?",
  },
  {
    key: 'aids',
    label: "What you're following",
    placeholder: 'A YouTube playlist, a course, a coach…',
  },
  {
    key: 'blockers',
    label: 'What usually derails you',
    placeholder: 'The thing that stopped you last time',
  },
];

export default function BriefEditor({
  shardId,
  brief,
  visible,
  onClose,
  onSaved,
  isDark,
}: {
  shardId: string;
  brief?: EditableBrief | null;
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  isDark: boolean;
}) {
  const c = hud(isDark);
  const [draft, setDraft] = useState<EditableBrief>(() => brief ?? {});
  const [saving, setSaving] = useState(false);
  const [update] = useMutation(UPDATE_SHARD_BRIEF);

  const save = async () => {
    setSaving(true);
    try {
      await update({
        variables: {
          shardId,
          // Empty strings mean "cleared", which is different from "unchanged" —
          // send undefined so a blank field doesn't overwrite with "".
          brief: Object.fromEntries(
            FIELDS.map(({ key }) => [key, draft[key]?.trim() || undefined])
          ),
        },
      });
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View
          style={{
            maxHeight: '88%',
            backgroundColor: c.bg,
            borderTopLeftRadius: RADIUS.xl,
            borderTopRightRadius: RADIUS.xl,
            paddingTop: 18,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingBottom: 14,
            }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontFamily: FONT.extrabold, fontSize: 18 }}>
                About this quest
              </Text>
              <Text style={{ color: c.textFaint, fontSize: 12, marginTop: 2 }}>
                Changing this won&apos;t redo your plan — it shapes what the coach and
                your reminders say from here.
              </Text>
            </View>
            <AnimatedPressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={c.textDim} />
            </AnimatedPressable>
          </View>

          <ScrollView
            style={{ paddingHorizontal: 20 }}
            contentContainerStyle={{ paddingBottom: 20 }}>
            {FIELDS.map((f) => (
              <View key={f.key} style={{ marginBottom: 18 }}>
                <HudLabel color={c.textDim}>{f.label}</HudLabel>
                <TextInput
                  value={draft[f.key] ?? ''}
                  onChangeText={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={c.textFaint}
                  multiline={f.key !== 'aids'}
                  autoCapitalize={f.key === 'aids' ? 'none' : 'sentences'}
                  autoCorrect={f.key !== 'aids'}
                  style={{
                    color: c.text,
                    fontSize: 15,
                    marginTop: 8,
                    minHeight: f.key === 'aids' ? 40 : 56,
                    borderBottomWidth: 1.5,
                    borderBottomColor: draft[f.key] ? c.violet : c.panelBorderStrong,
                    paddingVertical: 8,
                  }}
                  textAlignVertical="top"
                />
              </View>
            ))}
          </ScrollView>

          <View
            style={{
              padding: 20,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: c.panelBorder,
            }}>
            <AnimatedPressable
              onPress={save}
              disabled={saving}
              accessibilityLabel="Save"
              className="flex-row items-center justify-center gap-2 py-4"
              style={{
                backgroundColor: c.violet,
                borderRadius: RADIUS.md,
                opacity: saving ? 0.7 : 1,
              }}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontFamily: FONT.bold, fontSize: 15 }}>Save</Text>
              )}
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
