import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation } from '@apollo/client';
import { GET_SHARD, GET_SHARD_SCHEDULE, GET_SHARD_ANALYTICS } from '~/Graphql/Queries';
import { COMPLETE_TASK } from '~/Graphql/Mutations';
import CelebrationOverlay from '~/components/CelebrationOverlay';
import { useAppStore } from '~/store/app.store';
import AnimatedPressable from '~/components/AnimatedPressable';

import {
  ACCENT,
  ACCENT_COLORS,
  t,
  getCardShadow,
  useSkeletonOpacity,
} from '~/components/shard/constants';
import { Skeleton } from '~/components/shard/Skeleton';
import { PageSkeleton } from '~/components/shard/PageSkeleton';
import { DonutChart } from '~/components/shard/DonutChart';
import { MiniBarChart } from '~/components/shard/MiniBarChart';
import { GoalCard } from '~/components/shard/GoalCard';
import { ScheduleTaskCard } from '~/components/shard/ScheduleTaskCard';
import { ParticipantAvatar } from '~/components/shard/ParticipantAvatar';

// ─── Static constants ──────────────────────────────────────────────
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&auto=format&fit=crop&q=80';
const GRADIENT_COLORS: [string, string] = ['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.55)'];
const TABS = ['overview', 'progress', 'schedule'] as const;
type TabName = (typeof TABS)[number];
const SCROLL_STYLE = { flex: 1 };
const SCROLL_CONTENT = { paddingBottom: 100 };

// ─── Styles ────────────────────────────────────────────────────────
const S = StyleSheet.create({
  heroContainer: { height: 280 },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center' },
  safeHeader: { position: 'absolute', top: 0, left: 0, right: 0 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnGroup: { flexDirection: 'row', gap: 8 },
  participantsRow: { alignItems: 'center', marginTop: -34, paddingBottom: 12 },
  participantsInner: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, borderRadius: 16, padding: 16 },
  statLabelTxt: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  statValueTxt: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 4 },
  emptyCenter: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
});

// ─── ProgressGoalRow ──────────────────────────────────────────────
interface GoalStat {
  title: string;
  pct: number;
  color: string;
  total: number;
  done: number;
}
const ProgressGoalRow = memo(({ g, isDark }: { g: GoalStat; isDark: boolean }) => {
  const theme = t(isDark);
  const shadow = getCardShadow(isDark);
  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: 16,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        ...(shadow as any),
      }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: `${g.color}15`,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: g.color }}>{g.pct}%</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 13, fontWeight: '600', color: theme.text }}
          numberOfLines={1}>
          {g.title}
        </Text>
        <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
          {g.done}/{g.total} tasks
        </Text>
      </View>
      <View
        style={{
          width: 60,
          height: 4,
          borderRadius: 2,
          backgroundColor: theme.trackBg,
          overflow: 'hidden',
        }}>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: g.color, width: `${g.pct}%` }} />
      </View>
    </View>
  );
});

// ─── OverviewTab ──────────────────────────────────────────────────
interface OverviewTabProps {
  visible: boolean;
  shard: any;
  isDark: boolean;
  expandedSummary: boolean;
  setExpandedSummary: (v: boolean) => void;
  onComplete: (miniGoalId: string, taskIndex: number, completed: boolean) => void;
}
const OverviewTab = memo(
  ({ visible, shard, isDark, expandedSummary, setExpandedSummary, onComplete }: OverviewTabProps) => {
    const theme = t(isDark);
    const shadow = getCardShadow(isDark);
    return (
      <View
        style={{
          display: visible ? 'flex' : 'none',
          gap: 16,
          paddingHorizontal: 20,
          paddingTop: 16,
        }}>
        {/* Summary card */}
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            borderLeftWidth: 4,
            borderLeftColor: ACCENT,
            ...(shadow as any),
          }}>
          <Text
            style={[S.sectionLabel, { color: theme.textSecondary, marginBottom: 8 }]}>
            SHARD SUMMARY
          </Text>
          <Text
            style={{ fontSize: 14, lineHeight: 22, color: theme.text }}
            numberOfLines={expandedSummary ? undefined : 3}>
            {shard.description || 'No description provided.'}
          </Text>
          {shard.description && shard.description.length > 120 && (
            <AnimatedPressable
              onPress={() => setExpandedSummary(!expandedSummary)}
              scaleDown={0.95}
              style={{
                alignSelf: 'center',
                marginTop: 12,
                backgroundColor: ACCENT,
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 16,
              }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
                {expandedSummary ? 'Show Less' : 'Read More'}
              </Text>
            </AnimatedPressable>
          )}
        </View>

        <Text style={[S.sectionLabel, { color: theme.textSecondary }]}>SHARD GOALS</Text>

        {shard.minigoals?.map((goal: any, idx: number) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            idx={idx}
            isDark={isDark}
            onComplete={onComplete}
          />
        ))}
      </View>
    );
  }
);

