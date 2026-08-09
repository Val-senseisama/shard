import React, { useState } from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@apollo/client';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ASSIGN_MINI_GOAL } from '~/Graphql/Mutations';
import AnimatedPressable from './AnimatedPressable';
import { useAppStore } from '~/store/app.store';
import { hud, FONT, RADIUS, Sheet } from '~/components/hud';

export interface Participant {
  user: string;
  username?: string;
  profilePic?: string;
  role: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  miniGoalId: string;
  miniGoalTitle: string;
  taskIndex?: number; // if provided → task-level assignment
  taskTitle?: string;
  participants: Participant[];
  currentAssigneeId?: string | null;
  onAssigned?: () => void; // callback to refetch
}

const AssignmentSheet: React.FC<Props> = ({
  visible,
  onClose,
  miniGoalId,
  miniGoalTitle,
  taskIndex,
  taskTitle,
  participants,
  currentAssigneeId,
  onAssigned,
}) => {
  const isDark = useColorScheme() === 'dark';
  const c = hud(isDark);
  const { addAlert } = useAppStore();
  const [assigningTo, setAssigningTo] = useState<string | null>(null);

  const [assignMiniGoal] = useMutation(ASSIGN_MINI_GOAL, {
    onCompleted: (data) => {
      setAssigningTo(null);
      if (data?.assignMiniGoal?.success) {
        addAlert({ str: data.assignMiniGoal.message, type: 'success' });
        onAssigned?.();
        onClose();
      } else {
        addAlert({ str: data?.assignMiniGoal?.message || 'Assignment failed', type: 'error' });
      }
    },
    onError: () => {
      setAssigningTo(null);
      addAlert({ str: 'Assignment failed. Please try again.', type: 'error' });
    },
  });

  const handleAssign = (userId: string) => {
    setAssigningTo(userId);
    assignMiniGoal({
      variables: {
        miniGoalId,
        userId,
        ...(typeof taskIndex === 'number' ? { taskIndex } : {}),
      },
    });
  };

  const targetLabel = taskTitle || miniGoalTitle;

  return (
    // The drag handle this used to draw was decorative — the sheet couldn't be
    // dragged at all. `Sheet` provides a real one.
    <Sheet visible={visible} onClose={onClose} isDark={isDark}>
      <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
        <View style={{ marginBottom: 6 }}>
          <Text
            style={{
              color: c.text,
              fontSize: 17,
              fontFamily: FONT.bold,
              marginBottom: 4,
            }}>
            Assign to teammate
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="flag-outline" size={13} color={c.violet} />
            <Text
              style={{ color: c.violet, fontSize: 13, fontFamily: FONT.medium }}
              numberOfLines={1}>
              {targetLabel}
            </Text>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: c.panelBorder, marginVertical: 16 }} />

        {participants.length === 0 ? (
          <Text
            style={{
              color: c.textFaint,
              textAlign: 'center',
              paddingVertical: 32,
              fontSize: 13,
              fontFamily: FONT.regular,
            }}>
            No participants on this quest yet.
          </Text>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {participants.map((p, i) => {
              const isCurrentAssignee = currentAssigneeId === p.user;
              const isAssigning = assigningTo === p.user;

              return (
                <Animated.View
                  key={p.user}
                  entering={FadeInDown.delay(Math.min(i, 4) * 30).duration(260)}>
                  <AnimatedPressable
                    onPress={() => handleAssign(p.user)}
                    disabled={!!assigningTo}
                    accessibilityLabel={`Assign to ${p.username || 'teammate'}`}
                    accessibilityState={{ selected: isCurrentAssignee }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isCurrentAssignee ? `${c.violet}1A` : c.panel,
                      borderRadius: RADIUS.md,
                      padding: 14,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: isCurrentAssignee ? `${c.violet}4D` : c.panelBorder,
                    }}>
                    {/* Avatar */}
                    {p.profilePic ? (
                      <Image
                        source={{ uri: p.profilePic }}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: RADIUS.pill,
                          marginRight: 12,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: RADIUS.pill,
                          backgroundColor: `${c.violet}33`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}>
                        <Text style={{ color: c.violet, fontFamily: FONT.bold, fontSize: 16 }}>
                          {(p.username || '?')[0].toUpperCase()}
                        </Text>
                      </View>
                    )}

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: c.text,
                          fontFamily: FONT.semibold,
                          fontSize: 14,
                        }}>
                        {p.username || 'Teammate'}
                      </Text>
                      <Text
                        style={{
                          color: c.textFaint,
                          fontSize: 12,
                          fontFamily: FONT.regular,
                          textTransform: 'capitalize',
                        }}>
                        {p.role.replace('_', ' ')}
                      </Text>
                    </View>

                    {/* State */}
                    {isAssigning ? (
                      <ActivityIndicator size="small" color={c.violet} />
                    ) : isCurrentAssignee ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="checkmark-circle" size={18} color={c.violet} />
                        <Text
                          style={{ color: c.violet, fontSize: 12, fontFamily: FONT.semibold }}>
                          Assigned
                        </Text>
                      </View>
                    ) : (
                      <Ionicons name="add-circle-outline" size={20} color={c.textFaint} />
                    )}
                  </AnimatedPressable>
                </Animated.View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Sheet>
  );
};

export default AssignmentSheet;
