import React from 'react';
import { View, useColorScheme } from 'react-native';
import { Skeleton } from './Skeleton';
import { ACCENT, t, useSkeletonOpacity } from './constants';

export const PageSkeleton = ({ screenWidth }: { screenWidth: number }) => {
  const isDark = useColorScheme() === 'dark';
  const theme = t(isDark);
  const animStyle = useSkeletonOpacity();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Hero */}
      <Skeleton width={screenWidth} height={280} style={{ borderRadius: 0 }} animStyle={animStyle} />

      {/* Participant avatars */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 16 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ alignItems: 'center', gap: 6 }}>
            <Skeleton width={58} height={58} style={{ borderRadius: 29 }} animStyle={animStyle} />
            <Skeleton width={50} height={10} animStyle={animStyle} />
          </View>
        ))}
      </View>

      {/* Tab bar */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: 20,
          borderRadius: 14,
          backgroundColor: theme.tabBarBg,
          padding: 6,
          marginBottom: 16,
          gap: 6,
        }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: i === 1 ? ACCENT : 'transparent',
            }}>
            <Skeleton
              width={60}
              height={13}
              style={{ backgroundColor: i === 1 ? 'rgba(255,255,255,0.3)' : undefined }}
              animStyle={animStyle}
            />
          </View>
        ))}
      </View>

      {/* Content */}
      <View style={{ gap: 16, paddingHorizontal: 20 }}>
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            borderLeftWidth: 4,
            borderLeftColor: ACCENT,
            gap: 10,
          }}>
          <Skeleton width={120} height={10} animStyle={animStyle} />
          <Skeleton width="90%" height={14} animStyle={animStyle} />
          <Skeleton width="70%" height={14} animStyle={animStyle} />
        </View>
        <Skeleton width={100} height={10} animStyle={animStyle} />
        <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Skeleton width="60%" height={16} animStyle={animStyle} />
            <Skeleton width={36} height={16} animStyle={animStyle} />
          </View>
          <Skeleton width="100%" height={6} style={{ borderRadius: 3 }} animStyle={animStyle} />
          <View style={{ gap: 8 }}>
            <Skeleton width="80%" height={14} animStyle={animStyle} />
            <Skeleton width="65%" height={14} animStyle={animStyle} />
            <Skeleton width="75%" height={14} animStyle={animStyle} />
          </View>
        </View>
      </View>
    </View>
  );
};