// ─── ProgressTab ──────────────────────────────────────────────────
interface ProgressTabProps {
  visible: boolean;
  isDark: boolean;
  analyticsLoading: boolean;
  analyticsData: any;
  goalStats: GoalStat[];
  completion: number;
  totalTasks: number;
  completedTasks: number;
  skeletonAnim: any;
}
const ProgressTab = memo(
  ({
    visible,
    isDark,
    analyticsLoading,
    analyticsData,
    goalStats,
    completion,
    totalTasks,
    completedTasks,
    skeletonAnim,
  }: ProgressTabProps) => {
    const theme = t(isDark);
    const shadow = getCardShadow(isDark);
    return (
      <View
        style={{
          display: visible ? 'flex' : 'none',
          gap: 16,
          paddingHorizontal: 20,
          paddingTop: 16,
        }}>
        {analyticsLoading || !analyticsData ? (
          <>
            <View style={S.statRow}>
              {[ACCENT, '#6366f1'].map((bg) => (
                <View key={bg} style={[S.statCard, { backgroundColor: bg, gap: 8 }]}>
                  <Skeleton
                    width={60}
                    height={10}
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                    animStyle={skeletonAnim}
                  />
                  <Skeleton
                    width={40}
                    height={24}
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                    animStyle={skeletonAnim}
                  />
                </View>
              ))}
            </View>
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 20,
                alignItems: 'center',
                ...(shadow as any),
              }}>
              <Skeleton
                width={120}
                height={120}
                style={{ borderRadius: 60 }}
                animStyle={skeletonAnim}
              />
            </View>
          </>
        ) : (
          <>
            {/* Stat cards */}
            <View style={S.statRow}>
              <View style={[S.statCard, { backgroundColor: ACCENT }]}>
                <Text style={S.statLabelTxt}>Completed</Text>
                <Text style={S.statValueTxt}>{completedTasks}</Text>
              </View>
              <View style={[S.statCard, { backgroundColor: '#6366f1' }]}>
                <Text style={S.statLabelTxt}>Remaining</Text>
                <Text style={S.statValueTxt}>{totalTasks - completedTasks}</Text>
              </View>
            </View>

            {/* Donut chart */}
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 20,
                alignItems: 'center',
                ...(shadow as any),
              }}>
              <Text style={[S.sectionLabel, { color: theme.textSecondary, marginBottom: 16 }]}>
                OVERALL COMPLETION
              </Text>
              <DonutChart percentage={completion} isDark={isDark} />
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 12 }}>
                {completedTasks} of {totalTasks} tasks done
              </Text>
            </View>

            {/* Bar chart */}
            {goalStats.length > 0 && (
              <View
                style={{ backgroundColor: theme.card, borderRadius: 16, padding: 16, ...(shadow as any) }}>
                <Text style={[S.sectionLabel, { color: theme.textSecondary, marginBottom: 8 }]}>
                  GOAL BREAKDOWN
                </Text>
                <MiniBarChart goals={goalStats} isDark={isDark} />
              </View>
            )}

            {/* Per-goal rows */}
            {goalStats.map((g, i) => (
              <ProgressGoalRow key={i} g={g} isDark={isDark} />
            ))}
          </>
        )}
      </View>
    );
  }
);

// ─── ScheduleTab ──────────────────────────────────────────────────
interface ScheduleTabProps {
  visible: boolean;
  isDark: boolean;
  scheduleLoading: boolean;
  scheduleData: any;
  scheduleTasksList: any[];
  onToggle: (task: any) => void;
  skeletonAnim: any;
}
const ScheduleTab = memo(
  ({
    visible,
    isDark,
    scheduleLoading,
    scheduleData,
    scheduleTasksList,
    onToggle,
    skeletonAnim,
  }: ScheduleTabProps) => {
    const theme = t(isDark);
    const shadow = getCardShadow(isDark);
    return (
      <View
        style={{
          display: visible ? 'flex' : 'none',
          paddingHorizontal: 20,
          paddingTop: 16,
        }}>
        {scheduleLoading || !scheduleData ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 16,
                  overflow: 'hidden',
                  flexDirection: 'row',
                  ...(shadow as any),
                }}>
                <View style={{ width: 4, backgroundColor: theme.border }} />
                <View style={{ flex: 1, padding: 16, gap: 10 }}>
                  <Skeleton width="40%" height={12} animStyle={skeletonAnim} />
                  <Skeleton width="70%" height={16} animStyle={skeletonAnim} />
                  <Skeleton width={60} height={22} style={{ borderRadius: 8 }} animStyle={skeletonAnim} />
                </View>
              </View>
            ))}
          </View>
        ) : scheduleTasksList.length > 0 ? (
          <View style={{ gap: 12 }}>
            {scheduleTasksList.map((task: any, index: number) => (
              <ScheduleTaskCard
                key={task.id}
                task={task}
                color={ACCENT_COLORS[index % ACCENT_COLORS.length]}
                isDark={isDark}
                onToggle={onToggle}
              />
            ))}
          </View>
        ) : (
          <View style={S.emptyCenter}>
            <View
              style={[
                S.emptyIconBg,
                { backgroundColor: isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.06)' },
              ]}>
              <Ionicons name="calendar-outline" size={36} color={ACCENT} />
            </View>
            <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center' }}>
              No scheduled tasks yet
            </Text>
          </View>
        )}
      </View>
    );
  }
);

