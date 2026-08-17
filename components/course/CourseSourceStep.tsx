import React, { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { hud, FONT, HudLabel, RADIUS } from '~/components/hud';
import AnimatedPressable from '~/components/AnimatedPressable';

export interface CourseSourceData {
  url?: string;
  pastedText?: string;
}

export default function CourseSourceStep({
  goal,
  onImport,
  loading,
  notice,
  isDark,
}: {
  goal: string;
  onImport: (data: CourseSourceData) => void;
  loading: boolean;
  notice?: string;
  isDark: boolean;
}) {
  const c = hud(isDark);
  const [tab, setTab] = useState<'link' | 'paste'>('link');
  const [url, setUrl] = useState('');
  const [pastedText, setPastedText] = useState('');

  const handlePasteClipboard = async (target: 'url' | 'text') => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        if (target === 'url') setUrl(text.trim());
        else setPastedText(text.trim());
      }
    } catch {
      // clipboard access declined or unavailable
    }
  };

  const canSubmit = tab === 'link' ? !!url.trim() : !!pastedText.trim();

  const handleSubmit = () => {
    if (!canSubmit || loading) return;
    if (tab === 'link') {
      onImport({ url: url.trim() });
    } else {
      onImport({ pastedText: pastedText.trim() });
    }
  };

  const panel = {
    backgroundColor: c.panel,
    borderColor: c.panelBorder,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 18,
    marginBottom: 16,
  };

  return (
    <View>
      <View style={{ marginBottom: 14 }}>
        <HudLabel color={c.textDim}>Course Source</HudLabel>
        <Text style={{ color: c.textFaint, fontSize: 12, lineHeight: 17, marginTop: 3 }}>
          Import any YouTube playlist, online course syllabus, or table of contents.
        </Text>
      </View>

      {/* Tab Switcher */}
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          backgroundColor: c.bgElev,
          borderRadius: RADIUS.pill,
          borderWidth: 1,
          borderColor: c.panelBorder,
          padding: 4,
          marginBottom: 16,
        }}>
        <AnimatedPressable
          onPress={() => setTab('link')}
          containerStyle={{ flex: 1 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 10,
            borderRadius: RADIUS.pill,
            backgroundColor: tab === 'link' ? 'rgba(139,92,246,0.14)' : 'transparent',
            borderWidth: 1,
            borderColor: tab === 'link' ? c.violet : 'transparent',
          }}>
          <Ionicons
            name="link"
            size={15}
            color={tab === 'link' ? c.violet : c.textDim}
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              fontSize: 13,
              fontFamily: FONT.semibold,
              color: tab === 'link' ? c.violet : c.textDim,
            }}>
            Link / URL
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => setTab('paste')}
          containerStyle={{ flex: 1 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 10,
            borderRadius: RADIUS.pill,
            backgroundColor: tab === 'paste' ? 'rgba(139,92,246,0.14)' : 'transparent',
            borderWidth: 1,
            borderColor: tab === 'paste' ? c.violet : 'transparent',
          }}>
          <Ionicons
            name="document-text-outline"
            size={15}
            color={tab === 'paste' ? c.violet : c.textDim}
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              fontSize: 13,
              fontFamily: FONT.semibold,
              color: tab === 'paste' ? c.violet : c.textDim,
            }}>
            Paste Text
          </Text>
        </AnimatedPressable>
      </View>

      {/* Input panel */}
      {tab === 'link' ? (
        <View style={panel}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <HudLabel color={c.textDim}>Paste Course Link</HudLabel>
            <AnimatedPressable
              onPress={() => handlePasteClipboard('url')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: RADIUS.sm,
                backgroundColor: c.bgElev,
              }}>
              <Ionicons name="clipboard-outline" size={12} color={c.violet} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, fontFamily: FONT.semibold, color: c.violet }}>Paste</Text>
            </AnimatedPressable>
          </View>

          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://www.youtube.com/playlist?list=..."
            placeholderTextColor={c.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={{
              backgroundColor: c.bgElev,
              color: c.text,
              borderColor: c.panelBorderStrong,
              borderWidth: 1,
              borderRadius: RADIUS.sm,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 13,
              fontFamily: FONT.regular,
            }}
          />

          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="logo-youtube" size={14} color="#EF4444" />
            <Text style={{ fontSize: 11, color: c.textFaint }}>
              YouTube playlists are imported with live video durations & lectures.
            </Text>
          </View>
        </View>
      ) : (
        <View style={panel}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <HudLabel color={c.textDim}>Paste Curriculum / Syllabus</HudLabel>
            <AnimatedPressable
              onPress={() => handlePasteClipboard('text')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: RADIUS.sm,
                backgroundColor: c.bgElev,
              }}>
              <Ionicons name="clipboard-outline" size={12} color={c.violet} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, fontFamily: FONT.semibold, color: c.violet }}>Paste</Text>
            </AnimatedPressable>
          </View>

          <TextInput
            value={pastedText}
            onChangeText={setPastedText}
            placeholder="1. Introduction to Web Design&#10;2. Typography & Color&#10;3. Layout & Grid..."
            placeholderTextColor={c.textFaint}
            multiline
            numberOfLines={6}
            style={{
              backgroundColor: c.bgElev,
              color: c.text,
              borderColor: c.panelBorderStrong,
              borderWidth: 1,
              borderRadius: RADIUS.sm,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 13,
              fontFamily: FONT.regular,
              minHeight: 120,
              textAlignVertical: 'top',
            }}
          />

          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 8 }}>
            Copy the table of contents from Udemy, Coursera, or a textbook and paste it here.
          </Text>
        </View>
      )}

      {notice ? (
        <View
          style={{
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
            borderColor: 'rgba(234, 179, 8, 0.3)',
            borderWidth: 1,
            borderRadius: RADIUS.sm,
            padding: 12,
            marginBottom: 16,
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
          }}>
          <Ionicons name="information-circle-outline" size={16} color="#EAB308" />
          <Text style={{ flex: 1, fontSize: 12, color: '#EAB308', lineHeight: 16 }}>
            {notice}
          </Text>
        </View>
      ) : null}

      {/* Import button */}
      <AnimatedPressable
        onPress={handleSubmit}
        disabled={!canSubmit || loading}
        style={{
          backgroundColor: canSubmit ? c.violet : c.bgElev,
          opacity: canSubmit && !loading ? 1 : 0.6,
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
              Structuring curriculum...
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="arrow-forward" size={16} color={canSubmit ? '#FFF' : c.textDim} />
            <Text
              style={{
                color: canSubmit ? '#FFF' : c.textDim,
                fontSize: 14,
                fontFamily: FONT.semibold,
              }}>
              Import & Review Plan
            </Text>
          </>
        )}
      </AnimatedPressable>
    </View>
  );
}
