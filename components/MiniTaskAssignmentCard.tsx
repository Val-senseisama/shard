import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { brand, FONT, RADIUS } from '~/components/hud';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useMutation } from '@apollo/client';
import { COMPLETE_MINI_GOAL } from '~/Graphql/Mutations';
import { useAppStore } from '~/store/app.store';

interface Participant {
  id: string;
  username: string;
  profilePic?: string;
}

interface MiniTaskRef {
  miniGoalId: string;
  taskId: string;
  miniGoalTitle?: string | null;
  taskTitle?: string | null;
  assignedTo: Participant;
}

interface Props {
  sender: Participant;
  minitaskRef: MiniTaskRef;
  isAssignee: boolean;
  isDark: boolean;
  createdAt: string;
}

const Avatar = ({ user, size = 32, isDark }: { user: Participant; size?: number; isDark: boolean }) => {
  if (user.profilePic) {
    return (
      <Image
        source={{ uri: user.profilePic }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: isDark ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontSize: size * 0.4, fontFamily: FONT.bold, color: brand.violet }}>
        {(user.username?.[0] ?? '?').toUpperCase()}
      </Text>
    </View>
  );
};

const formatTime = (val: string) => {
  const d = new Date(val);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const MiniTaskAssignmentCard: React.FC<Props> = ({
  sender,
  minitaskRef,
  isAssignee,
  isDark,
  createdAt,
}) => {
  const { addAlert } = useAppStore();
  const [done, setDone] = useState(false);

  const [completeMiniGoal, { loading }] = useMutation(COMPLETE_MINI_GOAL, {
    onCompleted: (data) => {
      if (data?.completeMiniGoal?.success) {
        setDone(true);
        const xp = data.completeMiniGoal.xpEarned;
        addAlert({ str: xp ? `+${xp} XP earned!` : 'Task marked complete!', type: 'success' });
      } else {
        addAlert({ str: data?.completeMiniGoal?.message || 'Could not complete task', type: 'error' });
      }
    },
    onError: () => addAlert({ str: 'Failed to complete task', type: 'error' }),
  });

  const handleComplete = () => {
    completeMiniGoal({ variables: { miniGoalId: minitaskRef.miniGoalId } });
  };

  const cardBg = isDark ? '#1a1a2e' : '#faf5ff';
  const borderColor = isAssignee
    ? isDark ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.35)'
    : isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.18)';
  const titleColor = isDark ? '#fff' : '#1a1a1a';
  const subColor = isDark ? '#9ca3af' : '#6b7280';
  const taskLabel = minitaskRef.taskTitle || minitaskRef.miniGoalTitle || 'Task';
  const questLabel = minitaskRef.taskTitle ? minitaskRef.miniGoalTitle : null;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: 'center', marginVertical: 10, paddingHorizontal: 8 }}>
      {/* Assignment card */}
      <View
        style={{
          width: '100%',
          backgroundColor: cardBg,
          borderRadius: RADIUS.lg,
          borderWidth: 1.5,
          borderColor,
          overflow: 'hidden',
        }}>

        {/* "Assigned to you" banner — only for assignee */}
        {isAssignee && (
          <View
            style={{
              backgroundColor: isDark ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.1)',
              paddingHorizontal: 16,
              paddingVertical: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}>
            <Ionicons name="person" size={12} color="#8b5cf6" />
            <Text style={{ color: brand.violet, fontSize: 12, fontFamily: FONT.bold, letterSpacing: 0.3 }}>
              Assigned to you
            </Text>
          </View>
        )}

        <View style={{ padding: 16 }}>
          {/* Assigner → Assignee row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Avatar user={sender} size={30} isDark={isDark} />
            <Ionicons name="arrow-forward" size={14} color={isDark ? '#6b7280' : '#9ca3af'} />
            <Avatar user={minitaskRef.assignedTo} size={30} isDark={isDark} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: subColor, fontSize: 12 }} numberOfLines={1}>
                <Text style={{ color: isDark ? '#d1d5db' : '#374151', fontFamily: FONT.semibold }}>
                  @{sender.username}
                </Text>
                {' '}assigned{' '}
                <Text style={{ color: isDark ? '#d1d5db' : '#374151', fontFamily: FONT.semibold }}>
                  @{minitaskRef.assignedTo.username}
                </Text>
              </Text>
            </View>
          </View>

          {/* Task name block */}
          <View
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderRadius: RADIUS.sm,
              padding: 12,
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 10,
            }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: RADIUS.sm,
                backgroundColor: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
              <Ionicons name="clipboard-outline" size={16} color="#8b5cf6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: titleColor, fontFamily: FONT.bold, fontSize: 14, lineHeight: 20 }}>
                {taskLabel}
              </Text>
              {questLabel && (
                <Text style={{ color: subColor, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {questLabel}
                </Text>
              )}
            </View>
          </View>

          {/* Status row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {done ? (
                <>
                  <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                  <Text style={{ color: '#22c55e', fontSize: 13, fontFamily: FONT.semibold }}>Done</Text>
                </>
              ) : (
                <>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#f59e0b',
                    }}
                  />
                  <Text style={{ color: '#f59e0b', fontSize: 13, fontFamily: FONT.semibold }}>Pending</Text>
                </>
              )}
            </View>

            {/* Mark Complete — only for assignee when not yet done */}
            {isAssignee && !done && (
              <TouchableOpacity
                onPress={handleComplete}
                disabled={loading}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: isDark ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.12)',
                  borderRadius: RADIUS.lg,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderWidth: 1,
                  borderColor: 'rgba(139,92,246,0.35)',
                }}>
                {loading ? (
                  <ActivityIndicator size="small" color="#8b5cf6" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={14} color="#8b5cf6" />
                    <Text style={{ color: brand.violet, fontSize: 13, fontFamily: FONT.bold }}>
                      Mark Complete
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Timestamp */}
      <Text style={{ color: isDark ? '#4b5563' : '#9ca3af', fontSize: 10, marginTop: 4 }}>
        {formatTime(createdAt)}
      </Text>
    </Animated.View>
  );
};

export default MiniTaskAssignmentCard;
