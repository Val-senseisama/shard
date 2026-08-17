import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { hud, FONT, HudLabel, RADIUS, Num } from '~/components/hud';
import AnimatedPressable from '~/components/AnimatedPressable';
import type { IntakeQuestion, BriefAnswers } from '~/hooks/useQuestDraft';

/**
 * The questions Shard asks before it builds a plan.
 *
 * Every question is on ONE screen and answerable in any order. A four-step
 * sub-wizard inside a wizard is the worst version of this — it makes a short
 * conversation feel like paperwork, and people abandon it.
 *
 * Nothing here is required. "Skip all" is permanently visible, because the
 * alternative to an answered question is the flow we already had, not a dead
 * end.
 */

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const SESSION_OPTIONS = [15, 30, 45, 60, 90];

export default function SharpenStep({
  questions,
  answers,
  onChange,
  onSkipAll,
  isDark,
}: {
  questions: IntakeQuestion[];
  answers: BriefAnswers;
  onChange: (next: BriefAnswers) => void;
  onSkipAll: () => void;
  isDark: boolean;
}) {
  const c = hud(isDark);
  const set = (patch: Partial<BriefAnswers>) => onChange({ ...answers, ...patch });

  const panel = {
    backgroundColor: c.panel,
    borderColor: c.panelBorder,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 18,
    marginBottom: 14,
  };

  const answeredCount = questions.filter((q) => !!answerFor(q.slot, answers)?.trim?.()).length;

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <HudLabel color={c.textDim}>A few quick questions</HudLabel>
          <Text style={{ color: c.textFaint, fontSize: 12, lineHeight: 17, marginTop: 3 }}>
            Answer what&apos;s useful — each one makes the plan fit your life better.
          </Text>
        </View>
        <AnimatedPressable
          onPress={onSkipAll}
          accessibilityLabel="Skip all questions and build the plan"
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: RADIUS.pill,
            borderWidth: 1,
            borderColor: c.panelBorderStrong,
          }}>
          <Text style={{ color: c.textDim, fontSize: 12, fontFamily: FONT.semibold }}>Skip all</Text>
        </AnimatedPressable>
      </View>

      {questions.map((q) => (
        <View key={q.slot} style={panel}>
          <Text
            style={{
              color: c.text,
              fontFamily: FONT.semibold,
              fontSize: 15,
              lineHeight: 21,
              marginBottom: 12,
            }}>
            {q.prompt}
          </Text>

          {q.inputKind === 'rhythm' ? (
            <RhythmInput answers={answers} set={set} isDark={isDark} />
          ) : (
            <TextInput
              value={answerFor(q.slot, answers) ?? ''}
              onChangeText={(v) => set(patchFor(q.slot, v))}
              placeholder={q.placeholder}
              placeholderTextColor={c.textFaint}
              multiline={q.inputKind !== 'resources'}
              // A pasted URL must not be auto-capitalised or autocorrected into
              // something that no longer resolves.
              autoCapitalize={q.inputKind === 'resources' ? 'none' : 'sentences'}
              autoCorrect={q.inputKind !== 'resources'}
              style={{
                color: c.text,
                fontSize: 15,
                minHeight: q.inputKind === 'resources' ? 44 : 64,
                borderBottomWidth: 1.5,
                borderBottomColor: answerFor(q.slot, answers) ? c.violet : c.panelBorderStrong,
                paddingVertical: 8,
              }}
              textAlignVertical="top"
            />
          )}

          {/* Tapping beats typing on a phone, and a concrete example teaches
              what a useful answer looks like. Appends rather than replaces, so
              two can be combined. */}
          {q.inputKind !== 'rhythm' && !!q.suggestions?.length && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {q.suggestions.map((sugg) => (
                <AnimatedPressable
                  key={sugg}
                  onPress={() => {
                    const current = answerFor(q.slot, answers)?.trim();
                    set(patchFor(q.slot, current ? `${current}. ${sugg}` : sugg));
                  }}
                  accessibilityLabel={`Use answer: ${sugg}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 11,
                    paddingVertical: 7,
                    borderRadius: RADIUS.pill,
                    borderWidth: 1,
                    borderColor: c.panelBorderStrong,
                  }}>
                  <Ionicons name="add" size={12} color={c.textDim} />
                  <Text style={{ color: c.textDim, fontSize: 12 }}>{sugg}</Text>
                </AnimatedPressable>
              ))}
            </View>
          )}

          {q.inputKind === 'resources' && <SuggestionsToggle answers={answers} set={set} isDark={isDark} />}
        </View>
      ))}

      {questions.length > 0 && (
        <Text style={{ color: c.textFaint, fontSize: 12, textAlign: 'center', marginTop: 2 }}>
          <Num>{answeredCount}</Num> of <Num>{questions.length}</Num> answered
        </Text>
      )}
    </View>
  );
}

/** Reads the answer for a slot out of the brief. */
function answerFor(slot: string, a: BriefAnswers): string | undefined {
  if (slot === 'done') return a.done;
  if (slot === 'why') return a.why;
  if (slot === 'blockers') return a.blockers;
  if (slot === 'aids') return a.aids;
  if (slot === 'rhythm') return a.rhythm?.raw;
  return undefined;
}

function patchFor(slot: string, value: string): Partial<BriefAnswers> {
  if (slot === 'done') return { done: value };
  if (slot === 'why') return { why: value };
  if (slot === 'blockers') return { blockers: value };
  if (slot === 'aids') return { aids: value };
  return {};
}

/** Day chips plus a session length — tapping beats typing for this one. */
function RhythmInput({
  answers,
  set,
  isDark,
}: {
  answers: BriefAnswers;
  set: (patch: Partial<BriefAnswers>) => void;
  isDark: boolean;
}) {
  const c = hud(isDark);
  const days = answers.rhythm?.days ?? [];
  const minutes = answers.rhythm?.sessionMinutes ?? 45;

  const toggleDay = (d: number) => {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort();
    set({ rhythm: { days: next, sessionMinutes: minutes, raw: describe(next, minutes) } });
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
        {DAY_LABELS.map((label, d) => {
          const on = days.includes(d);
          return (
            <AnimatedPressable
              key={d}
              onPress={() => toggleDay(d)}
              containerStyle={{ flex: 1 }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={FULL_DAYS[d]}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 11,
                borderRadius: RADIUS.pill,
                backgroundColor: on ? c.violet : 'transparent',
                borderWidth: 1,
                borderColor: on ? c.violet : c.panelBorderStrong,
              }}>
              <Text
                style={{ fontSize: 13, fontFamily: FONT.semibold, color: on ? '#fff' : c.textDim }}>
                {label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>

      <Text style={{ color: c.textFaint, fontSize: 12, marginBottom: 8 }}>
        How long per session?
      </Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {SESSION_OPTIONS.map((m) => {
          const on = minutes === m;
          return (
            <AnimatedPressable
              key={m}
              onPress={() =>
                set({ rhythm: { days, sessionMinutes: m, raw: describe(days, m) } })
              }
              containerStyle={{ flex: 1 }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${m} minutes`}
              style={{
                alignItems: 'center',
                paddingVertical: 9,
                borderRadius: RADIUS.pill,
                backgroundColor: on ? 'rgba(139,92,246,0.14)' : 'transparent',
                borderWidth: 1,
                borderColor: on ? c.violet : c.panelBorderStrong,
              }}>
              {/* Numerals in mono, the unit in Inter — the mono rule. */}
              <Text style={{ fontSize: 12, color: on ? c.violet : c.textDim }}>
                <Num>{m}</Num>m
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Human-readable echo of the chips, kept so the prompt sees words not indexes. */
function describe(days: number[], minutes: number) {
  if (days.length === 0) return `${minutes} minutes per session`;
  return `${days.map((d) => SHORT_DAYS[d]).join(', ')} — about ${minutes} minutes each`;
}

/**
 * Opt in to learning-material suggestions.
 *
 * Default off, and that isn't timidity: resolving a suggestion to a real link
 * costs real API quota, so opt-in is what keeps the feature affordable. People
 * who want material ask for it; everyone else costs nothing.
 */
function SuggestionsToggle({
  answers,
  set,
  isDark,
}: {
  answers: BriefAnswers;
  set: (patch: Partial<BriefAnswers>) => void;
  isDark: boolean;
}) {
  const c = hud(isDark);
  const on = !!answers.wantsSuggestions;

  return (
    <AnimatedPressable
      onPress={() => set({ wantsSuggestions: !on })}
      scaleDown={0.99}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel="Suggest material for me"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: c.panelBorder,
      }}>
      <Ionicons
        name={on ? 'checkbox' : 'square-outline'}
        size={20}
        color={on ? c.violet : c.textFaint}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontSize: 14, fontFamily: FONT.semibold }}>
          Suggest material for me
        </Text>
        <Text style={{ color: c.textFaint, fontSize: 12, marginTop: 1 }}>
          Adds what to search for on steps where it helps.
        </Text>
      </View>
    </AnimatedPressable>
  );
}
