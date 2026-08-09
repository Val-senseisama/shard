import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { brand, FONT, RADIUS } from '~/components/hud';
import { useColorScheme } from '~/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@apollo/client';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { GET_PRODUCTIVITY_DATA } from '~/Graphql/Queries';
import { ACCENT, t } from '~/components/shard/constants';
import AnimatedPressable from '~/components/AnimatedPressable';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayData {
  date: string;
  tasksCompleted: number;
  xpEarned: number;
  shardsActive: number;
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

const BarChart = ({
  data,
  isDark,
  valueKey,
  color,
  label,
}: {
  data: DayData[];
  isDark: boolean;
  valueKey: 'tasksCompleted' | 'xpEarned';
  color: string;
  label: string;
}) => {
  const { width } = useWindowDimensions();
  const theme = t(isDark);
  const chartWidth = width - 64;

  if (!data.length) return null;

  const values = data.map((d) => d[valueKey] as number);
  const maxVal = Math.max(...values, 1);
  const barWidth = Math.floor((chartWidth - (data.length - 1) * 6) / data.length);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
  };

  return (
    <View>
      <Text
        style={{
          fontSize: 11,
          fontFamily: FONT.bold,
          color: theme.textSecondary,
          letterSpacing: 0.2,
          marginBottom: 12,
        }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100 }}>
        {data.map((day, i) => {
          const val = day[valueKey] as number;
          const pct = val / maxVal;
          const barH = Math.max(pct * 88, val > 0 ? 6 : 2);
          return (
            <View key={i} style={{ width: barWidth, alignItems: 'center' }}>
              {val > 0 && (
                <Text
                  style={{
                    fontSize: 8,
                    fontFamily: FONT.bold,
                    color: theme.textSecondary,
                    marginBottom: 2,
                  }}>
                  {val}
                </Text>
              )}
              <View
                style={{
                  width: barWidth,
                  height: barH,
                  borderRadius: RADIUS.xs,
                  backgroundColor: val > 0 ? color : isDark ? '#2a2a2a' : '#e5e7eb',
                  opacity: val > 0 ? 0.85 + 0.15 * pct : 1,
                }}
              />
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 9,
                  color: theme.textSecondary,
                  textAlign: 'center',
                }}>
                {formatDate(day.date)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ─── Insight Card ─────────────────────────────────────────────────────────────

const InsightCard = ({ text, isDark, index }: { text: string; isDark: boolean; index: number }) => {
  const theme = t(isDark);
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 30).duration(260)}
      style={{
        flexDirection: 'row',
        gap: 12,
        backgroundColor: theme.card,
        borderRadius: RADIUS.sm,
        padding: 14,
        borderWidth: 1,
        borderColor: isDark ? theme.border : 'rgba(0,0,0,0.05)',
        marginBottom: 10,
      }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: RADIUS.sm,
          backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
        <Ionicons name="bulb-outline" size={16} color={ACCENT} />
      </View>
      <Text style={{ flex: 1, fontSize: 14, color: theme.text, lineHeight: 20 }}>{text}</Text>
    </Animated.View>
  );
};

// ─── Struggle Tag ─────────────────────────────────────────────────────────────

const StruggleTag = ({ label, isDark }: { label: string; isDark: boolean }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.07)',
      borderRadius: RADIUS.sm,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.12)',
    }}>
    <Ionicons name="warning-outline" size={14} color="#ef4444" />
    <Text style={{ fontSize: 13, color: '#ef4444', fontFamily: FONT.semibold }}>{label}</Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ProductivityScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = t(isDark);
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly');

  const { data, loading, refetch } = useQuery(GET_PRODUCTIVITY_DATA, {
    fetchPolicy: 'cache-and-network',
  });

  const prod = data?.getProductivityData;
  const weeklyData: DayData[] = prod?.weeklyData || [];
  const monthlyData: DayData[] = prod?.monthlyData || [];
  const insights: string[] = prod?.insights || [];
  const struggleAreas: string[] = prod?.struggleAreas || [];
  const avgRate: number = prod?.averageCompletionRate || 0;
  const chartData = view === 'weekly' ? weeklyData : monthlyData;

  const totalTasksWeek = weeklyData.reduce((s, d) => s + d.tasksCompleted, 0);
  const totalXPWeek = weeklyData.reduce((s, d) => s + d.xpEarned, 0);
  const hasData = weeklyData.length > 0 || monthlyData.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}>
        <AnimatedPressable onPress={() => router.back()} hitSlop={20} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </AnimatedPressable>
        <Text style={{ fontSize: 18, fontFamily: FONT.bold, color: theme.text }}>Productivity</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={ACCENT} colors={[ACCENT]} />
        }>
        {/* Hero stats */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <LinearGradient
            colors={['#7c3aed', brand.violetDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: RADIUS.lg, padding: 22, marginBottom: 16 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: FONT.semibold, marginBottom: 4 }}>
              This Week
            </Text>
            <View style={{ flexDirection: 'row', gap: 32, marginBottom: 16 }}>
              <View>
                <Text style={{ color: '#fff', fontSize: 28, fontFamily: FONT.extrabold }}>
                  {totalTasksWeek}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Tasks done</Text>
              </View>
              <View>
                <Text style={{ color: '#fff', fontSize: 28, fontFamily: FONT.extrabold }}>
                  {totalXPWeek}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>XP earned</Text>
              </View>
              <View>
                <Text style={{ color: '#fff', fontSize: 28, fontFamily: FONT.extrabold }}>
                  {Math.round(avgRate)}%
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Avg rate</Text>
              </View>
            </View>
            {/* Completion bar */}
            <View
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.2)',
                overflow: 'hidden',
              }}>
              <View
                style={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#fff',
                  width: `${Math.min(avgRate, 100)}%`,
                }}
              />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4 }}>
              Completion rate
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* View toggle */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: isDark ? '#1a1a1a' : '#f3f4f6',
            borderRadius: RADIUS.sm,
            padding: 4,
            marginBottom: 20,
          }}>
          {(['weekly', 'monthly'] as const).map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => setView(v)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: RADIUS.sm,
                alignItems: 'center',
                backgroundColor: view === v ? ACCENT : 'transparent',
              }}>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: FONT.semibold,
                  color: view === v ? '#fff' : theme.textSecondary,
                }}>
                {v === 'weekly' ? 'This Week' : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {!hasData && !loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Ionicons name="bar-chart-outline" size={52} color={isDark ? '#374151' : '#d1d5db'} />
            <Text
              style={{
                marginTop: 12,
                fontSize: 15,
                color: theme.textSecondary,
                textAlign: 'center',
                lineHeight: 22,
              }}>
              No data yet.{'\n'}Complete tasks to see your productivity insights.
            </Text>
          </View>
        ) : (
          <>
            {/* Charts */}
            {chartData.length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(100).duration(260)}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: RADIUS.md,
                  padding: 18,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: isDark ? theme.border : 'rgba(0,0,0,0.05)',
                  gap: 28,
                }}>
                <BarChart
                  data={chartData}
                  isDark={isDark}
                  valueKey="tasksCompleted"
                  color={ACCENT}
                  label="Tasks Completed"
                />
                <BarChart
                  data={chartData}
                  isDark={isDark}
                  valueKey="xpEarned"
                  color="#f59e0b"
                  label="XP Earned"
                />
              </Animated.View>
            )}

            {/* AI Insights */}
            {insights.length > 0 && (
              <Animated.View entering={FadeInDown.delay(150).duration(260)}>
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: FONT.bold,
                    color: theme.textSecondary,
                    letterSpacing: 0.2,
                    marginBottom: 12,
                  }}>
                  AI Insights
                </Text>
                {insights.map((insight, i) => (
                  <InsightCard key={i} text={insight} isDark={isDark} index={i} />
                ))}
              </Animated.View>
            )}

            {/* Struggle Areas */}
            {struggleAreas.length > 0 && (
              <Animated.View entering={FadeInDown.delay(150).duration(260)} style={{ marginTop: 8 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: FONT.bold,
                    color: theme.textSecondary,
                    letterSpacing: 0.2,
                    marginBottom: 12,
                  }}>
                  Areas to Improve
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {struggleAreas.map((area, i) => (
                    <StruggleTag key={i} label={area} isDark={isDark} />
                  ))}
                </View>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProductivityScreen;
