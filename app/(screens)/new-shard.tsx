import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  useColorScheme,
  ActivityIndicator,
  TouchableOpacity,
  Animated as RNAnimated,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useMutation, useLazyQuery, useQuery } from '@apollo/client';
import { useUserStore } from '~/store/user.store';
import { useAppStore } from '~/store/app.store';
import { CREATE_SHARD, CREATE_SHARD_MANUAL, DELETE_MINI_GOAL } from '~/Graphql/Mutations';
import { GET_FRIENDS, GET_SIGNED_UPLOAD_URL, GET_AI_USAGE, MY_TEAMS } from '~/Graphql/Queries';
import { useFriendsStore, Friend } from '~/store/friends.store';
import AddImageInput from '~/components/AddImageInput';
import AnimatedPressable from '~/components/AnimatedPressable';

type CreationMode = 'ai' | 'manual';

interface SelectedFriend {
  userId: string;
  role: 'collaborator' | 'accountability_partner';
}

interface MiniGoalDraft {
  id: string;
  title: string;
  tasks: string[];
}

interface MiniGoalPreview {
  id: string;
  title: string;
  taskCount: number;
  dueDate?: string | null;
}

const AI_STATUS_MESSAGES = [
  'Analysing your goal...',
  'Breaking into mini-quests...',
  'Scheduling tasks...',
  'Assigning XP rewards...',
  'Finalising your quest...',
];

// ─── Helpers ─────────────────────────────────────────────────────────

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatDueDate = (iso?: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ─── Step Indicator ──────────────────────────────────────────────────

const StepIndicator = ({ step, isDark }: { step: 1 | 2; isDark: boolean }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    }}>
    {[1, 2].map((s, i) => (
      <React.Fragment key={s}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: step >= s ? '#8b5cf6' : isDark ? '#2c2c2c' : '#e5e7eb',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text
            style={{
              color: step >= s ? '#fff' : isDark ? '#666' : '#999',
              fontSize: 12,
              fontWeight: '700',
            }}>
            {s}
          </Text>
        </View>
        {i === 0 && (
          <View
            style={{
              width: 40,
              height: 2,
              backgroundColor: step === 2 ? '#8b5cf6' : isDark ? '#2c2c2c' : '#e5e7eb',
              marginHorizontal: 6,
            }}
          />
        )}
      </React.Fragment>
    ))}
  </View>
);

// ─── Mode Selector ───────────────────────────────────────────────────

const ModeSelector = ({
  mode,
  onSelect,
  isDark,
}: {
  mode: CreationMode;
  onSelect: (m: CreationMode) => void;
  isDark: boolean;
}) => (
  <View
    className="mb-6 flex-row gap-3 rounded-2xl p-1.5"
    style={{ backgroundColor: isDark ? '#131313' : '#f0f0f0' }}>
    {(['ai', 'manual'] as const).map((m) => (
      <AnimatedPressable
        key={m}
        onPress={() => onSelect(m)}
        className="flex-1 flex-row items-center justify-center rounded-xl px-4 py-3.5"
        style={
          mode === m
            ? {
                backgroundColor: isDark ? '#2c2c2c' : '#fff',
                shadowColor: '#8b5cf6',
                shadowOpacity: 0.1,
                shadowRadius: 15,
                elevation: 3,
              }
            : {}
        }>
        {m === 'ai' ? (
          <Ionicons
            name="sparkles"
            size={16}
            color={mode === 'ai' ? '#8b5cf6' : '#767575'}
            style={{ marginRight: 6 }}
          />
        ) : (
          <MaterialIcons
            name="edit"
            size={16}
            color={mode === 'manual' ? '#8b5cf6' : '#767575'}
            style={{ marginRight: 6 }}
          />
        )}
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: mode === m ? '#8b5cf6' : isDark ? '#adaaaa' : '#666',
          }}>
          {m === 'ai' ? 'AI-Assisted' : 'Manual'}
        </Text>
      </AnimatedPressable>
    ))}
  </View>
);

// ─── AI Loading Overlay ──────────────────────────────────────────────

