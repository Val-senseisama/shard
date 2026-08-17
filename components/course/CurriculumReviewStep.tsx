import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { hud, FONT, HudLabel, RADIUS, Num } from '~/components/hud';
import AnimatedPressable from '~/components/AnimatedPressable';

export interface CurriculumItemData {
  kind: string;
  title: string;
  durationSeconds?: number;
  url?: string;
  externalId?: string;
  optional?: boolean;
  synthesized?: boolean;
}

export interface CurriculumSectionData {
  title: string;
  items: CurriculumItemData[];
}

export interface CurriculumData {
  provider: string;
  fidelity: string;
  title: string;
  author?: string;
  url?: string;
  thumbnail?: string;
  sections: CurriculumSectionData[];
  totalSeconds?: number;
  fetchedAt: string;
}

export default function CurriculumReviewStep({
  curriculum,
  onChange,
  onProceed,
  isDark,
}: {
  curriculum: CurriculumData;
  onChange: (updated: CurriculumData) => void;
  onProceed: () => void;
  isDark: boolean;
}) {
  const c = hud(isDark);
  const [editingTitle, setEditingTitle] = useState(false);
  const [courseTitle, setCourseTitle] = useState(curriculum.title);

  // Toggle item optional / excluded status
  const toggleItem = (sectionIndex: number, itemIndex: number) => {
    const nextSections = curriculum.sections.map((sec, si) => {
      if (si !== sectionIndex) return sec;
      const nextItems = sec.items.map((item, ii) => {
        if (ii !== itemIndex) return item;
        return { ...item, optional: !item.optional };
      });
      return { ...sec, items: nextItems };
    });

    onChange({
      ...curriculum,
      sections: nextSections,
    });
  };

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (courseTitle.trim() && courseTitle !== curriculum.title) {
      onChange({ ...curriculum, title: courseTitle.trim() });
    }
  };

  const allItems = curriculum.sections.flatMap((s) => s.items);
  const activeItems = allItems.filter((i) => !i.optional);
  const totalSeconds = activeItems.reduce((acc, i) => acc + (i.durationSeconds ?? 0), 0);
  const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;

  const fidelityLabel =
    curriculum.fidelity === 'exact'
      ? 'Exact from YouTube'
      : curriculum.fidelity === 'imported'
      ? 'Structured from text'
      : 'Inferred outline';

  const fidelityColor =
    curriculum.fidelity === 'exact'
      ? '#10B981'
      : curriculum.fidelity === 'imported'
      ? c.violet
      : '#F59E0B';

  return (
    <View>
      {/* Header Info */}
      <View
        style={{
          backgroundColor: c.panel,
          borderColor: c.panelBorder,
          borderWidth: 1,
          borderRadius: RADIUS.md,
          padding: 16,
          marginBottom: 16,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: c.bgElev,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: RADIUS.pill,
            }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fidelityColor }} />
            <Text style={{ fontSize: 11, fontFamily: FONT.semibold, color: fidelityColor }}>
              {fidelityLabel}
            </Text>
          </View>

          <Text style={{ fontSize: 12, color: c.textDim, fontFamily: FONT.regular }}>
            <Num>{activeItems.length}</Num> items {totalHours > 0 ? `· ~${totalHours}h` : ''}
          </Text>
        </View>

        {editingTitle ? (
          <TextInput
            value={courseTitle}
            onChangeText={setCourseTitle}
            onBlur={handleTitleBlur}
            autoFocus
            style={{
              fontSize: 16,
              fontFamily: FONT.bold,
              color: c.text,
              borderBottomWidth: 1,
              borderColor: c.violet,
              paddingVertical: 4,
            }}
          />
        ) : (
          <AnimatedPressable
            onPress={() => setEditingTitle(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Text style={{ fontSize: 16, fontFamily: FONT.bold, color: c.text, flex: 1 }}>
              {curriculum.title}
            </Text>
            <MaterialIcons name="edit" size={14} color={c.textDim} />
          </AnimatedPressable>
        )}

        {curriculum.author ? (
          <Text style={{ fontSize: 12, color: c.textFaint, marginTop: 4 }}>
            by {curriculum.author}
          </Text>
        ) : null}
      </View>

      {/* Sections and Items List */}
      <View style={{ marginBottom: 20 }}>
        {curriculum.sections.map((section, sIdx) => (
          <View
            key={`sec-${sIdx}`}
            style={{
              backgroundColor: c.panel,
              borderColor: c.panelBorder,
              borderWidth: 1,
              borderRadius: RADIUS.md,
              padding: 14,
              marginBottom: 12,
            }}>
            <Text
              style={{
                fontSize: 14,
                fontFamily: FONT.bold,
                color: c.text,
                marginBottom: 10,
              }}>
              {section.title || `Section ${sIdx + 1}`}
            </Text>

            <View style={{ gap: 8 }}>
              {section.items.map((item, iIdx) => {
                const isExcluded = !!item.optional;
                return (
                  <AnimatedPressable
                    key={`item-${sIdx}-${iIdx}`}
                    onPress={() => toggleItem(sIdx, iIdx)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingVertical: 6,
                      opacity: isExcluded ? 0.45 : 1,
                    }}>
                    <Ionicons
                      name={isExcluded ? 'square-outline' : 'checkbox'}
                      size={18}
                      color={isExcluded ? c.textDim : c.violet}
                    />

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {item.synthesized ? (
                          <Text style={{ color: c.violet, fontSize: 12 }}>✦</Text>
                        ) : null}
                        <Text
                          numberOfLines={2}
                          style={{
                            fontSize: 13,
                            fontFamily: item.synthesized ? FONT.semibold : FONT.regular,
                            color: item.synthesized ? c.violet : c.text,
                            textDecorationLine: isExcluded ? 'line-through' : 'none',
                          }}>
                          {item.title}
                        </Text>
                      </View>
                    </View>

                    {item.durationSeconds ? (
                      <Text style={{ fontSize: 11, color: c.textFaint, fontFamily: FONT.mono }}>
                        {Math.round(item.durationSeconds / 60)}m
                      </Text>
                    ) : null}
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      {/* Next step button */}
      <AnimatedPressable
        onPress={onProceed}
        disabled={activeItems.length === 0}
        style={{
          backgroundColor: activeItems.length > 0 ? c.violet : c.bgElev,
          opacity: activeItems.length > 0 ? 1 : 0.6,
          paddingVertical: 14,
          borderRadius: RADIUS.pill,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
        }}>
        <Text
          style={{
            color: activeItems.length > 0 ? '#FFF' : c.textDim,
            fontSize: 14,
            fontFamily: FONT.semibold,
          }}>
          Next: Set Your Pace
        </Text>
        <Ionicons name="arrow-forward" size={16} color={activeItems.length > 0 ? '#FFF' : c.textDim} />
      </AnimatedPressable>
    </View>
  );
}
