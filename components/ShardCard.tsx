import React from 'react';
import { View, Text, Image, useColorScheme } from 'react-native';
import AnimatedPressable from './AnimatedPressable';
import { ACCENT } from './shard/constants';
import { Ionicons } from '@expo/vector-icons';

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
  const hasUnread = unreadCount > 0;
  const isTeam = participantsCount > 0;

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleDown={0.98}
      style={{
        backgroundColor: isDark ? '#242424' : '#ffffff',
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: isDark ? 0 : 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}>
      {/* Cover image + unread badge overlay */}
      <View>
        <Image source={{ uri: image }} style={{ width: '100%', height: 180 }} resizeMode="cover" />

        {/* Unread chat badge — top-right corner of the image */}
        {hasUnread && (
          <View
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#ef4444',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 20,
              shadowColor: '#000',
              shadowOpacity: 0.3,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            }}>
            <Ionicons name="chatbubble" size={11} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>

      {/* Card body */}
      <View style={{ padding: 16 }}>
        <Text
          style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#fff' : '#1a1a1a', marginBottom: 4 }}
          numberOfLines={1}>
          {title}
        </Text>
        <Text
          style={{ fontSize: 13, color: isDark ? '#9ca3af' : '#6b7280', marginBottom: 12 }}
          numberOfLines={2}>
          {summary}
        </Text>

        {/* Progress bar */}
        <View
          style={{
            height: 6,
            backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb',
            borderRadius: 6,
            overflow: 'hidden',
            marginBottom: 10,
          }}>
          <View
            style={{
              width: `${completionRate}%`,
              height: '100%',
              backgroundColor: ACCENT,
              borderRadius: 6,
            }}
          />
        </View>

        {/* Footer row: completion % + team pill */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', fontWeight: '600' }}>
            {completionRate}% Complete
          </Text>

          {isTeam && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
              }}>
              <Ionicons name="people" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#9ca3af' : '#6b7280' }}>
                {participantsCount + 1}
              </Text>
            </View>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
};

export default ShardCard;