const AILoadingView = ({ isDark, onCancel }: { isDark: boolean; onCancel: () => void }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const cycle = setInterval(() => setMsgIndex((i) => (i + 1) % AI_STATUS_MESSAGES.length), 2500);
    const timeout = setTimeout(() => setTimedOut(true), 30000);
    return () => {
      clearInterval(cycle);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 24,
      }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: 'rgba(139,92,246,0.12)',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}>
        <ActivityIndicator color="#8b5cf6" size="large" />
      </View>
      <Text style={{ color: '#8b5cf6', fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
        Generating your Quest
      </Text>
      <Text style={{ color: isDark ? '#adaaaa' : '#888', fontSize: 13, textAlign: 'center' }}>
        {timedOut ? 'Taking longer than expected…' : AI_STATUS_MESSAGES[msgIndex]}
      </Text>
      {timedOut && (
        <AnimatedPressable
          onPress={onCancel}
          style={{
            marginTop: 20,
            paddingHorizontal: 24,
            paddingVertical: 10,
            borderRadius: 20,
            backgroundColor: isDark ? '#2c2c2c' : '#f0f0f0',
          }}>
          <Text style={{ color: isDark ? '#fff' : '#1a1a1a', fontWeight: '600', fontSize: 13 }}>
            Cancel
          </Text>
        </AnimatedPressable>
      )}
    </Animated.View>
  );
};

// ─── AI Review Step ──────────────────────────────────────────────────

