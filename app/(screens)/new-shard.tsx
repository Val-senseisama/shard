import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useMutation, useLazyQuery, useQuery } from '@apollo/client';
import { useUserStore } from '~/store/user.store';
import { useAppStore } from '~/store/app.store';
import { CREATE_SHARD_MANUAL, IMPORT_CURRICULUM, CREATE_SHARD_FROM_CURRICULUM } from '~/Graphql/Mutations';
import { GET_FRIENDS, GET_SIGNED_UPLOAD_URL, GET_AI_USAGE, MY_TEAMS } from '~/Graphql/Queries';
import { useFriendsStore } from '~/store/friends.store';
import { openPaywall } from '~/helpers/paywall';
import { brand, hud, FONT, HudLabel, RADIUS } from '~/components/hud';
import AddImageInput from '~/components/AddImageInput';
import AnimatedPressable from '~/components/AnimatedPressable';
import { avatarUri } from '~/helpers/avatarUri';

import { useCreationSteps, type CreationMode } from '~/hooks/useCreationSteps';
import { useQuestDraft, type BriefAnswers } from '~/hooks/useQuestDraft';
import SharpenStep from '~/components/new-shard/SharpenStep';
import ShapeWorkspace from '~/components/new-shard/ShapeWorkspace';
import GeneratingView from '~/components/new-shard/GeneratingView';
import RefineBar from '~/components/new-shard/RefineBar';

import CourseSourceStep, { type CourseSourceData } from '~/components/course/CourseSourceStep';
import CurriculumReviewStep, { type CurriculumData } from '~/components/course/CurriculumReviewStep';
import CoursePaceStep, { type RhythmData } from '~/components/course/CoursePaceStep';

interface SelectedFriend {
  userId: string;
  role: 'collaborator' | 'accountability_partner';
}

