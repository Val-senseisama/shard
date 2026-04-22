import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  useColorScheme,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@apollo/client';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { ASSIGN_MINI_GOAL } from '~/Graphql/Mutations';
import AnimatedPressable from './AnimatedPressable';
import { useAppStore } from '~/store/app.store';

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
  const bg = isDark ? '#131313' : '#f8f8fa';
  const cardBg = isDark ? '#1e1e1e' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const subText = isDark ? '#666' : '#aaa';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <TouchableOpacity activeOpacity={1}>
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={{
              backgroundColor: bg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 12,
              paddingBottom: 40,
              paddingHorizontal: 20,
              maxHeight: '70%',
            }}>
            {/* Drag handle */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isDark ? '#333' : '#ddd',
                }}
              />
            </View>

            {/* Header */}
            <View style={{ marginBottom: 6 }}>
              <Text
                style={{
                  color: isDark ? '#fff' : '#1a1a1a',
                  fontSize: 17,
                  fontWeight: '700',
                  marginBottom: 4,
                }}>
                Assign to teammate
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="flag-outline" size={13} color="#8b5cf6" />
                <Text
                  style={{ color: '#8b5cf6', fontSize: 13, fontWeight: '500' }}
                  numberOfLines={1}>
                  {targetLabel}
                </Text>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: borderColor, marginVertical: 16 }} />

            {participants.length === 0 ? (
              <Text
                style={{ color: subText, textAlign: 'center', paddingVertical: 32, fontSize: 13 }}>
                No participants on this quest yet.
              </Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {participants.map((p, i) => {
                  const isCurrentAssignee = currentAssigneeId === p.user;
                  const isAssigning = assigningTo === p.user;

                  return (
                    <Animated.View key={p.user} entering={FadeInDown.delay(i * 50).duration(300)}>
                      <AnimatedPressable
                        onPress={() => handleAssign(p.user)}
                        disabled={!!assigningTo}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: isCurrentAssignee ? 'rgba(139,92,246,0.1)' : cardBg,
                          borderRadius: 16,
                          padding: 14,
                          marginBottom: 10,
                          borderWidth: 1,
                          borderColor: isCurrentAssignee ? 'rgba(139,92,246,0.3)' : borderColor,
                        }}>
                        {/* Avatar */}
                        {p.profilePic ? (
                          <Image
                            source={{ uri: p.profilePic }}
                            style={{ width: 42, height: 42, borderRadius: 21, marginRight: 12 }}
                          />
                        ) : (
                          <View
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 21,
                              backgroundColor: 'rgba(139,92,246,0.2)',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 12,
                            }}>
                            <Text style={{ color: '#8b5cf6', fontWeight: '700', fontSize: 16 }}>
                              {(p.username || '?')[0].toUpperCase()}
                            </Text>
                          </View>
                        )}

                        {/* Info */}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: isDark ? '#fff' : '#1a1a1a',
                              fontWeight: '600',
                              fontSize: 14,
                            }}>
                            {p.username || 'Teammate'}
                          </Text>
                          <Text
                            style={{ color: subText, fontSize: 12, textTransform: 'capitalize' }}>
                            {p.role.replace('_', ' ')}
                          </Text>
                        </View>

                        {/* State */}
                        {isAssigning ? (
                          <ActivityIndicator size="small" color="#8b5cf6" />
                        ) : isCurrentAssignee ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="checkmark-circle" size={18} color="#8b5cf6" />
                            <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: '600' }}>
                              Assigned
                            </Text>
                          </View>
                        ) : (
                          <Ionicons
                            name="add-circle-outline"
                            size={20}
                            color={isDark ? '#444' : '#ccc'}
                          />
                        )}
                      </AnimatedPressable>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            )}
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default AssignmentSheet;