const AIReviewStep = ({
  miniGoals,
  onRemove,
  onConfirm,
  onRegenerate,
  isDark,
  confirming,
  warning,
}: {
  miniGoals: MiniGoalPreview[];
  onRemove: (id: string) => void;
  onConfirm: () => void;
  onRegenerate: () => void;
  isDark: boolean;
  confirming: boolean;
  warning?: string | null;
}) => (
  <Animated.View entering={FadeInDown.duration(400)}>
    <Text
      style={{
        color: isDark ? '#adaaaa' : '#666',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 16,
      }}>
      Your AI Quest Breakdown
    </Text>

    {warning && (
      <Animated.View
        entering={FadeInDown.duration(300)}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
          backgroundColor: isDark ? 'rgba(234,179,8,0.1)' : 'rgba(234,179,8,0.08)',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(234,179,8,0.25)' : 'rgba(234,179,8,0.2)',
          padding: 12,
          marginBottom: 16,
        }}>
        <Ionicons name="warning-outline" size={16} color="#eab308" style={{ marginTop: 1 }} />
        <Text
          style={{ flex: 1, color: isDark ? '#fde68a' : '#92400e', fontSize: 12, lineHeight: 18 }}>
          {warning}
        </Text>
      </Animated.View>
    )}

    <Text
      style={{ color: isDark ? '#666' : '#999', fontSize: 12, marginBottom: 20, lineHeight: 18 }}>
      Review the steps your AI generated. Remove any you don't need, then confirm.
    </Text>

    {miniGoals.map((mg, i) => (
      <Animated.View
        key={mg.id}
        entering={FadeInDown.delay(i * 60).duration(350)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isDark ? '#1a1a1a' : '#f6f7fb',
          borderRadius: 16,
          padding: 16,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)',
        }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: 'rgba(139,92,246,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}>
          <Text style={{ color: '#8b5cf6', fontWeight: '800', fontSize: 13 }}>{i + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: isDark ? '#fff' : '#1a1a1a',
              fontWeight: '600',
              fontSize: 14,
              marginBottom: 2,
            }}>
            {mg.title}
          </Text>
          <Text style={{ color: isDark ? '#666' : '#999', fontSize: 12 }}>
            {mg.taskCount} task{mg.taskCount !== 1 ? 's' : ''}
            {mg.dueDate ? `  ·  Due ${formatDueDate(mg.dueDate)}` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => onRemove(mg.id)} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name="close-circle" size={22} color={isDark ? '#444' : '#ccc'} />
        </TouchableOpacity>
      </Animated.View>
    ))}

    {miniGoals.length === 0 && (
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Text style={{ color: isDark ? '#555' : '#bbb', fontSize: 13 }}>
          All mini-goals removed.
        </Text>
      </View>
    )}

    {/* Regenerate */}
    <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 24 }}>
      <AnimatedPressable
        onPress={onRegenerate}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}>
        <Ionicons name="refresh" size={14} color="#8b5cf6" />
        <Text style={{ color: '#8b5cf6', fontSize: 13, fontWeight: '600' }}>Regenerate</Text>
      </AnimatedPressable>
      <Text style={{ color: isDark ? '#555' : '#bbb', fontSize: 11, marginTop: 5 }}>
        This will use 1 AI credit and take you back to edit your goal
      </Text>
    </View>

    {/* Confirm */}
    <AnimatedPressable
      onPress={onConfirm}
      disabled={confirming}
      scaleDown={0.95}
      style={{
        backgroundColor: '#8b5cf6',
        borderRadius: 18,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8b5cf6',
        shadowOpacity: 0.3,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        opacity: confirming ? 0.7 : 1,
      }}>
      {confirming ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
          Confirm & Save Quest →
        </Text>
      )}
    </AnimatedPressable>
  </Animated.View>
);

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
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 1.2,
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
          entering={FadeInDown.delay(idx * 50).duration(300)}
          style={{
            backgroundColor: isDark ? '#1a1a1a' : '#f6f7fb',
            borderRadius: 16,
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
                borderRadius: 8,
                backgroundColor: 'rgba(139,92,246,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}>
              <Text style={{ color: '#8b5cf6', fontWeight: '700', fontSize: 12 }}>{idx + 1}</Text>
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
                fontWeight: '600',
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
            <TouchableOpacity onPress={() => removeGoal(mg.id)} hitSlop={10}>
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
                      backgroundColor: '#8b5cf6',
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
                    <TouchableOpacity onPress={() => removeTask(mg.id, ti)} hitSlop={10}>
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
                <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
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
          borderRadius: 14,
          paddingVertical: 14,
          gap: 8,
        }}>
        <Ionicons name="add-circle-outline" size={18} color="#8b5cf6" />
        <Text style={{ color: '#8b5cf6', fontWeight: '600', fontSize: 13 }}>Add Mini-Goal</Text>
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

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ marginBottom: 16 }}>
      <AnimatedPressable
        onPress={() => setExpanded(!expanded)}
        scaleDown={0.98}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 14,
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
        <Text style={{ flex: 1, color: '#8b5cf6', fontWeight: '600', fontSize: 13 }}>
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
                borderRadius: 14,
                padding: 12,
              }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: 'rgba(139,92,246,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                <Ionicons name="people" size={18} color="#8b5cf6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#fff' : '#1a1a1a' }}>
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
    </Animated.View>
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

  return (
    <Animated.View entering={FadeInDown.delay(300).duration(400)} className="my-3 space-y-4">
      <Text
        className="text-xs font-bold uppercase tracking-widest"
        style={{ color: isDark ? '#adaaaa' : '#666' }}>
        Add Participants
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
        <View className="space-y-3">
          {filtered.map((friend) => {
            const selection = selectedFriends.find((s) => s.userId === friend.id);
            return (
              <View
                key={friend.id}
                className="rounded-xl p-4"
                style={{ backgroundColor: isDark ? '#20201f' : '#f6f7fb' }}>
                <View className="mb-3 flex-row items-center">
                  <Image
                    source={{ uri: friend.profilePic }}
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
                </View>
                <View className="flex-row gap-2">
                  {(['collaborator', 'accountability_partner'] as const).map((role) => (
                    <AnimatedPressable
                      key={role}
                      onPress={() => onSelect(friend.id, selection?.role === role ? null : role)}
                      className="flex-1 items-center justify-center rounded-lg py-2"
                      style={{
                        backgroundColor:
                          selection?.role === role ? '#8b5cf6' : isDark ? '#262626' : '#e5e7eb',
                      }}>
                      <Text
                        className="text-xs font-bold"
                        style={{
                          color: selection?.role === role ? '#fff' : isDark ? '#fff' : '#1a1a1a',
                        }}>
                        {role === 'collaborator' ? 'Collaborator' : 'Accountability'}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Text className="py-4 text-center text-xs" style={{ color: '#767575' }}>
          No friends found
        </Text>
      )}
    </Animated.View>
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
    <Animated.View entering={FadeInDown.delay(100).duration(400)} className="flex-row gap-4">
      <View className="flex-1">
        <AddImageInput onImage={onImageSelect} />
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
  const { addAlert } = useAppStore();
  const currentUserId = useUserStore((state) => state.user?.id);
  const scrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<CreationMode>('ai');
  const [loading, setLoading] = useState(false); // AI generating
  const [confirming, setConfirming] = useState(false); // saving after review
  const [selectedFriends, setSelectedFriends] = useState<SelectedFriend[]>([]);

  // Habit tracking
  const [isHabit, setIsHabit] = useState(false);
  const [cadence, setCadence] = useState<'daily' | 'weekly'>('daily');

  // AI mode state (isolated)
  const [aiGoal, setAiGoal] = useState('');
  const [aiDeadline, setAiDeadline] = useState<Date | undefined>(undefined);
  const [showAiDatePicker, setShowAiDatePicker] = useState(false);
  const [aiImageUri, setAiImageUri] = useState<string | null>(null);
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);

  // AI review state
  const [pendingShardId, setPendingShardId] = useState<string | null>(null);
  const [reviewMiniGoals, setReviewMiniGoals] = useState<MiniGoalPreview[]>([]);

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

  // AI credit count
  const [aiRemaining, setAiRemaining] = useState<number | null>(null);
  const [aiWarning, setAiWarning] = useState<string | null>(null);

  const { setFriends } = useFriendsStore();

  useQuery(GET_FRIENDS, {
    fetchPolicy: 'cache-and-network', // always show newly accepted friends
    onCompleted: (data) => {
      if (data?.getFriends?.success) setFriends(data.getFriends.friends);
    },
  });

  useQuery(GET_AI_USAGE, {
    skip: mode !== 'ai',
    onCompleted: (data) => {
      if (data?.getAIUsage?.success) setAiRemaining(data.getAIUsage.remaining);
    },
  });

  const [createShard] = useMutation(CREATE_SHARD);
  const [createShardManual] = useMutation(CREATE_SHARD_MANUAL);
  const [deleteMiniGoal] = useMutation(DELETE_MINI_GOAL);
  const [fetchSignedUrl] = useLazyQuery(GET_SIGNED_UPLOAD_URL);

  const handleFriendSelect = (
    userId: string,
    role: 'collaborator' | 'accountability_partner' | null
  ) => {
    if (!role) {
      setSelectedFriends((prev) => prev.filter((f) => f.userId !== userId));
    } else {
      setSelectedFriends((prev) => {
        const filtered = prev.filter((f) => f.userId !== userId);
        return [...filtered, { userId, role }];
      });
    }
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

  const handleAIContinue = async () => {
    if (!aiGoal.trim()) {
      addAlert({ str: 'Please describe your goal', type: 'error' });
      return;
    }
    // Move to step 2 immediately so the AILoadingView is visible during generation
    setLoading(true);
    setStep(2);
    setAiWarning(null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    try {
      let imageUrl = aiImageUrl;
      if (aiImageUri && !aiImageUrl) {
        imageUrl = await uploadImage(aiImageUri);
        if (imageUrl) setAiImageUrl(imageUrl);
      }

      const { data } = await createShard({
        variables: {
          goal: aiGoal,
          deadline: aiDeadline?.toISOString(),
          image: imageUrl,
          participants: selectedFriends.map((f) => ({ user: f.userId, role: f.role })),
          questType: isHabit ? 'habit' : 'standard',
          cadence: isHabit ? cadence : undefined,
        },
      });

      if (data?.createShard?.needsUpgrade) {
        addAlert({ str: data.createShard.message, type: 'warning' });
        setStep(1);
        return;
      }

      if (data?.createShard?.success) {
        if (data.createShard.aiCallsRemaining !== undefined)
          setAiRemaining(data.createShard.aiCallsRemaining);
        setPendingShardId(data.createShard.shard?.id);
        setReviewMiniGoals(data.createShard.shard?.miniGoals || []);
        if (data.createShard.warning) setAiWarning(data.createShard.warning);
      } else {
        addAlert({ str: data?.createShard?.message || 'Failed to create quest', type: 'error' });
        setStep(1);
      }
    } catch (err: any) {
      addAlert({ str: err?.message || 'Failed to create quest. Please try again.', type: 'error' });
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleAIConfirm = () => {
    // Quest already saved in DB — just navigate
    router.push('/Home');
  };

  const handleAIRegenerate = async () => {
    // Go back to step 1 so user can re-submit
    setStep(1);
    setReviewMiniGoals([]);
    setPendingShardId(null);
  };

  // ── Manual flow ──

  const handleManualContinue = () => {
    if (!manualTitle.trim() || !manualDescription.trim()) {
      addAlert({ str: 'Please fill in title and description', type: 'error' });
      return;
    }
    setStep(2);
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
        router.push('/Home');
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

  const handleBack = () => {
    setStep(1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const glassStyle = {
    backgroundColor: isDark ? 'rgba(26, 26, 26, 0.6)' : 'rgba(255, 255, 255, 0.8)',
    borderColor: isDark ? 'rgba(72,72,71,0.15)' : 'rgba(0,0,0,0.06)',
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
  };

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <AnimatedPressable
            onPress={step === 2 ? handleBack : () => router.back()}
            hitSlop={20}
            scaleDown={0.9}>
            <AntDesign name="arrowleft" size={24} color={isDark ? '#8b5cf6' : '#1a1a1a'} />
          </AnimatedPressable>
          <Text className="text-2xl font-bold tracking-tight" style={{ color: '#8b5cf6' }}>
            {step === 1 ? 'New Quest' : mode === 'ai' ? 'Review' : 'Mini-Goals'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 80 }}>
          <Animated.View entering={FadeIn.duration(400)}>
            <StepIndicator step={step} isDark={isDark} />

            {/* ─── STEP 1 ──────────────────────────────────── */}
            {step === 1 && (
              <>
                <ModeSelector mode={mode} onSelect={setMode} isDark={isDark} />

                {/* Habit Setting */}
                <View
                  style={{
                    marginBottom: 24,
                    backgroundColor: isDark ? '#1a1a1a' : '#fff',
                    borderRadius: 20,
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
                          fontWeight: '700',
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
                          backgroundColor: isHabit ? '#8b5cf6' : isDark ? '#333' : '#e5e7eb',
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
                          style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 12,
                            alignItems: 'center',
                            backgroundColor:
                              cadence === c
                                ? 'rgba(139,92,246,0.1)'
                                : isDark
                                  ? '#2c2c2c'
                                  : '#f8f8f8',
                            borderWidth: 1,
                            borderColor: cadence === c ? '#8b5cf6' : 'transparent',
                          }}>
                          <Text
                            style={{
                              color: cadence === c ? '#8b5cf6' : '#767575',
                              fontWeight: '600',
                              textTransform: 'capitalize',
                            }}>
                            {c}
                          </Text>
                        </AnimatedPressable>
                      ))}
                    </Animated.View>
                  )}
                </View>

                {/* AI credit count */}
                {mode === 'ai' && aiRemaining !== null && (
                  <Animated.View entering={FadeInDown.duration(300)}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 14,
                        gap: 6,
                      }}>
                      <Ionicons
                        name="flash"
                        size={13}
                        color={aiRemaining === 0 ? '#ef4444' : '#8b5cf6'}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          color: aiRemaining === 0 ? '#ef4444' : isDark ? '#adaaaa' : '#666',
                        }}>
                        {aiRemaining === -1
                          ? 'Unlimited AI calls (Pro)'
                          : aiRemaining === 0
                            ? 'No AI credits remaining — upgrade to Pro'
                            : `${aiRemaining} AI credit${aiRemaining !== 1 ? 's' : ''} remaining`}
                      </Text>
                    </View>
                  </Animated.View>
                )}

                {/* AI Form */}
                {mode === 'ai' && (
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
                      What do you want to achieve?
                    </Text>
                    <TextInput
                      value={aiGoal}
                      onChangeText={setAiGoal}
                      placeholder="e.g., Learn React Native and build a mobile app"
                      multiline
                      numberOfLines={4}
                      style={{
                        fontSize: 18,
                        fontWeight: '600',
                        borderBottomWidth: 2,
                        borderBottomColor: aiGoal ? '#8b5cf6' : isDark ? '#484847' : '#d1d5db',
                        paddingVertical: 12,
                        minHeight: 100,
                        color: isDark ? '#fff' : '#1a1a1a',
                      }}
                      placeholderTextColor={isDark ? 'rgba(118,117,117,0.5)' : 'rgba(0,0,0,0.25)'}
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
                        fontWeight: '600',
                        borderBottomWidth: 2,
                        borderBottomColor: manualTitle ? '#8b5cf6' : isDark ? '#484847' : '#d1d5db',
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
                          ? '#8b5cf6'
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
                      <AddImageInput onImage={setManualImageUri} />
                    </View>

                    {/* Timeline */}
                    <Animated.View
                      entering={FadeInDown.delay(100).duration(400)}
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

                {/* AI hint */}
                {mode === 'ai' && (
                  <Animated.View
                    entering={FadeInDown.delay(350).duration(400)}
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
                  </Animated.View>
                )}

                {/* CTA Step 1 */}
                <Animated.View entering={FadeInDown.delay(400).duration(400)} className="mt-10">
                  <AnimatedPressable
                    onPress={mode === 'ai' ? handleAIContinue : handleManualContinue}
                    disabled={loading}
                    scaleDown={0.95}
                    className="flex-row items-center justify-center gap-3 rounded-2xl py-5"
                    style={{
                      backgroundColor: '#8b5cf6',
                      shadowColor: '#8b5cf6',
                      shadowOpacity: 0.3,
                      shadowRadius: 20,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: 8,
                      opacity: loading ? 0.7 : 1,
                    }}>
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons
                          name={mode === 'ai' ? 'flash' : 'arrow-forward'}
                          size={20}
                          color="#fff"
                        />
                        <Text className="text-lg font-extrabold text-white">
                          {mode === 'ai' ? 'Generate Quest with AI' : 'Continue →'}
                        </Text>
                      </>
                    )}
                  </AnimatedPressable>
                </Animated.View>
              </>
            )}

            {/* ─── STEP 2 (AI) — Loading or Review ───────── */}
            {step === 2 && mode === 'ai' && loading && (
              <AILoadingView
                isDark={isDark}
                onCancel={() => {
                  setLoading(false);
                  setStep(1);
                }}
              />
            )}

            {step === 2 && mode === 'ai' && !loading && (
              <View style={glassStyle}>
                <AIReviewStep
                  miniGoals={reviewMiniGoals}
                  onRemove={(id) => {
                    setReviewMiniGoals((prev) => prev.filter((mg) => mg.id !== id));
                    // Delete from DB — fire and forget, non-blocking
                    deleteMiniGoal({ variables: { miniGoalId: id } }).catch(() => {});
                  }}
                  onConfirm={handleAIConfirm}
                  onRegenerate={handleAIRegenerate}
                  isDark={isDark}
                  confirming={confirming}
                  warning={aiWarning}
                />
              </View>
            )}

            {/* ─── STEP 2 (Manual) — Mini-Goal Builder ───── */}
            {step === 2 && mode === 'manual' && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <View style={glassStyle}>
                  <MiniGoalBuilder
                    miniGoals={miniGoalDrafts}
                    onChange={setMiniGoalDrafts}
                    isDark={isDark}
                  />
                </View>

                <Animated.View
                  entering={FadeInDown.delay(200).duration(400)}
                  style={{ marginTop: 24 }}>
                  <AnimatedPressable
                    onPress={handleManualCreate}
                    disabled={loading}
                    scaleDown={0.95}
                    className="flex-row items-center justify-center gap-3 rounded-2xl py-5"
                    style={{
                      backgroundColor: '#8b5cf6',
                      shadowColor: '#8b5cf6',
                      shadowOpacity: 0.3,
                      shadowRadius: 20,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: 8,
                      opacity: loading ? 0.7 : 1,
                    }}>
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text className="text-lg font-extrabold text-white">Create Quest</Text>
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
      </KeyboardAvoidingView>

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