interface MiniGoalDraft {
  id: string;
  title: string;
  tasks: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// ─── Step Indicator ──────────────────────────────────────────────────

/**
 * Renders one dot per step of the current mode. Count-driven rather than
 * hardcoded to two, so a mode with three steps draws three.
 */
const StepIndicator = ({
  current,
  total,
  isDark,
}: {
  /** 1-based. */
  current: number;
  total: number;
  isDark: boolean;
}) => {
  const c = hud(isDark);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
      {Array.from({ length: total }, (_, i) => i + 1).map((s, i) => (
        <React.Fragment key={s}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: current >= s ? c.violet : 'transparent',
              borderWidth: 1,
              borderColor: current >= s ? c.violet : c.panelBorderStrong,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ color: current >= s ? '#fff' : c.textFaint, fontSize: 13, fontFamily: FONT.bold }}>
              {s}
            </Text>
          </View>
          {i < total - 1 && (
            <View
              style={{
                width: 40,
                height: 1.5,
                // Lit once the user is past the step this connector leaves.
                backgroundColor: current > s ? c.violet : c.panelBorderStrong,
                marginHorizontal: 8,
              }}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

// ─── Mode Selector ───────────────────────────────────────────────────

const ModeSelector = ({
  mode,
  onSelect,
  isDark,
}: {
  mode: CreationMode;
  onSelect: (m: CreationMode) => void;
  isDark: boolean;
}) => {
  const c = hud(isDark);
  return (
      <View style={{ marginBottom: 22, flexDirection: 'row', gap: 8, backgroundColor: c.bgElev, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: c.panelBorder, padding: 5 }}>
        {(['ai', 'course', 'manual'] as const).map((m) => {
          const active = mode === m;
          const label = m === 'ai' ? 'Use AI' : m === 'course' ? 'Course' : 'Manual';
          return (
            <AnimatedPressable
              key={m}
              onPress={() => onSelect(m)}
              containerStyle={{ flex: 1 }} style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 14,
                borderRadius: RADIUS.pill,
                backgroundColor: active ? 'rgba(139,92,246,0.14)' : 'transparent',
                borderWidth: 1,
                borderColor: active ? c.violet : 'transparent',
              }}>
              {m === 'ai' ? (
                <Ionicons name="sparkles" size={15} color={active ? c.violet : c.textDim} style={{ marginRight: 6 }} />
              ) : m === 'course' ? (
                <Ionicons name="book-outline" size={15} color={active ? c.violet : c.textDim} style={{ marginRight: 6 }} />
              ) : (
                <MaterialIcons name="edit" size={15} color={active ? c.violet : c.textDim} style={{ marginRight: 6 }} />
              )}
              <Text
                numberOfLines={1}
                style={{ fontSize: 13, fontFamily: FONT.semibold, letterSpacing: 0.2, color: active ? c.violet : c.textDim }}>
                {label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
  );
};

// ─── Manual Mini-Goal Builder ─────────────────────────────────────────

const MiniGoalBuilder = ({
  miniGoals,
  onChange,
  isDark,
}: {
  miniGoals: MiniGoalDraft[];
  onChange: (mgs: MiniGoalDraft[]) => void;
  isDark: boolean;
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addGoal = () => {
    onChange([...miniGoals, { id: Date.now().toString(), title: '', tasks: [''] }]);
  };

  const removeGoal = (id: string) => onChange(miniGoals.filter((mg) => mg.id !== id));

  const updateTitle = (id: string, title: string) =>
    onChange(miniGoals.map((mg) => (mg.id === id ? { ...mg, title } : mg)));

  const updateTask = (goalId: string, taskIdx: number, text: string) =>
    onChange(
      miniGoals.map((mg) => {
        if (mg.id !== goalId) return mg;
        const tasks = [...mg.tasks];
        tasks[taskIdx] = text;
        return { ...mg, tasks };
      })
    );

  const addTask = (goalId: string) =>
    onChange(miniGoals.map((mg) => (mg.id === goalId ? { ...mg, tasks: [...mg.tasks, ''] } : mg)));

  const removeTask = (goalId: string, taskIdx: number) =>
    onChange(
      miniGoals.map((mg) => {
        if (mg.id !== goalId) return mg;
        const tasks = mg.tasks.filter((_, i) => i !== taskIdx);
        return { ...mg, tasks: tasks.length > 0 ? tasks : [''] };
      })
    );

  return (
    <View>
      <Text
        style={{
          color: isDark ? '#adaaaa' : '#666',
          fontSize: 11,
          fontFamily: FONT.bold,
          letterSpacing: 0.2,
          marginBottom: 4,
        }}>
        Mini-Goals
      </Text>
      <Text
        style={{ color: isDark ? '#555' : '#aaa', fontSize: 12, marginBottom: 16, lineHeight: 18 }}>
        Break your quest into phases. Tasks are optional.
      </Text>

      {miniGoals.map((mg, idx) => (
        <Animated.View
          key={mg.id}
          entering={FadeInDown.delay(idx * 30).duration(260)}
          style={{
            backgroundColor: isDark ? '#1a1a1a' : '#f6f7fb',
            borderRadius: RADIUS.md,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(72,72,71,0.3)' : 'rgba(0,0,0,0.06)',
            marginBottom: 12,
            overflow: 'hidden',
          }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: RADIUS.md,
                backgroundColor: 'rgba(139,92,246,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}>
              <Text style={{ color: brand.violet, fontFamily: FONT.bold, fontSize: 12 }}>{idx + 1}</Text>
            </View>
            <TextInput
              value={mg.title}
              onChangeText={(t) => updateTitle(mg.id, t)}
              placeholder={`Phase ${idx + 1} title...`}
              placeholderTextColor={isDark ? '#444' : '#bbb'}
              style={{
                flex: 1,
                color: isDark ? '#fff' : '#1a1a1a',
                fontSize: 14,
                fontFamily: FONT.semibold,
              }}
            />
            <TouchableOpacity
              onPress={() => setExpandedId(expandedId === mg.id ? null : mg.id)}
              hitSlop={10}
              style={{ marginRight: 8 }}>
              <Ionicons
                name={expandedId === mg.id ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={isDark ? '#555' : '#bbb'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeGoal(mg.id)} hitSlop={10} accessibilityLabel="Delete">
              <Ionicons name="trash-outline" size={16} color={isDark ? '#444' : '#ccc'} />
            </TouchableOpacity>
          </View>

          {/* Tasks (collapsible) */}
          {expandedId === mg.id && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <View
                style={{
                  height: 1,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  marginBottom: 12,
                }}
              />
              {mg.tasks.map((task, ti) => (
                <View
                  key={ti}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: brand.violet,
                      marginRight: 10,
                      marginLeft: 4,
                    }}
                  />
                  <TextInput
                    value={task}
                    onChangeText={(t) => updateTask(mg.id, ti, t)}
                    placeholder={`Task ${ti + 1}...`}
                    placeholderTextColor={isDark ? '#444' : '#bbb'}
                    style={{ flex: 1, color: isDark ? '#fff' : '#1a1a1a', fontSize: 13 }}
                  />
                  {mg.tasks.length > 1 && (
                    <TouchableOpacity onPress={() => removeTask(mg.id, ti)} hitSlop={10} accessibilityLabel="Close">
                      <Ionicons name="close" size={15} color={isDark ? '#444' : '#ccc'} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity
                onPress={() => addTask(mg.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 4,
                  paddingLeft: 4,
                }}>
                <Ionicons name="add" size={14} color="#8b5cf6" />
                <Text style={{ color: brand.violet, fontSize: 12, fontFamily: FONT.semibold, marginLeft: 4 }}>
                  Add task
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      ))}

      <AnimatedPressable
        onPress={addGoal}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.25)',
          borderRadius: RADIUS.sm,
          paddingVertical: 14,
          gap: 8,
        }}>
        <Ionicons name="add-circle-outline" size={18} color="#8b5cf6" />
        <Text style={{ color: brand.violet, fontFamily: FONT.semibold, fontSize: 13 }}>Add Mini-Goal</Text>
      </AnimatedPressable>
    </View>
  );
};

// ─── Team Quick Assign ────────────────────────────────────────────────

const TeamQuickAssign = ({
  onAssignTeam,
  isDark,
}: {
  onAssignTeam: (memberIds: string[]) => void;
  isDark: boolean;
}) => {
  const [teams, setTeams] = React.useState<any[]>([]);
  const [expanded, setExpanded] = React.useState(false);

  useQuery(MY_TEAMS, {
    fetchPolicy: 'cache-and-network',
    onCompleted: (data) => {
      if (data?.myTeams?.success) setTeams(data.myTeams.teams || []);
    },
  });

  if (teams.length === 0) return null;

  // Plain View: this expands on tap, so it's an ancestor of size-changing
  // content and must not have its layout owned by an entering animation — same
  // reason as FriendSelection's root.
  return (
    <View style={{ marginBottom: 16 }}>
      <AnimatedPressable
        onPress={() => setExpanded(!expanded)}
        scaleDown={0.98}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: RADIUS.sm,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.25)',
          backgroundColor: expanded
            ? isDark
              ? 'rgba(139,92,246,0.08)'
              : 'rgba(139,92,246,0.04)'
            : 'transparent',
        }}>
        <Ionicons name="people-outline" size={18} color="#8b5cf6" />
        <Text style={{ flex: 1, color: brand.violet, fontFamily: FONT.semibold, fontSize: 13 }}>
          Quick-assign a Team
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#8b5cf6" />
      </AnimatedPressable>

      {expanded && (
        <View style={{ marginTop: 10, gap: 8 }}>
          {teams.map((team) => (
            <AnimatedPressable
              key={team.id}
              scaleDown={0.96}
              onPress={() => {
                const ids = team.members.map((m: any) => m.id);
                onAssignTeam(ids);
                setExpanded(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? '#1a1a1a' : '#f6f7fb',
                borderRadius: RADIUS.sm,
                padding: 12,
              }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: RADIUS.sm,
                  backgroundColor: 'rgba(139,92,246,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                <Ionicons name="people" size={18} color="#8b5cf6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 14, fontFamily: FONT.semibold, color: isDark ? '#fff' : '#1a1a1a' }}>
                  {team.name}
                </Text>
                <Text style={{ fontSize: 12, color: '#767575', marginTop: 1 }}>
                  {team.memberCount} member{team.memberCount !== 1 ? 's' : ''} → all as
                  collaborators
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#8b5cf6" />
            </AnimatedPressable>
          ))}
        </View>
      )}
    </View>
  );
};

// ─── Friend Selection ─────────────────────────────────────────────────

const FriendSelection = ({
  selectedFriends,
  onSelect,
  isDark,
}: {
  selectedFriends: SelectedFriend[];
  onSelect: (friendId: string, role: 'collaborator' | 'accountability_partner' | null) => void;
  isDark: boolean;
}) => {
  const { searchQuery, setSearchQuery, filteredFriends } = useFriendsStore();
  const filtered = filteredFriends();
  const c = hud(isDark);

  /**
   * Tapping the row adds the friend as an accountability partner, and tapping it
   * again removes them. The role chips then refine that choice.
   *
   * Partner rather than collaborator for two reasons: it's the role the product
   * is actually about ("bring someone who'll notice if you stop"), and
   * collaborators are capped at one on the free plan — so defaulting there would
   * fire a paywall at someone who just tapped a friend's face and had no idea
   * they were choosing anything.
   */
  const ROLE_LABEL = {
    collaborator: 'Collaborator',
    accountability_partner: 'Accountability',
  } as const;

  // Root is a plain View, not an entering-animated one.
  //
  // A Reanimated `entering` hands that view's position and size to the animation
  // driver. Fine for a view whose box never changes — wrong for this one, which
  // is the ANCESTOR of the friend rows. When a row expands to show its role
  // chips this container has to grow, and a layout-animated container doesn't
  // report the new height to the siblings below it. That's why the AI hint
  // stayed put.
  return (
    <View className="my-3 gap-4">
      <HudLabel color={c.textDim}>Add participants</HudLabel>
      <Text style={{ color: c.textFaint, fontSize: 12, lineHeight: 17, marginTop: 2 }}>
        Tap someone to bring them along. Collaborators share the tasks;
        accountability partners just see how you&apos;re doing.
      </Text>

      <View
        className="flex-row items-center rounded-xl px-4 py-3"
        style={{ backgroundColor: isDark ? '#20201f' : '#f6f7fb' }}>
        <Ionicons name="search" size={18} color="#767575" style={{ marginRight: 10 }} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search friends..."
          placeholderTextColor="#767575"
          className="flex-1 text-text-primary dark:text-text-dark"
        />
      </View>

      {filtered.length > 0 ? (
        <View className="gap-3">
          {filtered.map((friend) => {
            const selection = selectedFriends.find((s) => s.userId === friend.id);
            const isSelected = !!selection;

            return (
              // Plain View: the tap target and the role chips are SIBLINGS, not
              // nested pressables. Nesting would leave which one handles a chip
              // tap up to the touch responder, and losing that race removes the
              // friend instead of setting their role.
              <View
                key={friend.id}
                className="rounded-xl p-4"
                style={{
                  backgroundColor: isSelected
                    ? 'rgba(139,92,246,0.10)'
                    : isDark
                      ? '#20201f'
                      : '#f6f7fb',
                  borderWidth: 1,
                  borderColor: isSelected ? c.violet : 'transparent',
                }}>
                <AnimatedPressable
                  // The whole name row is the target now — it used to be inert,
                  // so tapping a friend's face did nothing at all.
                  onPress={() =>
                    onSelect(friend.id, isSelected ? null : 'accountability_partner')
                  }
                  scaleDown={0.98}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={
                    isSelected
                      ? `${friend.username}, added as ${ROLE_LABEL[selection.role]}. Tap to remove.`
                      : `Add ${friend.username}`
                  }
                  className="flex-row items-center">
                  <Image
                    source={{ uri: avatarUri(friend.profilePic, friend.username) }}
                    className="h-10 w-10 rounded-full bg-gray-200"
                  />
                  <View className="ml-3 flex-1">
                    <Text className="font-bold text-text-primary dark:text-text-dark">
                      {friend.username}
                    </Text>
                    <Text className="dark:text-text-dark-secondary text-xs text-text-secondary">
                      {friend.email}
                    </Text>
                  </View>
                  {/* Stands in for a checkbox — the row's state has to be
                      readable at a glance, not inferred from a chip's fill. */}
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                    size={24}
                    color={isSelected ? c.violet : c.textFaint}
                  />
                </AnimatedPressable>

                {/*
                  Role only matters once they're actually coming.

                  A plain View, not an entering-animated one: a Reanimated
                  `entering` on a conditionally mounted child hands its layout to
                  the animation, and the ancestors' measured height can stay
                  stale — so the content below the list wouldn't move down as
                  rows expanded. Not worth a 200ms fade.
                */}
                {isSelected && (
                  <View className="mt-3 flex-row gap-2">
                    {(['collaborator', 'accountability_partner'] as const).map((role) => {
                      const active = selection.role === role;
                      return (
                        <AnimatedPressable
                          key={role}
                          onPress={() => onSelect(friend.id, role)}
                          containerStyle={{ flex: 1 }}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: active }}
                          accessibilityLabel={`${ROLE_LABEL[role]} role for ${friend.username}`}
                          className="flex-row items-center justify-center gap-1.5 rounded-lg py-2"
                          style={{
                            backgroundColor: active ? c.violet : 'transparent',
                            // A visible edge is what makes these read as buttons
                            // rather than grey metadata tags.
                            borderWidth: 1,
                            borderColor: active ? c.violet : c.panelBorderStrong,
                          }}>
                          {active && <Ionicons name="checkmark" size={13} color="#fff" />}
                          <Text
                            style={{
                              fontSize: 12,
                              fontFamily: FONT.semibold,
                              color: active ? '#fff' : c.textDim,
                            }}>
                            {ROLE_LABEL[role]}
                          </Text>
                        </AnimatedPressable>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <Text className="py-4 text-center text-xs" style={{ color: '#767575' }}>
          No friends found
        </Text>
      )}
    </View>
  );
};

// ─── Media & Date Grid ────────────────────────────────────────────────

const MediaDateGrid = ({
  onImageSelect,
  deadline,
  onDatePress,
}: {
  onImageSelect: (uri: string) => void;
  deadline?: Date;
  onDatePress: () => void;
}) => {
  const isDark = useColorScheme() === 'dark';
  return (
    <Animated.View entering={FadeInDown.delay(100).duration(260)} className="flex-row gap-4">
      <View className="flex-1">
        <AddImageInput shape="banner" onImage={onImageSelect} />
      </View>
      <AnimatedPressable
        onPress={onDatePress}
        className="flex-1 items-start justify-center rounded-2xl border p-5"
        style={{
          backgroundColor: isDark ? '#20201f' : '#f6f7fb',
          borderColor: isDark ? 'rgba(72,72,71,0.2)' : 'rgba(0,0,0,0.05)',
        }}>
        <Text
          className="mb-1 text-[10px] font-bold uppercase tracking-widest"
          style={{ color: isDark ? '#adaaaa' : '#666' }}>
          Deadline
        </Text>
        <View className="flex-row items-center gap-2">
          <Ionicons name="calendar-outline" size={14} color={isDark ? '#fff' : '#1a1a1a'} />
          <Text className="text-sm font-semibold text-text-primary dark:text-text-dark">
            {deadline ? formatDate(deadline) : 'Set deadline'}
          </Text>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────

const NewShard = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = hud(isDark);
  const { addAlert } = useAppStore();
  const currentUserId = useUserStore((state) => state.user?.id);
  // Trial users get Pro access too (server treats an unexpired trial as pro).
  const isPro = useUserStore(
    (state) => state.user?.subscriptionTier === 'pro' || !!state.user?.isInTrial
  );
  const scrollRef = useRef<ScrollView>(null);

  // Free tier allows 1 collaborator per shard; Pro is unlimited. Server enforces
  // the source of truth — this is a client guard to trigger the paywall early.
  const FREE_COLLABORATOR_LIMIT = 1;

  // Steps are data, not a number — see hooks/useCreationSteps.ts.
  const wizard = useCreationSteps('ai');
  const { mode, setMode, step } = wizard;
  const [loading, setLoading] = useState(false); // AI generating
  const [selectedFriends, setSelectedFriends] = useState<SelectedFriend[]>([]);

  // Habit tracking
  const [isHabit, setIsHabit] = useState(false);
  const [cadence, setCadence] = useState<'daily' | 'weekly'>('daily');

  // AI mode state (isolated)
  const [aiGoal, setAiGoal] = useState('');
  const [aiDeadline, setAiDeadline] = useState<Date | undefined>(undefined);
  const [showAiDatePicker, setShowAiDatePicker] = useState(false);
  // Separate from the compose-step picker: this one writes to the DRAFT, which
  // is what commit actually reads. Sharing the compose picker would have set
  // local state nothing downstream looks at.
  const [shapeDatePicker, setShapeDatePicker] = useState(false);
  const [aiImageUri, setAiImageUri] = useState<string | null>(null);
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);

  // The draft owns everything the AI flow produces. Nothing is a real quest
  // until commit(), which is what makes the plan editable and what stops an
  // abandoned generation occupying a free-tier quest slot.
  const questDraft = useQuestDraft();
  const [answers, setAnswers] = useState<BriefAnswers>({});

  // Manual mode state (isolated)
  const [manualTitle, setManualTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualStartDate, setManualStartDate] = useState<Date | undefined>(undefined);
  const [manualEndDate, setManualEndDate] = useState<Date | undefined>(undefined);
  const [showManualDatePicker, setShowManualDatePicker] = useState(false);
  const [manualDateType, setManualDateType] = useState<'start' | 'end'>('start');
  const [manualImageUri, setManualImageUri] = useState<string | null>(null);
  const [manualImageUrl, setManualImageUrl] = useState<string | null>(null);
  const [miniGoalDrafts, setMiniGoalDrafts] = useState<MiniGoalDraft[]>([]);

  // Course mode state (isolated)
  const [courseGoal, setCourseGoal] = useState('');
  const [courseDeadline, setCourseDeadline] = useState<Date | undefined>(undefined);
  const [showCourseDatePicker, setShowCourseDatePicker] = useState(false);
  const [courseImageUri, setCourseImageUri] = useState<string | null>(null);
  const [courseImageUrl, setCourseImageUrl] = useState<string | null>(null);
  const [courseDraftId, setCourseDraftId] = useState<string | null>(null);
  const [courseCurriculum, setCourseCurriculum] = useState<CurriculumData | null>(null);
  const [courseNotice, setCourseNotice] = useState<string | undefined>(undefined);
  const [courseRhythm, setCourseRhythm] = useState<RhythmData>({
    days: [1, 3, 5],
    sessionMinutes: 30,
  });

  // AI credit count
  const [aiRemaining, setAiRemaining] = useState<number | null>(null);
  // 0 = free tier exhausted; -1 = unlimited (Pro). Gate AI generation on this.
  const outOfCredits = (mode === 'ai' || mode === 'course') && aiRemaining === 0;

  const { setFriends } = useFriendsStore();

  useQuery(GET_FRIENDS, {
    fetchPolicy: 'cache-and-network', // always show newly accepted friends
    onCompleted: (data) => {
      if (data?.getFriends?.success) setFriends(data.getFriends.friends);
    },
  });

  useQuery(GET_AI_USAGE, {
    skip: mode === 'manual',
    onCompleted: (data) => {
      if (data?.getAIUsage?.success) setAiRemaining(data.getAIUsage.remaining);
    },
  });

  const [createShardManual] = useMutation(CREATE_SHARD_MANUAL);
  const [importCurriculumMutation, { loading: importCurriculumLoading }] = useMutation(IMPORT_CURRICULUM);
  const [createShardFromCurriculumMutation, { loading: createCourseShardLoading }] = useMutation(CREATE_SHARD_FROM_CURRICULUM);
  const [fetchSignedUrl] = useLazyQuery(GET_SIGNED_UPLOAD_URL);

  const handleFriendSelect = (
    userId: string,
    role: 'collaborator' | 'accountability_partner' | null
  ) => {
    if (!role) {
      setSelectedFriends((prev) => prev.filter((f) => f.userId !== userId));
      return;
    }

    // Free-tier collaborator cap → paywall. Only counts the 'collaborator' role,
    // and ignores the case where the user is just switching an existing selection.
    if (!isPro && role === 'collaborator') {
      const alreadySelectedAsCollaborator = selectedFriends.some(
        (f) => f.userId === userId && f.role === 'collaborator'
      );
      const collaboratorCount = selectedFriends.filter((f) => f.role === 'collaborator').length;
      if (!alreadySelectedAsCollaborator && collaboratorCount >= FREE_COLLABORATOR_LIMIT) {
        openPaywall('collaborator_limit');
        return;
      }
    }

    setSelectedFriends((prev) => {
      const filtered = prev.filter((f) => f.userId !== userId);
      return [...filtered, { userId, role }];
    });
  };

  const uploadImage = async (localUri: string) => {
    try {
      const { data } = await fetchSignedUrl();
      const uploadInfo = data?.getSignedUploadUrl;
      if (!uploadInfo?.success || !uploadInfo?.params)
        throw new Error('Failed to get signed upload URL');

      const { uploadUrl, params } = uploadInfo;
      const fileName = localUri.split('/').pop() || 'upload.jpg';
      const form = new FormData();
      form.append('file', { uri: localUri, name: fileName, type: 'image/jpeg' } as any);
      form.append('api_key', params.apiKey);
      form.append('timestamp', params.timestamp.toString());
      form.append('signature', params.signature);
      form.append('public_id', params.publicId);
      form.append('folder', params.folder);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: form,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = await response.json();
      if (result.secure_url) return result.secure_url as string;
      throw new Error(result.error?.message || 'Upload failed');
    } catch (e: any) {
      addAlert({ str: `Image upload failed: ${e.message || 'Unknown error'}`, type: 'error' });
      return null;
    }
  };

  // ── AI flow ──

  /**
   * Goal → questions. Doesn't generate anything yet.
   *
   * The interview is best-effort: if it fails or returns nothing there's no
   * point showing an empty step, so we go straight to generating. Intake
   * improves the plan; it must never be a gate in front of it.
   */
  const handleAIContinue = async () => {
    if (outOfCredits) {
      openPaywall('ai_credits');
      return;
    }
    if (!aiGoal.trim()) {
      addAlert({ str: 'Please describe your goal', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const questions = await questDraft.loadQuestions(aiGoal, aiDeadline?.toISOString());
      if (questions.length === 0) {
        await generatePlan({});
        return;
      }
      wizard.next();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } finally {
      setLoading(false);
    }
  };

  /** Questions → plan. Spends the AI credit; still writes no quest. */
  const generatePlan = async (finalAnswers: BriefAnswers) => {
    wizard.goTo('shape');
    scrollRef.current?.scrollTo({ y: 0, animated: true });

    let imageUrl = aiImageUrl;
    if (aiImageUri && !aiImageUrl) {
      imageUrl = await uploadImage(aiImageUri);
      if (imageUrl) setAiImageUrl(imageUrl);
    }

    const res = await questDraft.generate({
      goal: aiGoal,
      deadline: aiDeadline?.toISOString(),
      image: imageUrl,
      participants: selectedFriends.map((f) => ({ user: f.userId, role: f.role })),
      questType: isHabit ? 'habit' : 'standard',
      cadence: isHabit ? cadence : undefined,
      answers: Object.keys(finalAnswers).length > 0 ? finalAnswers : undefined,
    });

    if (res?.needsUpgrade) {
      addAlert({ str: res.message, type: 'warning' });
      wizard.reset();
      openPaywall('ai_credits');
      return;
    }
    if (!res?.success) {
      addAlert({ str: res?.message || 'Failed to build your plan', type: 'error' });
      wizard.reset();
    }
  };

  /** Answers done → generate. Skipping records which slots were offered. */
  const handleSharpenContinue = () => generatePlan(answers);

  const handleSkipAll = () => {
    const skipped = questDraft.questions.map((q) => q.slot);
    setAnswers({ skipped });
    generatePlan({ skipped });
  };

  /** Make the draft real. */
  const handleCommit = async () => {
    const res = await questDraft.commit();
    if (res?.needsUpgrade) {
      addAlert({ str: res.message, type: 'warning' });
      openPaywall('shard_limit');
      return;
    }
    if (res?.success) {
      // `replace`, not `push`: the quest exists now, so leaving the creation
      // flow on the stack let Back walk into a wizard that would create another.
      router.replace('/Home');
    } else {
      addAlert({ str: res?.message || 'Failed to create quest', type: 'error' });
    }
  };

  // ── Manual flow ──

  const handleManualContinue = () => {
    if (!manualTitle.trim() || !manualDescription.trim()) {
      addAlert({ str: 'Please fill in title and description', type: 'error' });
      return;
    }
    wizard.next();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleManualCreate = async () => {
    setLoading(true);
    try {
      let imageUrl = manualImageUrl;
      if (manualImageUri && !manualImageUrl) {
        imageUrl = await uploadImage(manualImageUri);
        if (imageUrl) setManualImageUrl(imageUrl);
      }

      // Build miniGoals input — filter blanks
      const miniGoalsInput = miniGoalDrafts
        .filter((mg) => mg.title.trim())
        .map((mg) => ({
          title: mg.title.trim(),
          description: '',
          tasks: mg.tasks.filter((t) => t.trim()).map((t) => ({ title: t.trim() })),
        }));

      const { data } = await createShardManual({
        variables: {
          input: {
            title: manualTitle,
            description: manualDescription,
            timeline: {
              startDate: manualStartDate?.toISOString() || new Date().toISOString(),
              endDate: manualEndDate?.toISOString(),
            },
            participants: selectedFriends.map((f) => ({ user: f.userId, role: f.role })),
            rewards: [],
            image: imageUrl,
            miniGoals: miniGoalsInput,
            questType: isHabit ? 'habit' : 'standard',
            cadence: isHabit ? cadence : undefined,
          },
        },
      });

      if (data?.createShardManual?.success) {
        addAlert({ str: data.createShardManual.message, type: 'success' });
        // See handleAIConfirm — replace so Back can't re-enter the wizard.
        router.replace('/Home');
      } else {
        addAlert({
          str: data?.createShardManual?.message || 'Failed to create quest',
          type: 'error',
        });
      }
    } catch {
      addAlert({ str: 'Failed to create quest. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ── Course flow ──

  const handleCourseContinue = () => {
    if (outOfCredits) {
      openPaywall('ai_credits');
      return;
    }
    if (!courseGoal.trim()) {
      addAlert({ str: 'Please describe what you want to achieve with this course', type: 'error' });
      return;
    }
    wizard.next();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleCourseImport = async (data: CourseSourceData) => {
    if (outOfCredits) {
      openPaywall('ai_credits');
      return;
    }
    try {
      const res = await importCurriculumMutation({
        variables: {
          input: {
            url: data.url,
            pastedText: data.pastedText,
            goal: courseGoal.trim() || undefined,
          },
        },
      });

      const result = res.data?.importCurriculum;
      if (result?.needsUpgrade) {
        openPaywall('ai_credits');
        return;
      }
      if (result?.success && result.curriculum && result.draftId) {
        setCourseDraftId(result.draftId);
        setCourseCurriculum(result.curriculum);
        setCourseNotice(result.notice);
        wizard.next();
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        addAlert({
          str: result?.message || 'Failed to import curriculum',
          type: 'error',
        });
      }
    } catch (e: any) {
      addAlert({
        str: e.message || 'Failed to import curriculum',
        type: 'error',
      });
    }
  };

  const handleCourseCreateQuest = async () => {
    if (!courseCurriculum || !courseDraftId) return;

    let imageUrl: string | undefined = courseImageUrl || courseCurriculum.thumbnail || undefined;
    if (courseImageUri && !courseImageUrl) {
      const uploaded = await uploadImage(courseImageUri);
      if (uploaded) {
        imageUrl = uploaded;
        setCourseImageUrl(uploaded);
      }
    }

    try {
      const res = await createShardFromCurriculumMutation({
        variables: {
          input: {
            draftId: courseDraftId,
            curriculum: {
              provider: courseCurriculum.provider,
              fidelity: courseCurriculum.fidelity,
              title: courseCurriculum.title,
              author: courseCurriculum.author,
              url: courseCurriculum.url,
              thumbnail: courseCurriculum.thumbnail,
              totalSeconds: courseCurriculum.totalSeconds,
              fetchedAt: courseCurriculum.fetchedAt,
              sections: courseCurriculum.sections.map((sec) => ({
                title: sec.title,
                items: sec.items.map((item) => ({
                  kind: item.kind,
                  title: item.title,
                  durationSeconds: item.durationSeconds,
                  url: item.url,
                  externalId: item.externalId,
                  optional: item.optional,
                  synthesized: item.synthesized,
                })),
              })),
            },
            rhythm: {
              days: courseRhythm.days,
              sessionMinutes: courseRhythm.sessionMinutes,
              timeOfDay: courseRhythm.timeOfDay,
            },
            brief: {
              done: courseGoal,
              rhythm: {
                days: courseRhythm.days,
                sessionMinutes: courseRhythm.sessionMinutes,
                timeOfDay: courseRhythm.timeOfDay,
              },
            },
            image: imageUrl,
            participants: selectedFriends.map((f) => ({ user: f.userId, role: f.role })),
          },
        },
      });

      const result = res.data?.createShardFromCurriculum;
      if (result?.needsUpgrade) {
        openPaywall('shard_limit');
        return;
      }
      if (result?.success) {
        addAlert({ str: result.message || 'Course quest created!', type: 'success' });
        router.replace('/Home');
      } else {
        addAlert({ str: result?.message || 'Failed to start course quest', type: 'error' });
      }
    } catch (e: any) {
      addAlert({ str: e.message || 'Failed to start course quest', type: 'error' });
    }
  };

  const handleBack = () => {
    // One step, not all the way home — identical for today's two-step modes,
    // and correct for a three-step one.
    wizard.back();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // One place the primary action's words and icon are decided, since three
  // steps now share the pinned footer.
  const ctaLabel =
    step === 'sharpen'
      ? 'Build my plan'
      : step === 'shape'
        ? 'Start this quest'
        : outOfCredits
          ? 'Unlock AI · Go Pro'
          : mode === 'ai'
            ? 'Forge Quest'
            : mode === 'course'
              ? 'Continue to Source'
              : 'Continue';

  const ctaIcon: any =
    step === 'shape'
      ? 'checkmark-circle'
      : step === 'sharpen'
        ? 'flash'
        : outOfCredits
          ? 'lock-open'
          : mode === 'ai'
            ? 'flash'
            : 'arrow-forward';


  /**
   * How the quest runs and who's coming.
   *
   * Lives at the END of the flow for AI mode and on the first screen for manual.
   * These were the two biggest blocks on step one, in front of the single field
   * that actually matters — and participants in particular only make sense once
   * there's a plan to invite someone TO.
   */
  const renderQuestOptions = () => (
    <>
            {/* Habit Setting */}
            <View
              style={{
                marginBottom: 24,
                backgroundColor: isDark ? '#1a1a1a' : '#fff',
                borderRadius: RADIUS.lg,
                padding: 16,
                borderWidth: 1,
                borderColor: isDark ? '#2c2c2c' : '#eee',
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: isDark ? '#fff' : '#1a1a1a',
                      fontFamily: FONT.bold,
                      fontSize: 16,
                    }}>
                    Recurring Habit
                  </Text>
                  <Text style={{ color: '#767575', fontSize: 13, marginTop: 4 }}>
                    Automatically reset completed tasks on a scheduled interval.
                  </Text>
                </View>
                <AnimatedPressable onPress={() => setIsHabit(!isHabit)}>
                  <View
                    style={{
                      width: 46,
                      height: 26,
                      borderRadius: 13,
                      padding: 3,
                      backgroundColor: isHabit ? brand.violet : isDark ? '#333' : '#e5e7eb',
                    }}>
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: '#fff',
                        transform: [{ translateX: isHabit ? 20 : 0 }],
                      }}
                    />
                  </View>
                </AnimatedPressable>
              </View>

              {isHabit && (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  {(['daily', 'weekly'] as const).map((c) => (
                    <AnimatedPressable
                      key={c}
                      onPress={() => setCadence(c)}
                      containerStyle={{ flex: 1 }} style={{
                        paddingVertical: 12,
                        borderRadius: RADIUS.sm,
                        alignItems: 'center',
                        backgroundColor:
                          cadence === c
                            ? 'rgba(139,92,246,0.1)'
                            : isDark
                              ? '#2c2c2c'
                              : '#f8f8f8',
                        borderWidth: 1,
                        borderColor: cadence === c ? brand.violet : 'transparent',
                      }}>
                      <Text
                        style={{
                          color: cadence === c ? brand.violet : '#767575',
                          fontFamily: FONT.semibold,
                          textTransform: 'capitalize',
                        }}>
                        {c}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </Animated.View>
              )}
            </View>
            {/* Friends */}
            <View className="mt-6">
              <TeamQuickAssign
                isDark={isDark}
                onAssignTeam={(memberIds) => {
                  memberIds
                    .filter((id) => id !== currentUserId)
                    .forEach((id) => handleFriendSelect(id, 'collaborator'));
                }}
              />
              <FriendSelection
                selectedFriends={selectedFriends}
                onSelect={handleFriendSelect}
                isDark={isDark}
              />
            </View>
    </>
  );

  const glassStyle = {
    backgroundColor: c.panel,
    borderColor: c.panelBorder,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 22,
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: c.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <AnimatedPressable
            onPress={wizard.isFirst ? () => router.back() : handleBack}
            hitSlop={20}
            scaleDown={0.9}>
            <AntDesign name="arrowleft" size={22} color={c.textDim} />
          </AnimatedPressable>
          <View style={{ alignItems: 'center' }}>
            <HudLabel
              color={c.textFaint}
              size={12}>{`Step ${wizard.stepNumber} of ${wizard.totalSteps}`}</HudLabel>
            <Text style={{ fontFamily: FONT.extrabold, fontSize: 19, letterSpacing: -0.3, color: c.text, marginTop: 2 }}>
              {wizard.title}
            </Text>
          </View>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          className="flex-1 px-5"
          // The CTA is its own row below the scroll now, so this only needs
          // breathing room under the last card — not clearance for a button.
          contentContainerStyle={{ paddingBottom: 24 }}>
          <Animated.View entering={FadeIn.duration(400)}>
            <StepIndicator current={wizard.stepNumber} total={wizard.totalSteps} isDark={isDark} />

            {/* ─── STEP 1 ──────────────────────────────────── */}
            {step === 'compose' && (
              <>
                <ModeSelector mode={mode} onSelect={setMode} isDark={isDark} />

                {/* AI credit count */}
                {mode === 'ai' && aiRemaining !== null && (
                  <Animated.View entering={FadeIn.duration(200)}>
                    <AnimatedPressable
                      onPress={outOfCredits ? () => openPaywall('ai_credits') : undefined}
                      disabled={!outOfCredits}
                      scaleDown={outOfCredits ? 0.97 : 1}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 14,
                        gap: 6,
                      }}>
                      <Ionicons
                        name="flash"
                        size={13}
                        color={aiRemaining === 0 ? '#ef4444' : brand.violet}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          color: aiRemaining === 0 ? '#ef4444' : isDark ? '#adaaaa' : '#666',
                        }}>
                        {aiRemaining === -1
                          ? 'Unlimited AI calls (Pro)'
                          : aiRemaining === 0
                            ? 'No AI credits remaining'
                            : `${aiRemaining} AI credit${aiRemaining !== 1 ? 's' : ''} remaining`}
                      </Text>
                      {outOfCredits && (
                        <Text style={{ fontSize: 12, fontFamily: FONT.extrabold, color: brand.violet }}>
                          Upgrade →
                        </Text>
                      )}
                    </AnimatedPressable>
                  </Animated.View>
                )}

                {/* AI Form */}
                {mode === 'ai' && (
                  <View style={glassStyle}>
                    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: c.violet, opacity: 0.85 }} />
                    <HudLabel color={c.textDim} style={{ marginBottom: 12 }}>
                      What do you want to achieve?
                    </HudLabel>
                    <TextInput
                      value={aiGoal}
                      onChangeText={setAiGoal}
                      placeholder="e.g., Learn React Native and build a mobile app"
                      multiline
                      numberOfLines={4}
                      style={{
                        fontSize: 18,
                        fontFamily: FONT.semibold,
                        borderBottomWidth: 1.5,
                        borderBottomColor: aiGoal ? c.violet : c.panelBorderStrong,
                        paddingVertical: 12,
                        minHeight: 100,
                        color: c.text,
                      }}
                      placeholderTextColor={c.textFaint}
                      textAlignVertical="top"
                    />
                    <View className="mt-6">
                      <MediaDateGrid
                        onImageSelect={setAiImageUri}
                        deadline={aiDeadline}
                        onDatePress={() => setShowAiDatePicker(true)}
                      />
                    </View>
                  </View>
                )}

                {/* Course Form */}
                {mode === 'course' && (
                  <View style={glassStyle}>
                    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: c.violet, opacity: 0.85 }} />
                    <HudLabel color={c.textDim} style={{ marginBottom: 12 }}>
                      What do you want to learn or achieve?
                    </HudLabel>
                    <TextInput
                      value={courseGoal}
                      onChangeText={setCourseGoal}
                      placeholder="e.g., Master Full-Stack Web Development"
                      multiline
                      numberOfLines={4}
                      style={{
                        fontSize: 18,
                        fontFamily: FONT.semibold,
                        borderBottomWidth: 1.5,
                        borderBottomColor: courseGoal ? c.violet : c.panelBorderStrong,
                        paddingVertical: 12,
                        minHeight: 100,
                        color: c.text,
                      }}
                      placeholderTextColor={c.textFaint}
                      textAlignVertical="top"
                    />
                    <View className="mt-6">
                      <MediaDateGrid
                        onImageSelect={setCourseImageUri}
                        deadline={courseDeadline}
                        onDatePress={() => setShowCourseDatePicker(true)}
                      />
                    </View>
                  </View>
                )}

                {mode === 'manual' && renderQuestOptions()}

                {/* Manual Form */}
                {mode === 'manual' && (
                  <View style={glassStyle}>
                    <View
                      style={{
                        position: 'absolute',
                        top: -40,
                        right: -40,
                        width: 120,
                        height: 120,
                        borderRadius: 60,
                        backgroundColor: 'rgba(139,92,246,0.08)',
                      }}
                    />

                    <Text
                      className="mb-4 text-xs font-bold uppercase tracking-widest"
                      style={{ color: isDark ? '#adaaaa' : '#666' }}>
                      Quest Title
                    </Text>
                    <TextInput
                      value={manualTitle}
                      onChangeText={setManualTitle}
                      placeholder="Enter quest title"
                      style={{
                        fontSize: 18,
                        fontFamily: FONT.semibold,
                        borderBottomWidth: 2,
                        borderBottomColor: manualTitle ? brand.violet : isDark ? '#484847' : '#d1d5db',
                        paddingVertical: 12,
                        color: isDark ? '#fff' : '#1a1a1a',
                      }}
                      placeholderTextColor={isDark ? 'rgba(118,117,117,0.5)' : 'rgba(0,0,0,0.25)'}
                    />

                    <Text
                      className="mb-4 mt-6 text-xs font-bold uppercase tracking-widest"
                      style={{ color: isDark ? '#adaaaa' : '#666' }}>
                      Description
                    </Text>
                    <TextInput
                      value={manualDescription}
                      onChangeText={setManualDescription}
                      placeholder="Describe your quest..."
                      multiline
                      numberOfLines={4}
                      style={{
                        fontSize: 15,
                        borderBottomWidth: 2,
                        borderBottomColor: manualDescription
                          ? brand.violet
                          : isDark
                            ? '#484847'
                            : '#d1d5db',
                        paddingVertical: 12,
                        minHeight: 100,
                        color: isDark ? '#fff' : '#1a1a1a',
                      }}
                      placeholderTextColor={isDark ? 'rgba(118,117,117,0.5)' : 'rgba(0,0,0,0.25)'}
                      textAlignVertical="top"
                    />

                    <View className="mt-6">
                      <AddImageInput shape="banner" onImage={setManualImageUri} />
                    </View>

                    {/* Timeline */}
                    <Animated.View
                      entering={FadeInDown.delay(100).duration(260)}
                      className="mt-6 flex-row gap-3">
                      {(['start', 'end'] as const).map((type) => (
                        <AnimatedPressable
                          key={type}
                          onPress={() => {
                            setManualDateType(type);
                            setShowManualDatePicker(true);
                          }}
                          className="flex-1 items-start justify-center rounded-2xl border p-4"
                          style={{
                            backgroundColor: isDark ? '#20201f' : '#f6f7fb',
                            borderColor: isDark ? 'rgba(72,72,71,0.2)' : 'rgba(0,0,0,0.05)',
                          }}>
                          <Text
                            className="mb-1 text-[10px] font-bold uppercase tracking-widest"
                            style={{ color: isDark ? '#adaaaa' : '#666' }}>
                            {type === 'start' ? 'Start' : 'End'}
                          </Text>
                          <View className="flex-row items-center gap-2">
                            <Ionicons
                              name="calendar-outline"
                              size={14}
                              color={isDark ? '#fff' : '#1a1a1a'}
                            />
                            <Text className="text-sm font-semibold text-text-primary dark:text-text-dark">
                              {type === 'start'
                                ? manualStartDate
                                  ? formatDate(manualStartDate)
                                  : 'Set date'
                                : manualEndDate
                                  ? formatDate(manualEndDate)
                                  : 'Set date'}
                            </Text>
                          </View>
                        </AnimatedPressable>
                      ))}
                    </Animated.View>
                  </View>
                )}

                {/*
                  AI hint — a plain View for the same reason as the participants
                  container above it: this sits BELOW content that changes size,
                  so it has to be free to be pushed down. An `entering` animation
                  owns its position, and an owned position doesn't get pushed.
                */}
                {mode === 'ai' && (
                  <View
                    className="mt-6 flex-row items-start gap-3 rounded-2xl border p-4"
                    style={{
                      borderColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)',
                      backgroundColor: isDark ? 'rgba(139,92,246,0.05)' : 'rgba(139,92,246,0.04)',
                    }}>
                    <Ionicons name="sparkles" size={18} color="#8b5cf6" />
                    <Text
                      className="flex-1 text-xs leading-5"
                      style={{ color: isDark ? '#adaaaa' : '#666' }}>
                      Our AI will break down your goal into manageable steps, suggest resources, and
                      set up a personalised timeline.
                    </Text>
                  </View>
                )}

                {mode === 'course' && (
                  <View
                    className="mt-6 flex-row items-start gap-3 rounded-2xl border p-4"
                    style={{
                      borderColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)',
                      backgroundColor: isDark ? 'rgba(139,92,246,0.05)' : 'rgba(139,92,246,0.04)',
                    }}>
                    <Ionicons name="book-outline" size={18} color="#8b5cf6" />
                    <Text
                      className="flex-1 text-xs leading-5"
                      style={{ color: isDark ? '#adaaaa' : '#666' }}>
                      Import a course from YouTube, Udemy, Coursera, or a syllabus and turn it into a paced study plan.
                    </Text>
                  </View>
                )}

              </>
            )}

            {/* ─── SHARPEN (AI) — the interview ─────────── */}
            {step === 'sharpen' && (
              <SharpenStep
                questions={questDraft.questions}
                answers={answers}
                onChange={setAnswers}
                onSkipAll={handleSkipAll}
                isDark={isDark}
              />
            )}

            {/* ─── SHAPE (AI) — generation lands here, then edit ─── */}
            {step === 'shape' && questDraft.generating && (
              <GeneratingView
                phases={questDraft.streamedPhases}
                onCancel={() => wizard.reset()}
                isDark={isDark}
              />
            )}

            {step === 'shape' && !questDraft.generating && questDraft.plan && (
              <>
                <ShapeWorkspace
                  plan={questDraft.plan}
                  warning={questDraft.warning}
                  onEdit={questDraft.applyEdit}
                  isDark={isDark}
                  busy={questDraft.refining}
                  // Both fixes change inputs the scheduler reads at commit, so
                  // they're real levers — but neither re-runs the model, so the
                  // warning text stays as generated until the next refinement.
                  onChangeDeadline={() => setShapeDatePicker(true)}
                  onChangeRhythm={
                    questDraft.questions.some((q) => q.slot === 'rhythm')
                      ? () => {
                          wizard.goTo('sharpen');
                          scrollRef.current?.scrollTo({ y: 0, animated: true });
                        }
                      : undefined
                  }
                />
                <RefineBar
                  refinements={questDraft.draft?.refinements ?? []}
                  remaining={questDraft.draft?.refinementsRemaining ?? 0}
                  changes={questDraft.changes}
                  canUndo={!!questDraft.draft?.canUndo}
                  busy={questDraft.refining}
                  onRefine={async (instruction) => {
                    const res = await questDraft.refine(instruction);
                    if (res && !res.success && res.message) {
                      addAlert({ str: res.message, type: 'warning' });
                    }
                  }}
                  onUndo={questDraft.undo}
                  onDismissChanges={questDraft.clearChanges}
                  isDark={isDark}
                />
                {/* Below the plan and the refine box: these are decisions about
                    a plan that now exists, not preconditions for making one. */}
                {renderQuestOptions()}
              </>
            )}

            {/* ─── COURSE MODE STEPS ───────────────────────── */}
            {step === 'source' && (
              <CourseSourceStep
                goal={courseGoal}
                onImport={handleCourseImport}
                loading={importCurriculumLoading}
                notice={courseNotice}
                isDark={isDark}
              />
            )}

            {step === 'curriculumReview' && courseCurriculum && (
              <CurriculumReviewStep
                curriculum={courseCurriculum}
                onChange={setCourseCurriculum}
                onProceed={() => {
                  wizard.next();
                  scrollRef.current?.scrollTo({ y: 0, animated: true });
                }}
                isDark={isDark}
              />
            )}

            {step === 'pace' && courseCurriculum && courseDraftId && (
              <CoursePaceStep
                draftId={courseDraftId}
                curriculum={courseCurriculum}
                rhythm={courseRhythm}
                deadline={courseDeadline?.toISOString()}
                onChangeRhythm={setCourseRhythm}
                onCreateQuest={handleCourseCreateQuest}
                loading={createCourseShardLoading}
                isDark={isDark}
              />
            )}

            {/* ─── STEP 2 (Manual) — Mini-Goal Builder ───── */}
            {step === 'minigoals' && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <View style={glassStyle}>
                  <MiniGoalBuilder
                    miniGoals={miniGoalDrafts}
                    onChange={setMiniGoalDrafts}
                    isDark={isDark}
                  />
                </View>

                <Animated.View
                  entering={FadeInDown.delay(150).duration(260)}
                  style={{ marginTop: 24 }}>
                  <AnimatedPressable
                    onPress={handleManualCreate}
                    disabled={loading}
                    scaleDown={0.95}
                    className="flex-row items-center justify-center gap-3 py-4"
                    style={{
                      backgroundColor: c.violet,
                      borderRadius: RADIUS.md,
                      shadowColor: '#7c3aed',
                      shadowOpacity: 0.35,
                      shadowRadius: 14,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: 6,
                      opacity: loading ? 0.7 : 1,
                    }}>
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={{ color: '#fff', fontFamily: FONT.bold, fontSize: 15 }}>Create quest</Text>
                      </>
                    )}
                  </AnimatedPressable>

                  {/* Skip hint */}
                  <Text
                    style={{
                      textAlign: 'center',
                      color: isDark ? '#555' : '#bbb',
                      fontSize: 12,
                      marginTop: 12,
                    }}>
                    You can skip mini-goals and add them later
                  </Text>
                </Animated.View>
              </Animated.View>
            )}
          </Animated.View>
        </ScrollView>

        {/*
          Primary action, pinned to the screen rather than the end of the scroll.
          In the flow it sat below the friend picker, so it drifted up and down
          as that list expanded and could land mid-screen — and reaching the main
          action meant scrolling past everything optional.
        */}
        {(step === 'compose' || step === 'sharpen' || step === 'shape') && (
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 12,
              backgroundColor: c.bg,
              borderTopWidth: 1,
              borderTopColor: c.panelBorder,
            }}>
            <AnimatedPressable
              onPress={
                step === 'sharpen'
                  ? handleSharpenContinue
                  : step === 'shape'
                    ? handleCommit
                    : mode === 'ai'
                      ? handleAIContinue
                      : mode === 'course'
                        ? handleCourseContinue
                        : handleManualContinue
              }
              disabled={
                loading ||
                questDraft.generating ||
                questDraft.committing ||
                // Committing an empty plan is the one thing the workspace can
                // reach that the server would reject.
                (step === 'shape' && !questDraft.plan?.miniQuests.length)
              }
              scaleDown={0.95}
              accessibilityRole="button"
              accessibilityLabel={ctaLabel}
              className="flex-row items-center justify-center gap-3 py-4"
              style={{
                backgroundColor: c.violet,
                borderRadius: RADIUS.md,
                shadowColor: '#7c3aed',
                shadowOpacity: 0.35,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
                opacity: loading || questDraft.generating || questDraft.committing ? 0.7 : 1,
              }}>
              {loading || questDraft.committing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name={ctaIcon} size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontFamily: FONT.bold, fontSize: 15 }}>
                    {ctaLabel}
                  </Text>
                </>
              )}
            </AnimatedPressable>

            {/* Shaping is optional — the plan is committable the moment it lands. */}
            {step === 'sharpen' && (
              <Text
                style={{
                  textAlign: 'center',
                  color: c.textFaint,
                  fontSize: 12,
                  marginTop: 10,
                }}>
                Every question is optional
              </Text>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {shapeDatePicker && (
        <DateTimePicker
          value={
            questDraft.draft?.deadline ? new Date(questDraft.draft.deadline) : new Date()
          }
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={new Date()}
          onChange={(_, d) => {
            setShapeDatePicker(Platform.OS === 'ios');
            if (d) questDraft.applyEdit({ op: 'setDeadline', dueDate: String(d.getTime()) });
          }}
        />
      )}

      {showAiDatePicker && (
        <DateTimePicker
          value={aiDeadline || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_, d) => {
            setShowAiDatePicker(Platform.OS === 'ios');
            if (d) setAiDeadline(d);
          }}
          minimumDate={new Date()}
        />
      )}

      {showManualDatePicker && (
        <DateTimePicker
          value={
            manualDateType === 'start' ? manualStartDate || new Date() : manualEndDate || new Date()
          }
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_, d) => {
            setShowManualDatePicker(Platform.OS === 'ios');
            if (d) {
              if (manualDateType === 'start') setManualStartDate(d);
              else setManualEndDate(d);
            }
          }}
          minimumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
};

export default NewShard;
