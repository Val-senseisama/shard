import React from 'react';
import { View, Text, Image, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedPressable from './AnimatedPressable';
import { Ionicons } from '@expo/vector-icons';
import { hud, FONT, HudLabel, Mono, ShardBar } from './hud';

interface ShardCardProps {
  title: string;
  summary: string;
  image: string;
  completionRate: number;
  unreadCount?: number;
  participantsCount?: number;
  onPress?: () => void;
}

const ShardCard: React.FC<ShardCardProps> = ({
  title,
  summary,
  image,
  completionRate,
  unreadCount = 0,
  participantsCount = 0,
  onPress,
}) => {
  const isDark = useColorScheme() === 'dark';
  const c = hud(isDark);
  const hasUnread = unreadCount > 0;
  const isTeam = participantsCount > 0;
  const done = Math.round(completionRate);
  const complete = done >= 100;

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleDown={0.98}
      style={{
        backgroundColor: c.panel,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.panelBorder,
        marginBottom: 14,
        overflow: 'hidden',
      }}>
      {/* Cover image with obsidian scrim + HUD status tag */}
      <View>
        <Image source={{ uri: image }} style={{ width: '100%', height: 148 }} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', isDark ? 'rgba(11,11,16,0.85)' : 'rgba(20,20,30,0.55)']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 }}
        />

        {/* Status tag — bottom-left over the image */}
        <View
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: 'rgba(11,11,16,0.6)',
            borderWidth: 1,
            borderColor: complete ? c.cyan : c.panelBorderStrong,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
          }}>
          <Text style={{ color: complete ? c.cyan : c.violet, fontSize: 10 }}>◇</Text>
          <Text style={{ color: '#fff', fontSize: 11, fontFamily: FONT.semibold }}>
            {complete ? 'Complete' : 'Active'}
          </Text>
        </View>

        {/* Unread chat badge */}
        {hasUnread && (
          <View
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: c.danger,
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderRadius: 999,
            }}>
            <Ionicons name="chatbubble" size={10} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 10, fontFamily: FONT.mono }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={{ padding: 14 }}>
        <Text
          style={{ fontSize: 17, fontFamily: FONT.bold, color: c.text, letterSpacing: -0.3, marginBottom: 3 }}
          numberOfLines={1}>
          {title}
        </Text>
        <Text style={{ fontSize: 13, fontFamily: FONT.regular, color: c.textDim, lineHeight: 18, marginBottom: 14 }} numberOfLines={2}>
          {summary}
        </Text>

        <ShardBar progress={done / 100} isDark={isDark} height={6} style={{ marginBottom: 9 }} />

        {/* Footer: completion + party */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Mono color={complete ? c.cyan : c.violet} size={12}>{done}%</Mono>
            <HudLabel color={c.textFaint} size={11}>Complete</HudLabel>
          </View>

          {isTeam && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="people" size={12} color={c.textDim} />
              <Mono color={c.textDim} size={11}>{participantsCount + 1}</Mono>
            </View>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
};

export default ShardCard;
