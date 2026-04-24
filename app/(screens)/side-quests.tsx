import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client';
import { router } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeOutDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { MY_SIDE_QUESTS, CAN_GENERATE_SIDE_QUEST, MY_CHALLENGES, MY_SHARDS } from '~/Graphql/Queries';
import {
  GENERATE_SIDE_QUEST,
  COMPLETE_SIDE_QUEST,
  CREATE_CHALLENGE,
  COMPLETE_CHALLENGE,
} from '~/Graphql/Mutations';
import { ACCENT, t } from '~/components/shard/constants';
import AnimatedPressable from '~/components/AnimatedPressable';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SideQuest {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  xpReward: number;
  category: string;
}

interface Challenge {
  id: string;
  type: 'daily' | 'weekly';
  title: string;
  description?: string;
  targetDate: string;
  xpReward: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SIDE_QUEST_CATEGORIES = [
  { id: 'productivity', label: 'Productivity', icon: 'flash-outline' },
  { id: 'fitness', label: 'Fitness', icon: 'barbell-outline' },
  { id: 'learning', label: 'Learning', icon: 'book-outline' },
  { id: 'creativity', label: 'Creativity', icon: 'color-palette-outline' },
  { id: 'social', label: 'Social', icon: 'people-outline' },
  { id: 'mindfulness', label: 'Mindfulness', icon: 'leaf-outline' },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',
};

// ─── Side Quest Card ─────────────────────────────────────────────────────────

const SideQuestCard = ({
  quest,
  isDark,
  onComplete,
  completing,
  exiting,
}: {
  quest: SideQuest;
  isDark: boolean;
  onComplete: (id: string) => void;
  completing: boolean;
  exiting: boolean;
}) => {
  const theme = t(isDark);
  const diffColor = DIFFICULTY_COLORS[quest.difficulty] || ACCENT;

  return (
    <Animated.View
      entering={FadeInDown.duration(350).springify()}
      exiting={exiting ? FadeOutDown.duration(350).springify() : undefined}
      style={{
        backgroundColor: theme.card,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: isDark ? theme.border : 'rgba(0,0,0,0.06)',
        marginBottom: 14,
      }}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 4, backgroundColor: diffColor }} />
        <View style={{ flex: 1, padding: 16 }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View
              style={{
                backgroundColor: `${diffColor}20`,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                marginRight: 8,
              }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: diffColor }}>
                {quest.difficulty.toUpperCase()}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)',
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: ACCENT }}>
                {quest.category}
              </Text>
            </View>
            <View style={{ flex: 1 }} />
            <Ionicons name="flash" size={13} color="#f59e0b" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#f59e0b', marginLeft: 3 }}>
              +{quest.xpReward} XP
            </Text>
          </View>

          <Text
            style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 6 }}
            numberOfLines={2}>
            {quest.title}
          </Text>

          {quest.description ? (
            <Text
              style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 18, marginBottom: 14 }}
              numberOfLines={3}>
              {quest.description}
            </Text>
          ) : null}

          <AnimatedPressable
            onPress={() => onComplete(quest.id)}
            scaleDown={0.96}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              backgroundColor: ACCENT,
              borderRadius: 10,
              paddingVertical: 10,
              opacity: completing ? 0.6 : 1,
            }}>
            {completing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Mark Complete</Text>
              </>
            )}
          </AnimatedPressable>
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Challenge Card ───────────────────────────────────────────────────────────

