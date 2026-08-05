import React, { useMemo } from 'react';
import { View, Text, ScrollView, useColorScheme, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@apollo/client';
import { GET_ACHIEVEMENTS } from '~/Graphql/Queries';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedPressable from '~/components/AnimatedPressable';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = (width - 48) / COLUMN_COUNT;

const RarityBadge = ({ rarity }: { rarity: string }) => {
  const colors: Record<string, string> = {
    common: '#94a3b8',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#eab308',
  };

  return (
    <View style={[styles.rarityBadge, { backgroundColor: colors[rarity] || colors.common }]}>
      <Text style={styles.rarityText}>{rarity.toUpperCase()}</Text>
    </View>
  );
};

const AchievementCard = ({ achievement, isDark }: { achievement: any; isDark: boolean }) => {
  const isLocked = !achievement.earned;

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(30, 30, 30, 0.6)' : '#ffffff',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          opacity: isLocked ? 0.6 : 1,
        },
      ]}>
      <View style={[styles.iconContainer, isLocked && styles.lockedIcon]}>
        <Text style={styles.iconText}>{achievement.icon || '🏆'}</Text>
        {isLocked && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={12} color="#fff" />
          </View>
        )}
      </View>
      <Text style={[styles.name, { color: isDark ? '#fff' : '#1a1a1a' }]} numberOfLines={1}>
        {achievement.name}
      </Text>
      <RarityBadge rarity={achievement.rarity} />
    </Animated.View>
  );
};

const AchievementsScreen = () => {
  const isDark = useColorScheme() === 'dark';
  const { data, loading } = useQuery(GET_ACHIEVEMENTS, {
    fetchPolicy: 'cache-and-network',
  });

  const achievements = data?.getAchievements?.achievements || [];
  const earnedCount = useMemo(
    () => achievements.filter((a: any) => a.earned).length,
    [achievements]
  );

  const categorized = useMemo(() => {
    const groups: Record<string, any[]> = {};
    achievements.forEach((a: any) => {
      if (!groups[a.category]) groups[a.category] = [];
      groups[a.category].push(a);
    });
    return Object.entries(groups).sort();
  }, [achievements]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0e0e0e' : '#f8f9fa' }]}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} hitSlop={20} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : '#1a1a1a'} />
        </AnimatedPressable>
        <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#1a1a1a' }]}>
          Achievements
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Progress Card */}
        <LinearGradient
          colors={['#8b5cf6', '#6d28d9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.progressCard}>
          <View>
            <Text style={styles.progressLabel}>Your Progress</Text>
            <Text style={styles.progressValue}>
              {earnedCount} / {achievements.length}
            </Text>
          </View>
          <View style={styles.trophyIcon}>
            <Ionicons name="trophy" size={40} color="rgba(255,255,255,0.3)" />
          </View>
        </LinearGradient>

        {/* Categories */}
        {categorized.map(([category, items], sectionIndex) => (
          <View key={category} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
              {category.toUpperCase()}
            </Text>
            <View style={styles.grid}>
              {items.map((item) => (
                <AchievementCard key={item.id} achievement={item} isDark={isDark} />
              ))}
            </View>
          </View>
        ))}

        {loading && achievements.length === 0 && (
          <View style={styles.center}>
            <Text style={{ color: isDark ? '#767575' : '#9ca3af' }}>
              Loading your achievements...
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressCard: {
    margin: 16,
    padding: 24,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  progressValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  trophyIcon: {
    opacity: 0.8,
  },
  section: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: ITEM_SIZE,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139,92,246,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  lockedIcon: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  iconText: {
    fontSize: 24,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6b7280',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  rarityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rarityText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
});

export default AchievementsScreen;
