import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { hud, FONT, HudLabel, RADIUS, Num } from '~/components/hud';
import AnimatedPressable from '~/components/AnimatedPressable';
import { useMutation } from '@apollo/client';
import { PACE_CURRICULUM } from '~/Graphql/Mutations';
import type { CurriculumData } from './CurriculumReviewStep';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const SESSION_OPTIONS = [15, 30, 45, 60, 90];

export interface RhythmData {
  days: number[];
  sessionMinutes: number;
  timeOfDay?: string;
}

export default function CoursePaceStep({
  draftId,
  curriculum,
  rhythm,
  deadline,
  onChangeRhythm,
  onCreateQuest,
  loading,
  isDark,
}: {
  draftId: string;
  curriculum: CurriculumData;
  rhythm: RhythmData;
  deadline?: string;
  onChangeRhythm: (r: RhythmData) => void;
  onCreateQuest: () => void;
  loading: boolean;
  isDark: boolean;
}) {
  const c = hud(isDark);

  const [pacePreview, setPacePreview] = useState<{
    sessionCount: number;
    projectedEndDate: string;
    warning?: string;
    miniGoals: Array<{ title: string; dueDate: string; taskCount: number }>;
  } | null>(null);

  const [runPace, { loading: pacingLoading }] = useMutation(PACE_CURRICULUM, {
    onCompleted(data) {
      if (data?.paceCurriculum) {
        setPacePreview(data.paceCurriculum);
      }
    },
  });

  // Debounced pacing query whenever days/sessionMinutes change
  useEffect(() => {
    if (!draftId || rhythm.days.length === 0) return;

    const timer = setTimeout(() => {
      runPace({
        variables: {
          input: {
            draftId,
            rhythm: {
              days: rhythm.days,
              sessionMinutes: rhythm.sessionMinutes,
              timeOfDay: rhythm.timeOfDay,
            },
            deadline,
          },
        },
      }).catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, [draftId, rhythm.days, rhythm.sessionMinutes, rhythm.timeOfDay, deadline, runPace]);

  const toggleDay = (dayIndex: number) => {
    const exists = rhythm.days.includes(dayIndex);
    const nextDays = exists
      ? rhythm.days.filter((d) => d !== dayIndex)
      : [...rhythm.days, dayIndex].sort();
    onChangeRhythm({ ...rhythm, days: nextDays });
  };

  const setSessionMinutes = (sessionMinutes: number) => {
    onChangeRhythm({ ...rhythm, sessionMinutes });
  };

  const panel = {
    backgroundColor: c.panel,
    borderColor: c.panelBorder,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 16,
  };

  const canCommit = rhythm.days.length > 0 && !loading;

  const formattedEnd = pacePreview?.projectedEndDate
    ? new Date(pacePreview.projectedEndDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <View>
      <View style={{ marginBottom: 14 }}>
        <HudLabel color={c.textDim}>Set Your Pace</HudLabel>
        <Text style={{ color: c.textFaint, fontSize: 12, lineHeight: 17, marginTop: 3 }}>
          Pick the days you can actually study. Shard distributes lectures and practice into your schedule.
        </Text>
      </View>

      {/* Day Picker */}
      <View style={panel}>
        <HudLabel color={c.textDim} style={{ marginBottom: 10 }}>
          Study Days
        </HudLabel>
        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'space-between' }}>
          {DAY_LABELS.map((label, idx) => {
            const selected = rhythm.days.includes(idx);
            return (
              <AnimatedPressable
                key={`day-${idx}`}
                onPress={() => toggleDay(idx)}
                style={{
                  flex: 1,
                  aspectRatio: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: RADIUS.sm,
                  backgroundColor: selected ? c.violet : c.bgElev,
                  borderWidth: 1,
                  borderColor: selected ? c.violet : c.panelBorderStrong,
                }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: FONT.semibold,
                    color: selected ? '#FFF' : c.textDim,
                  }}>
                  {label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>

      {/* Session Length Picker */}
      <View style={panel}>
        <HudLabel color={c.textDim} style={{ marginBottom: 10 }}>
          Session Length
        </HudLabel>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {SESSION_OPTIONS.map((mins) => {
            const selected = rhythm.sessionMinutes === mins;
            return (
              <AnimatedPressable
                key={`session-${mins}`}
                onPress={() => setSessionMinutes(mins)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: RADIUS.pill,
                  backgroundColor: selected ? 'rgba(139,92,246,0.15)' : c.bgElev,
                  borderWidth: 1,
                  borderColor: selected ? c.violet : c.panelBorderStrong,
                }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: FONT.semibold,
                    color: selected ? c.violet : c.textDim,
                  }}>
                  <Num>{mins}</Num> min
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>

      {/* Pacing Preview & Warnings */}
      {pacePreview ? (
        <View
          style={{
            backgroundColor: c.panel,
            borderColor: c.panelBorder,
            borderWidth: 1,
            borderRadius: RADIUS.md,
            padding: 16,
            marginBottom: 16,
          }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <HudLabel color={c.textDim}>Projected Schedule</HudLabel>
            {pacingLoading ? <ActivityIndicator size="small" color={c.violet} /> : null}
          </View>

          <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
            <View>
              <Text style={{ fontSize: 11, color: c.textFaint }}>Sessions</Text>
              <Text style={{ fontSize: 16, fontFamily: FONT.bold, color: c.text }}>
                <Num>{pacePreview.sessionCount}</Num>
              </Text>
            </View>

            {formattedEnd ? (
              <View>
                <Text style={{ fontSize: 11, color: c.textFaint }}>Target Finish</Text>
                <Text style={{ fontSize: 16, fontFamily: FONT.bold, color: c.text }}>
                  {formattedEnd}
                </Text>
              </View>
            ) : null}
          </View>

          {pacePreview.warning ? (
            <View
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: RADIUS.sm,
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                borderColor: 'rgba(234, 179, 8, 0.3)',
                borderWidth: 1,
                flexDirection: 'row',
                gap: 8,
                alignItems: 'center',
              }}>
              <Ionicons name="warning-outline" size={16} color="#EAB308" />
              <Text style={{ flex: 1, fontSize: 12, color: '#EAB308', lineHeight: 16 }}>
                {pacePreview.warning}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Create Shard Button */}
      <AnimatedPressable
        onPress={onCreateQuest}
        disabled={!canCommit}
        style={{
          backgroundColor: canCommit ? c.violet : c.bgElev,
          opacity: canCommit ? 1 : 0.6,
          paddingVertical: 14,
          borderRadius: RADIUS.pill,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
        }}>
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 14, fontFamily: FONT.semibold }}>
              Starting quest...
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="sparkles" size={16} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 14, fontFamily: FONT.semibold }}>
              Start Course Quest
            </Text>
          </>
        )}
      </AnimatedPressable>
    </View>
  );
}