const ChallengeCard = ({
  challenge,
  isDark,
  onComplete,
  completing,
  exiting,
}: {
  challenge: Challenge;
  isDark: boolean;
  onComplete: (id: string) => void;
  completing: boolean;
  exiting: boolean;
}) => {
  const theme = t(isDark);
  const isDaily = challenge.type === 'daily';
  const typeColor = isDaily ? '#3b82f6' : '#8b5cf6';
  const daysLeft = Math.ceil(
    (new Date(parseInt(challenge.targetDate)).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Animated.View
      entering={FadeInDown.duration(350).springify()}
      exiting={exiting ? FadeOutDown.duration(350).springify() : undefined}
      style={{
        backgroundColor: theme.card,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: isDark ? theme.border : 'rgba(0,0,0,0.06)',
        marginBottom: 14,
      }}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 4, backgroundColor: typeColor }} />
        <View style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View
              style={{
                backgroundColor: `${typeColor}20`,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                marginRight: 8,
              }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: typeColor }}>
                {challenge.type.toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }} />
            <Ionicons name="time-outline" size={13} color={theme.textSecondary} />
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 3 }}>
              {daysLeft > 0 ? `${daysLeft}d left` : 'Due today'}
            </Text>
          </View>

          <Text
            style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 4 }}
            numberOfLines={2}>
            {challenge.title}
          </Text>

          {challenge.description ? (
            <Text
              style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 18, marginBottom: 14 }}
              numberOfLines={2}>
              {challenge.description}
            </Text>
          ) : (
            <View style={{ marginBottom: 14 }} />
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="flash" size={13} color="#f59e0b" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#f59e0b' }}>
                +{challenge.xpReward} XP
              </Text>
            </View>
            <AnimatedPressable
              onPress={() => onComplete(challenge.id)}
              scaleDown={0.96}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: typeColor,
                borderRadius: 10,
                paddingVertical: 10,
                opacity: completing ? 0.6 : 1,
              }}>
              {completing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Complete</Text>
                </>
              )}
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const SideQuestsScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = t(isDark);

  const [activeTab, setActiveTab] = useState<'quests' | 'challenges'>('quests');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  // Category picker modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('productivity');

  // Create challenge modal
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDesc, setChallengeDesc] = useState('');
  const [challengeType, setChallengeType] = useState<'daily' | 'weekly'>('daily');
  const [challengeXP, setChallengeXP] = useState('50');
  const [creatingChallenge, setCreatingChallenge] = useState(false);

  // Queries
  const { data: sqData, loading: sqLoading, refetch: sqRefetch } = useQuery(MY_SIDE_QUESTS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: canData, refetch: canRefetch } = useQuery(CAN_GENERATE_SIDE_QUEST);
  const { data: chData, loading: chLoading, refetch: chRefetch } = useQuery(MY_CHALLENGES, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: shardsData } = useQuery(MY_SHARDS);

  const sideQuests: SideQuest[] = sqData?.mySideQuests?.sideQuests || [];
  const challenges: Challenge[] = chData?.myChallenges?.challenges || [];
  const canGenerate = canData?.canGenerateSideQuest?.canGenerate ?? false;
  const reasons = canData?.canGenerateSideQuest?.reasons;

  // Pulse the generate CTA when available
  useEffect(() => {
    if (canGenerate) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.03, { duration: 800 }), withTiming(1, { duration: 800 })),
        -1,
        true
      );
    } else {
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [canGenerate]);

  // Mutations
  const [generateQuest] = useMutation(GENERATE_SIDE_QUEST);
  const [completeQuest] = useMutation(COMPLETE_SIDE_QUEST);
  const [createChallenge] = useMutation(CREATE_CHALLENGE);
  const [completeChallengeMut] = useMutation(COMPLETE_CHALLENGE);

  const handleGenerate = useCallback(async () => {
    setGeneratingId('generating');
    setShowCategoryModal(false);
    try {
      const { data } = await generateQuest({ variables: { category: selectedCategory } });
      if (data?.generateSideQuest?.success) {
        Toast.show({ type: 'success', text1: 'Side quest generated!', text2: data.generateSideQuest.sideQuest?.title });
        sqRefetch();
        canRefetch();
      } else {
        Toast.show({ type: 'error', text1: data?.generateSideQuest?.message || 'Failed to generate quest' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Something went wrong' });
    } finally {
      setGeneratingId(null);
    }
  }, [generateQuest, selectedCategory, sqRefetch, canRefetch]);

  const handleCompleteQuest = useCallback(async (id: string) => {
    setCompletingId(id);
    try {
      const { data } = await completeQuest({ variables: { sideQuestId: id } });
      if (data?.completeSideQuest?.success) {
        const xp = data.completeSideQuest.xpEarned;
        const leveled = data.completeSideQuest.xpResult?.leveledUp;
        // Animate card out before refetch
        setExitingIds((prev) => new Set(prev).add(id));
        setTimeout(() => {
          sqRefetch();
          canRefetch();
          setExitingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
        }, 380);
        Toast.show({
          type: 'success',
          text1: leveled ? 'Level up! Quest complete!' : 'Quest complete!',
          text2: `+${xp} XP earned`,
        });
      } else {
        Toast.show({ type: 'error', text1: data?.completeSideQuest?.message || 'Failed to complete quest' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Something went wrong' });
    } finally {
      setCompletingId(null);
    }
  }, [completeQuest, sqRefetch, canRefetch]);

  const handleCompleteChallenge = useCallback(async (id: string) => {
    setCompletingId(id);
    try {
      const { data } = await completeChallengeMut({ variables: { challengeId: id } });
      if (data?.completeChallenge?.success) {
        const xp = data.completeChallenge.xpEarned;
        const leveled = data.completeChallenge.xpResult?.leveledUp;
        setExitingIds((prev) => new Set(prev).add(id));
        setTimeout(() => {
          chRefetch();
          setExitingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
        }, 380);
        Toast.show({
          type: 'success',
          text1: leveled ? 'Level up! Challenge done!' : 'Challenge complete!',
          text2: `+${xp} XP earned`,
        });
      } else {
        Toast.show({ type: 'error', text1: data?.completeChallenge?.message || 'Failed' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Something went wrong' });
    } finally {
      setCompletingId(null);
    }
  }, [completeChallengeMut, chRefetch]);

  const handleCreateChallenge = useCallback(async () => {
    if (!challengeTitle.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter a title' });
      return;
    }
    setCreatingChallenge(true);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + (challengeType === 'daily' ? 1 : 7));
    try {
      const { data } = await createChallenge({
        variables: {
          input: {
            type: challengeType,
            title: challengeTitle.trim(),
            description: challengeDesc.trim() || undefined,
            targetDate: targetDate.toISOString(),
            xpReward: parseInt(challengeXP) || 50,
          },
        },
      });
      if (data?.createChallenge?.success) {
        Toast.show({ type: 'success', text1: 'Challenge created!' });
        setChallengeTitle('');
        setChallengeDesc('');
        setChallengeXP('50');
        setShowChallengeModal(false);
        chRefetch();
      } else {
        Toast.show({ type: 'error', text1: data?.createChallenge?.message || 'Failed to create challenge' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Something went wrong' });
    } finally {
      setCreatingChallenge(false);
    }
  }, [createChallenge, challengeTitle, challengeDesc, challengeType, challengeXP, chRefetch]);

  const onRefresh = useCallback(async () => {
    if (activeTab === 'quests') {
      await Promise.all([sqRefetch(), canRefetch()]);
    } else {
      await chRefetch();
    }
  }, [activeTab, sqRefetch, canRefetch, chRefetch]);

  const isRefreshing = activeTab === 'quests' ? sqLoading : chLoading;

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
        <AnimatedPressable onPress={() => router.back()} hitSlop={20}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </AnimatedPressable>
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>Quests</Text>
        {activeTab === 'challenges' ? (
          <AnimatedPressable onPress={() => setShowChallengeModal(true)} hitSlop={20}>
            <Ionicons name="add-circle-outline" size={24} color={ACCENT} />
          </AnimatedPressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {/* Tabs */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: 16,
          marginBottom: 16,
          backgroundColor: isDark ? '#1a1a1a' : '#f3f4f6',
          borderRadius: 12,
          padding: 4,
        }}>
        {(['quests', 'challenges'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: activeTab === tab ? ACCENT : 'transparent',
            }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: activeTab === tab ? '#fff' : theme.textSecondary,
              }}>
              {tab === 'quests' ? 'Side Quests' : 'Challenges'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }>
        {activeTab === 'quests' ? (
          <>
            {/* Generate CTA */}
            <Animated.View
              style={[
                {
                  backgroundColor: isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.06)',
                  borderRadius: 18,
                  padding: 18,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: canGenerate
                    ? isDark ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.35)'
                    : isDark ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.15)',
                },
                canGenerate ? pulseStyle : undefined,
              ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Ionicons name="sparkles-outline" size={20} color={ACCENT} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>
                  AI Side Quests
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 14, lineHeight: 18 }}>
                Short 1–3 day challenges generated by AI to keep you sharp between shards.
              </Text>

              {!canGenerate && reasons && (
                <Text style={{ fontSize: 12, color: '#f59e0b', marginBottom: 10 }}>
                  {reasons.tooManyShards
                    ? `You have ${reasons.activeShardsCount} active shards. Complete one first.`
                    : 'You already have an active side quest. Complete it first.'}
                </Text>
              )}

              <AnimatedPressable
                onPress={() => canGenerate && setShowCategoryModal(true)}
                scaleDown={0.96}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: canGenerate ? ACCENT : isDark ? '#2a2a2a' : '#e5e7eb',
                  borderRadius: 12,
                  paddingVertical: 12,
                  opacity: generatingId ? 0.6 : 1,
                }}>
                {generatingId ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="flash-outline"
                      size={18}
                      color={canGenerate ? '#fff' : theme.textSecondary}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: canGenerate ? '#fff' : theme.textSecondary,
                      }}>
                      Generate Quest
                    </Text>
                  </>
                )}
              </AnimatedPressable>
            </Animated.View>

            {/* Quest List */}
            {sideQuests.length === 0 && !sqLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="compass-outline" size={52} color={isDark ? '#374151' : '#d1d5db'} />
                <Text
                  style={{ marginTop: 12, fontSize: 15, color: theme.textSecondary, textAlign: 'center' }}>
                  No active side quests.{'\n'}Generate one above!
                </Text>
              </View>
            ) : (
              sideQuests.map((quest) => (
                <SideQuestCard
                  key={quest.id}
                  quest={quest}
                  isDark={isDark}
                  onComplete={handleCompleteQuest}
                  completing={completingId === quest.id}
                  exiting={exitingIds.has(quest.id)}
                />
              ))
            )}
          </>
        ) : (
          <>
            {challenges.length === 0 && !chLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Ionicons name="trophy-outline" size={52} color={isDark ? '#374151' : '#d1d5db'} />
                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 15,
                    color: theme.textSecondary,
                    textAlign: 'center',
                  }}>
                  No active challenges.{'\n'}Tap + to create one.
                </Text>
              </View>
            ) : (
              challenges.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  isDark={isDark}
                  onComplete={handleCompleteChallenge}
                  completing={completingId === challenge.id}
                  exiting={exitingIds.has(challenge.id)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}>
          <View
            style={{
              backgroundColor: isDark ? '#1a1a1a' : '#fff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
            }}
            onStartShouldSetResponder={() => true}>
            <Text
              style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 6 }}>
              Choose a Category
            </Text>
            <Text
              style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 20 }}>
              AI will tailor the quest to this focus area.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
              {SIDE_QUEST_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: isSelected ? ACCENT : isDark ? '#374151' : '#e5e7eb',
                      backgroundColor: isSelected
                        ? isDark
                          ? 'rgba(124,58,237,0.15)'
                          : 'rgba(124,58,237,0.08)'
                        : 'transparent',
                    }}>
                    <Ionicons
                      name={cat.icon as any}
                      size={16}
                      color={isSelected ? ACCENT : theme.textSecondary}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: isSelected ? ACCENT : theme.text,
                      }}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <AnimatedPressable
              onPress={handleGenerate}
              scaleDown={0.96}
              style={{
                backgroundColor: ACCENT,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
              }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                Generate {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Quest
              </Text>
            </AnimatedPressable>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create Challenge Modal */}
      <Modal
        visible={showChallengeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChallengeModal(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowChallengeModal(false)}>
          <View
            style={{
              backgroundColor: isDark ? '#1a1a1a' : '#fff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
            }}
            onStartShouldSetResponder={() => true}>
            <Text
              style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 20 }}>
              New Challenge
            </Text>

            {/* Type toggle */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {(['daily', 'weekly'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setChallengeType(type)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                    borderWidth: 1.5,
                    borderColor: challengeType === type ? ACCENT : isDark ? '#374151' : '#e5e7eb',
                    backgroundColor:
                      challengeType === type
                        ? isDark
                          ? 'rgba(124,58,237,0.15)'
                          : 'rgba(124,58,237,0.08)'
                        : 'transparent',
                  }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: challengeType === type ? ACCENT : theme.textSecondary,
                    }}>
                    {type === 'daily' ? 'Daily (1 day)' : 'Weekly (7 days)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Title */}
            <TextInput
              value={challengeTitle}
              onChangeText={setChallengeTitle}
              placeholder="Challenge title"
              placeholderTextColor={theme.textSecondary}
              style={{
                backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6',
                color: theme.text,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                marginBottom: 10,
              }}
            />

            {/* Description */}
            <TextInput
              value={challengeDesc}
              onChangeText={setChallengeDesc}
              placeholder="Description (optional)"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={2}
              style={{
                backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6',
                color: theme.text,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 14,
                marginBottom: 10,
                textAlignVertical: 'top',
              }}
            />

            {/* XP */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Ionicons name="flash" size={16} color="#f59e0b" />
              <Text style={{ fontSize: 14, color: theme.text, fontWeight: '600' }}>XP Reward:</Text>
              <TextInput
                value={challengeXP}
                onChangeText={setChallengeXP}
                keyboardType="numeric"
                style={{
                  backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6',
                  color: theme.text,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  fontSize: 14,
                  width: 70,
                  textAlign: 'center',
                }}
              />
            </View>

            <AnimatedPressable
              onPress={handleCreateChallenge}
              scaleDown={0.96}
              style={{
                backgroundColor: ACCENT,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
                opacity: creatingChallenge ? 0.6 : 1,
              }}>
              {creatingChallenge ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                  Create Challenge
                </Text>
              )}
            </AnimatedPressable>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default SideQuestsScreen;
