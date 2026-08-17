import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { hud, FONT, RADIUS, Num } from '~/components/hud';
import AnimatedPressable from '~/components/AnimatedPressable';
import type { StreamedPhase } from '~/hooks/useQuestDraft';

/**
 * The plan arriving, rather than a spinner pretending to know how it's going.
 *
 * The view this replaces cycled five invented status messages for up to thirty
 * seconds. Phases stream in over the socket as the model writes them, so the
 * wait shows real progress — and a plan that's visibly wrong can be abandoned at
 * phase two instead of after the whole wait.
 *
 * Degrades honestly: if no phases arrive (socket down, provider without
 * streaming) this is the old spinner, and the mutation still returns a plan.
 */
export default function GeneratingView({
  phases,
  onCancel,
  isDark,
}: {
  phases: StreamedPhase[];
  onCancel: () => void;
  isDark: boolean;
}) {
  const c = hud(isDark);
  const streaming = phases.length > 0;

  return (
    <View style={{ paddingVertical: streaming ? 8 : 48 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <ActivityIndicator color={c.violet} />
        <Text style={{ color: c.text, fontFamily: FONT.semibold, fontSize: 15 }}>
          {streaming ? 'Building your plan…' : 'Working out your plan…'}
        </Text>
      </View>

      {phases.map((p) => (
        <View
          key={p.index}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 16,
            marginBottom: 10,
            borderRadius: RADIUS.md,
            borderWidth: 1,
            borderColor: c.panelBorder,
            backgroundColor: c.panel,
          }}>
          <Ionicons name="checkmark-circle" size={18} color={c.violet} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontFamily: FONT.semibold, fontSize: 14 }}>
              {p.title}
            </Text>
            <Text style={{ color: c.textFaint, fontSize: 12, marginTop: 2 }}>
              <Num>{p.stepCount}</Num> tasks
              {p.estimatedDuration ? ` · ${p.estimatedDuration}` : ''}
            </Text>
          </View>
        </View>
      ))}

      {/* One skeleton for whatever is being written now — it's what makes the
          list read as in-progress rather than finished. */}
      {streaming && (
        <View
          style={{
            padding: 16,
            marginBottom: 10,
            borderRadius: RADIUS.md,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: c.panelBorderStrong,
          }}>
          <View
            style={{
              height: 10,
              width: '55%',
              borderRadius: RADIUS.pill,
              backgroundColor: c.panelBorderStrong,
            }}
          />
          <View
            style={{
              height: 8,
              width: '30%',
              marginTop: 8,
              borderRadius: RADIUS.pill,
              backgroundColor: c.panelBorder,
            }}
          />
        </View>
      )}

      <AnimatedPressable
        onPress={onCancel}
        accessibilityLabel="Cancel and go back"
        style={{ alignSelf: 'center', marginTop: 14, paddingHorizontal: 20, paddingVertical: 10 }}>
        <Text style={{ color: c.textDim, fontSize: 13, fontFamily: FONT.semibold }}>Cancel</Text>
      </AnimatedPressable>
    </View>
  );
}