// ═══════════════════════════════════════════════════════════════════
//  Main page
// ═══════════════════════════════════════════════════════════════════
const ShardDetail = () => {
  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<TabName>('overview');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { addAlert } = useAppStore();
  const { width: screenWidth } = useWindowDimensions();

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState({
    xpEarned: 0,
    leveledUp: false,
    newLevel: 0,
  });
  const [expandedSummary, setExpandedSummary] = useState(false);

  // ─── Queries ──────────────────────────────────────────────────────
  const {
    data: shardData,
    loading: shardLoading,
    refetch: refetchShard,
  } = useQuery(GET_SHARD, { variables: { id }, skip: !id });
  const shard = shardData?.getShard?.shard;

  const {
    data: scheduleData,
    loading: scheduleLoading,
    refetch: refetchSchedule,
  } = useQuery(GET_SHARD_SCHEDULE, { variables: { shardId: id }, skip: !id });
  const {
    data: analyticsData,
    loading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useQuery(GET_SHARD_ANALYTICS, { variables: { shardId: id }, skip: !id });

  const [completeTask] = useMutation(COMPLETE_TASK);

  // ─── Derived data ─────────────────────────────────────────────────
  const scheduleTasksList = useMemo(
    () => scheduleData?.getShardSchedule?.tasks || [],
    [scheduleData]
  );

  const allParticipants = useMemo(() => {
    if (!shard) return [];
    const list: any[] = [];
    if (shard.owner)
      list.push({ user: shard.owner.id, username: shard.owner.username, profilePic: null, role: 'owner' });
    if (shard.participants)
      shard.participants.forEach((p: any) => {
        if (p.user !== shard.owner?.id) list.push(p);
      });
    return list;
  }, [shard]);

  const goalStats = useMemo<GoalStat[]>(() => {
    if (!shard?.minigoals) return [];
    return shard.minigoals.map((g: any, i: number) => {
      const total = g.tasks?.length || 0;
      const done = g.tasks?.filter((task: any) => task.completed).length || 0;
      return {
        title: g.title,
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
        color: ACCENT_COLORS[i % ACCENT_COLORS.length],
        total,
        done,
      };
    });
  }, [shard]);

  const analytics = analyticsData?.getShardAnalytics;
  const completion = analytics?.weeklyCompletion ?? 0;
  const totalTasks = analytics?.totalTasks ?? 0;
  const completedTasks = analytics?.completedTasks ?? 0;

  // Stable image source — prevents Image from re-fetching on every render
  const heroImageSource = useMemo(
    () => ({ uri: shard?.image || FALLBACK_IMAGE }),
    [shard?.image]
  );

  // ─── Handlers ─────────────────────────────────────────────────────
  const refetchAll = useCallback(() => {
    refetchShard();
    refetchSchedule();
    refetchAnalytics();
  }, [refetchShard, refetchSchedule, refetchAnalytics]);

  const handleCompleteTask = useCallback(
    async (miniGoalId: string, taskIndex: number, currentStatus: boolean) => {
      if (currentStatus) return;
      try {
        const { data } = await completeTask({ variables: { shardId: id, miniGoalId, taskIndex } });
        if (data?.completeTask?.success) {
          setCelebrationData({
            xpEarned: data.completeTask.xpEarned,
            leveledUp: data.completeTask.xpResult?.leveledUp,
            newLevel: data.completeTask.xpResult?.newLevel,
          });
          setShowCelebration(true);
          refetchAll();
        } else {
          addAlert({ str: data?.completeTask?.message || 'Failed to complete task', type: 'error' });
        }
      } catch {
        addAlert({ str: 'Failed to complete task', type: 'error' });
      }
    },
    [id, completeTask, refetchAll, addAlert]
  );

  // Stable callback for ScheduleTaskCard — single reference for all cards
  const handleScheduleTaskToggle = useCallback(
    async (task: any) => {
      if (task.completed) return;
      const [miniGoalId, taskIndexStr] = task.id.split('-');
      await handleCompleteTask(miniGoalId, parseInt(taskIndexStr, 10), false);
    },
    [handleCompleteTask]
  );

  const handleCloseCelebration = useCallback(() => setShowCelebration(false), []);

  const skeletonAnim = useSkeletonOpacity();

  const theme = t(isDark);

  // ─── Loading state ────────────────────────────────────────────────
  if (shardLoading || !shard) return <PageSkeleton screenWidth={screenWidth} />;

  return (
    <View style={[{ flex: 1 }, { backgroundColor: theme.bg }]}>
      <CelebrationOverlay
        visible={showCelebration}
        xpEarned={celebrationData.xpEarned}
        leveledUp={celebrationData.leveledUp}
        newLevel={celebrationData.newLevel}
        onClose={handleCloseCelebration}
      />

      <ScrollView
        style={SCROLL_STYLE}
        contentContainerStyle={SCROLL_CONTENT}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        removeClippedSubviews>
        {/* ─── Hero Banner ──────────────────────────────────────── */}
        <View style={S.heroContainer}>
          <Image
            source={heroImageSource}
            style={{ width: screenWidth, height: 280 }}
            resizeMode="cover"
          />
          <LinearGradient colors={GRADIENT_COLORS} style={S.gradientOverlay}>
            <Text style={S.heroTitle}>{shard.title}</Text>
            <Text style={S.heroSubtitle}>Gamified Goal Tracking</Text>
          </LinearGradient>
          <SafeAreaView edges={['top']} style={S.safeHeader}>
            <View style={S.headerRow}>
              <AnimatedPressable
                onPress={() => router.back()}
                hitSlop={20}
                scaleDown={0.9}
                style={S.headerBtn}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </AnimatedPressable>
              <View style={S.headerBtnGroup}>
                <AnimatedPressable
                  onPress={() => router.push(`/(screens)/shard/${id}/notifications`)}
                  scaleDown={0.9}
                  style={S.headerBtn}>
                  <Ionicons name="notifications-outline" size={18} color="#fff" />
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={() => router.push(`/(screens)/shard/${id}/edit`)}
                  scaleDown={0.9}
                  style={S.headerBtn}>
                  <Ionicons name="settings-outline" size={18} color="#fff" />
                </AnimatedPressable>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* ─── Participants (overlaps into hero) ────────────────── */}
        {allParticipants.length > 0 && (
          <View style={S.participantsRow}>
            <View style={S.participantsInner}>
              {allParticipants.map((p: any, i: number) => (
                <ParticipantAvatar key={p.user || i} participant={p} />
              ))}
            </View>
          </View>
        )}

        {/* ─── Tab Bar ──────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: 20,
            borderRadius: 14,
            backgroundColor: theme.tabBarBg,
            padding: 12,
            marginBottom: 4,
            gap: 6,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          {TABS.map((tab) => (
            <AnimatedPressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                backgroundColor: activeTab === tab ? ACCENT : 'transparent',
              }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: activeTab === tab ? '#fff' : theme.textSecondary,
                }}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </AnimatedPressable>
          ))}
        </View>

        {/* ═══════════════════════════════════════════════════════════
            Module-level memo components — inactive panels bail out
            completely when activeTab changes, no diff work done.
            ═══════════════════════════════════════════════════════════ */}
        <OverviewTab
          visible={activeTab === 'overview'}
          shard={shard}
          isDark={isDark}
          expandedSummary={expandedSummary}
          setExpandedSummary={setExpandedSummary}
          onComplete={handleCompleteTask}
        />
        <ProgressTab
          visible={activeTab === 'progress'}
          isDark={isDark}
          analyticsLoading={analyticsLoading}
          analyticsData={analyticsData}
          goalStats={goalStats}
          completion={completion}
          totalTasks={totalTasks}
          completedTasks={completedTasks}
          skeletonAnim={skeletonAnim}
        />
        <ScheduleTab
          visible={activeTab === 'schedule'}
          isDark={isDark}
          scheduleLoading={scheduleLoading}
          scheduleData={scheduleData}
          scheduleTasksList={scheduleTasksList}
          onToggle={handleScheduleTaskToggle}
          skeletonAnim={skeletonAnim}
        />
      </ScrollView>
    </View>
  );
};

export default ShardDetail;
