import React from 'react';
import { View, Text, Image, useColorScheme } from 'react-native';
import AnimatedPressable from './AnimatedPressable';
import { ACCENT } from './shard/constants';

interface ShardCardProps {
  title: string;
  summary: string;
  image: string;
  completionRate: number;
  onPress?: () => void;
}

const ShardCard: React.FC<ShardCardProps> = ({ title, summary, image, completionRate, onPress }) => {
  const isDark = useColorScheme() === 'dark';

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
      <Image source={{ uri: image }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#fff' : '#1a1a1a', marginBottom: 4 }} numberOfLines={1}>
          {title}
        </Text>
        <Text style={{ fontSize: 13, color: isDark ? '#9ca3af' : '#6b7280', marginBottom: 12 }} numberOfLines={2}>
          {summary}
        </Text>
        <View style={{ height: 6, backgroundColor: isDark ? '#2a2a2a' : '#e5e7eb', borderRadius: 6, overflow: 'hidden', marginBottom: 6 }}>
          <View style={{ width: `${completionRate}%`, height: '100%', backgroundColor: ACCENT, borderRadius: 6 }} />
        </View>
        <Text style={{ fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', fontWeight: '600' }}>
          {completionRate}% Complete
        </Text>
      </View>
    </AnimatedPressable>
  );
};

export default ShardCard;
