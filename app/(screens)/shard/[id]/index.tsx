import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AntDesign, MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import images from '@/constants/images';
import { useQuery, useMutation } from '@apollo/client';
import { GET_SHARD, GET_SHARD_SCHEDULE, GET_SHARD_ANALYTICS } from '~/Graphql/Queries';
import { COMPLETE_TASK, DELETE_TASK, RESTORE_TASK } from '~/Graphql/Mutations';
import CelebrationOverlay from '~/components/CelebrationOverlay';
import { useAppStore } from '~/store/app.store';
import Toast from 'react-native-toast-message';

const ShardDetail = () => {
  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const colorScheme = useColorScheme();
  const { addAlert } = useAppStore();

  // Celebration State
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState({
    xpEarned: 0,
    leveledUp: false,
    newLevel: 0,
  });

  const { data: shardData, refetch: refetchShard } = useQuery(GET_SHARD, {
    variables: { id },
    skip: !id,
  });

  const shard = shardData?.getShard?.shard;

  // Fetch Schedule Data
  const {
    data: scheduleData,
    loading: scheduleLoading,
    refetch: refetchSchedule,
  } = useQuery(GET_SHARD_SCHEDULE, {
    variables: { shardId: id },
    skip: !id,
  });

  // Fetch Analytics Data
  const {
    data: analyticsData,
    loading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useQuery(GET_SHARD_ANALYTICS, {
    variables: { shardId: id },
    skip: !id,
  });

  const [completeTask] = useMutation(COMPLETE_TASK);
  const [deleteTask] = useMutation(DELETE_TASK);
  const [restoreTask] = useMutation(RESTORE_TASK);

  const handleDeleteTask = async (miniGoalId: string, taskTitle: string) => {
    try {
      // Optimistic delete (or just wait for refetch)
      const { data } = await deleteTask({
        variables: { miniGoalId, taskTitle },
      });

      if (data?.deleteTask?.success) {
        // Refetch to update UI
        refetchShard();

        // Show Undo Toast
        Toast.show({
          type: 'undo',
          text1: 'Task deleted',
          position: 'bottom',
          visibilityTime: 5000,
          props: {
            onUndo: async () => {
              try {
                const { data: restoreData } = await restoreTask({
                  variables: { miniGoalId, taskTitle },
                });
                if (restoreData?.restoreTask?.success) {
                  refetchShard();
                  Toast.show({ type: 'success', text1: 'Task restored' });
                }
              } catch (err) {
                console.error('Restore error:', err);
                Toast.show({ type: 'error', text1: 'Failed to restore task' });
              }
            },
          },
        });
      }
    } catch (error) {
      console.error('Delete task error:', error);
      addAlert({ str: 'Failed to delete task', type: 'error' });
    }
  };

  const handleCompleteTask = async (
    miniGoalId: string,
    taskIndex: number,
    currentStatus: boolean
  ) => {
    if (currentStatus) return; // Already completed

    try {
      const { data } = await completeTask({
        variables: {
          shardId: id,
          miniGoalId,
          taskIndex,
        },
      });

      if (data?.completeTask?.success) {
        // Show celebration
        setCelebrationData({
          xpEarned: data.completeTask.xpEarned,
          leveledUp: data.completeTask.xpResult?.leveledUp,
          newLevel: data.completeTask.xpResult?.newLevel,
        });
        setShowCelebration(true);

        // Refresh data
        refetchShard();
        refetchSchedule();
        refetchAnalytics();
      } else {
        addAlert({ str: data?.completeTask?.message || 'Failed to complete task', type: 'error' });
      }
    } catch (error) {
      console.error('Complete task error:', error);
      addAlert({ str: 'Failed to complete task', type: 'error' });
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <View className="gap-4 p-2">
            {/* Project Card */}
            <View
              className="rounded-2xl bg-background-default p-4 shadow-md dark:bg-background-dark-paper"
              style={{
                borderRadius: 16,
                backgroundColor: colorScheme === 'dark' ? '#18181b' : '#fff',
                padding: 16,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}>
              <View
                className="flex-row items-center gap-3"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Image
                  source={{
                    uri:
                      shard?.image ||
                      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500&auto=format&fit=crop&q=60',
                  }}
                  className="h-16 w-16 rounded-xl bg-gray-200"
                  resizeMode="cover"
                  style={{
                    borderRadius: 12,
                    height: 64,
                    width: 64,
                    backgroundColor: '#e5e7eb',
                  }}
                />
                <View className="flex-1" style={{ flex: 1 }}>
                  <Text
                    className="text-base font-bold text-text-primary dark:text-text-dark"
                    style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: colorScheme === 'dark' ? '#fff' : '#18181b',
                    }}>
                    {shard?.title || 'Loading...'}
                  </Text>
                  <View
                    className="mt-2 flex-row flex-wrap gap-2"
                    style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {shard?.participants?.map((p: any) => (
                      <Text
                        key={p.user.id}
                        className={`rounded-full bg-indigo-500 px-3 py-1 text-xs font-semibold text-white`}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 4,
                          borderRadius: 9999,
                          fontSize: 12,
                          fontWeight: '600',
                          color: '#fff',
                          backgroundColor: '#6366f1',
                          overflow: 'hidden',
                          marginRight: 4,
                          marginBottom: 4,
                        }}>
                        {p.user.username}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
              {/* Action Icons Row */}
              <View
                className="mt-4 flex-row justify-start gap-3"
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  marginTop: 16,
                  justifyContent: 'flex-start',
                }}>
                <TouchableOpacity
                  onPress={() => router.push(`/(screens)/shard/${id}/chat`)}
                  className="h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-background-paper p-2 dark:border-gray-700 dark:bg-background-dark-default"
                  style={{
                    height: 40,
                    width: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colorScheme === 'dark' ? '#374151' : '#d1d5db',
                    backgroundColor: colorScheme === 'dark' ? '#27272a' : '#fff',
                    padding: 8,
                  }}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={20}
                    color={colorScheme === 'dark' ? '#fff' : '#000'}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {/* Shard Summary */}
            <View
              className="mt-2 rounded-2xl bg-background-paper p-4 shadow dark:bg-background-dark-default"
              style={{
                marginTop: 8,
                borderRadius: 16,
                backgroundColor: colorScheme === 'dark' ? '#27272a' : '#fff',
                padding: 16,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}>
              <Text
                className="mb-2 text-center text-xs font-bold tracking-widest text-text-primary dark:text-text-dark"
                style={{
                  marginBottom: 8,
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 'bold',
                  letterSpacing: 2,
                  color: colorScheme === 'dark' ? '#fff' : '#18181b',
                }}>
                SHARD SUMMARY
              </Text>
              <Text
                className="text-center text-sm text-text-secondary dark:text-gray-300"
                style={{
                  textAlign: 'center',
                  fontSize: 14,
                  color: colorScheme === 'dark' ? '#d1d5db' : '#6b7280',
                }}>
                {shard?.description || 'No description provided.'}
              </Text>
            </View>
            {/* Shard Goals */}
            <View
              className="mt-2 rounded-2xl bg-background-default p-4 shadow dark:bg-background-dark-paper"
              style={{
                marginTop: 8,
                borderRadius: 16,
                backgroundColor: colorScheme === 'dark' ? '#18181b' : '#f3f4f6',
                padding: 16,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}>
              <Text
                className="mb-2 text-center text-xs font-bold tracking-widest text-text-primary dark:text-text-dark"
                style={{
                  marginBottom: 8,
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 'bold',
                  letterSpacing: 2,
                  color: colorScheme === 'dark' ? '#fff' : '#18181b',
                }}>
                SHARD GOALS
              </Text>
              {shard?.minigoals?.map((goal: any, idx: number) => (
                <View key={goal.id} className="mb-4" style={{ marginBottom: 16 }}>
                  <View
                    className="mb-2 flex-row items-center"
                    style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      className="mr-2 h-3 w-3 rounded-full bg-primary-start"
                      style={{
                        marginRight: 8,
                        height: 12,
                        width: 12,
                        borderRadius: 6,
                        backgroundColor: '#6366f1',
                      }}
                    />
                    <Text
                      className="text-base font-semibold text-text-primary dark:text-text-dark"
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: colorScheme === 'dark' ? '#fff' : '#18181b',
                      }}>
                      {idx + 1}. {goal.title}
                    </Text>
                  </View>
                  <View
                    className="ml-5 border-l-2 border-gray-300 pl-3 dark:border-gray-700"
                    style={{
                      marginLeft: 20,
                      borderLeftWidth: 2,
                      borderLeftColor: colorScheme === 'dark' ? '#374151' : '#d1d5db',
                      paddingLeft: 12,
                    }}>
                    {goal.tasks?.map((step: any, i: number) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => handleCompleteTask(goal.id, i, step.completed)}
                        onLongPress={() => handleDeleteTask(goal.id, step.title)}
                        delayLongPress={500}
                        className="mb-2 flex-row items-center"
                        style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                        <View
                          className={`mr-2 flex h-5 w-5 items-center justify-center rounded-full ${step.completed ? 'bg-primary-start' : 'border border-gray-400 bg-gray-700 dark:bg-gray-800'}`}
                          style={{
                            marginRight: 8,
                            height: 20,
                            width: 20,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 10,
                            backgroundColor: step.completed
                              ? '#6366f1'
                              : colorScheme === 'dark'
                                ? '#27272a'
                                : '#374151',
                            borderWidth: step.completed ? 0 : 1,
                            borderColor: step.completed ? 'transparent' : '#9ca3af',
                          }}>
                          {step.completed ? (
                            <AntDesign name="check" size={14} color="#fff" />
                          ) : null}
                        </View>
                        <Text
                          className={`text-sm ${step.completed ? 'text-text-primary line-through opacity-50 dark:text-text-dark' : 'text-gray-400 dark:text-gray-500'}`}
                          style={{
                            fontSize: 14,
                            color: step.completed
                              ? colorScheme === 'dark'
                                ? '#fff'
                                : '#18181b'
                              : colorScheme === 'dark'
                                ? '#6b7280'
                                : '#9ca3af',
                            textDecorationLine: step.completed ? 'line-through' : 'none',
                            opacity: step.completed ? 0.5 : 1,
                          }}>
                          {step.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        );
      case 'schedule':
        return (
          <View className="p-4">
            {scheduleLoading ? (
              <ActivityIndicator size="large" color="#8b5cf6" />
            ) : (
              <View>
                {scheduleData?.getShardSchedule?.tasks?.length > 0 ? (
                  scheduleData.getShardSchedule.tasks.map((task: any, index: number) => {
                    // DEMO: Simulate rescheduled task for the first item
                    const isRescheduled = index === 0;
                    const originalDate = new Date(Date.now() - 86400000).toLocaleDateString();

                    return (
                      <View
                        key={task.id}
                        className="mb-3 rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1">
                            <View className="flex-row items-center gap-2">
                              <Text className="font-semibold text-text-primary dark:text-text-dark">
                                {task.title}
                              </Text>
                              {/* Rescheduled Badge */}
                              {(task.rescheduledFrom || isRescheduled) && (
                                <View
                                  className="flex-row items-center rounded-full bg-orange-100 px-2 py-0.5 dark:bg-orange-900/30"
                                  style={{ gap: 4 }}>
                                  <MaterialIcons name="history" size={12} color="#f97316" />
                                  <Text className="text-[10px] font-medium text-orange-600 dark:text-orange-400">
                                    Moved from {task.rescheduledFrom || originalDate}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text className="dark:text-text-dark-secondary text-xs text-text-secondary">
                              Due: {new Date(parseInt(task.dueDate)).toLocaleDateString()}
                            </Text>
                          </View>
                          <View
                            className={`h-3 w-3 rounded-full ${task.completed ? 'bg-green-500' : 'bg-yellow-500'}`}
                          />
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text className="mt-10 text-center text-gray-500">No scheduled tasks found.</Text>
                )}
              </View>
            )}
          </View>
        );
      case 'progress':
        return (
          <View className="p-4">
            {analyticsLoading ? (
              <ActivityIndicator size="large" color="#8b5cf6" />
            ) : (
              <View className="gap-4">
                {/* Stats Grid */}
                <View className="flex-row gap-4">
                  <View className="flex-1 rounded-xl bg-blue-500 p-4">
                    <Text className="text-xs font-bold text-white opacity-80">COMPLETED</Text>
                    <Text className="text-2xl font-bold text-white">
                      {analyticsData?.getShardAnalytics?.completedTasks || 0}
                    </Text>
                  </View>
                  <View className="flex-1 rounded-xl bg-purple-500 p-4">
                    <Text className="text-xs font-bold text-white opacity-80">TOTAL TASKS</Text>
                    <Text className="text-2xl font-bold text-white">
                      {analyticsData?.getShardAnalytics?.totalTasks || 0}
                    </Text>
                  </View>
                </View>

                {/* Completion Chart Placeholder */}
                <View className="rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
                  <Text className="mb-4 font-bold text-text-primary dark:text-text-dark">
                    Weekly Progress
                  </Text>
                  <View className="h-40 flex-row items-end justify-between px-2">
                    {analyticsData?.getShardAnalytics?.weeklyCompletion?.map(
                      (value: number, index: number) => (
                        <View key={index} className="items-center gap-2">
                          <View
                            className="w-8 rounded-t-lg bg-blue-500"
                            style={{ height: `${value}%`, minHeight: 4 }}
                          />
                          <Text className="text-xs text-gray-500">W{index + 1}</Text>
                        </View>
                      )
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      {/* Celebration Overlay */}
      <CelebrationOverlay
        visible={showCelebration}
        xpEarned={celebrationData.xpEarned}
        leveledUp={celebrationData.leveledUp}
        newLevel={celebrationData.newLevel}
        onClose={() => setShowCelebration(false)}
      />

      {/* Header */}
      <View
        className="flex-row items-center justify-between p-4"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
        }}>
        <TouchableOpacity onPress={() => router.back()}>
          <AntDesign name="arrowleft" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Image
          source={colorScheme === 'dark' ? images.SmallLogoDark : images.SmallLogoLight}
          className="h-8 w-24"
          resizeMode="contain"
          style={{ height: 32, width: 96 }}
        />
        <View className="flex-row gap-2" style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => router.push(`/(screens)/shard/${id}/edit`)}
            className="rounded-full bg-background-default p-2 dark:bg-background-dark-paper"
            style={{
              borderRadius: 9999,
              backgroundColor: colorScheme === 'dark' ? '#18181b' : '#fff',
              padding: 8,
            }}>
            <MaterialIcons name="edit" size={20} color={colorScheme === 'dark' ? '#fff' : '#000'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/(screens)/shard/${id}/notifications`)}
            className="rounded-full bg-background-default p-2 dark:bg-background-dark-paper"
            style={{
              borderRadius: 9999,
              backgroundColor: colorScheme === 'dark' ? '#18181b' : '#fff',
              padding: 8,
            }}>
            <Ionicons
              name="notifications"
              size={20}
              color={colorScheme === 'dark' ? '#fff' : '#000'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/(screens)/shard/${id}/chat`)}
            className="rounded-full bg-background-default p-2 dark:bg-background-dark-paper"
            style={{
              borderRadius: 9999,
              backgroundColor: colorScheme === 'dark' ? '#18181b' : '#fff',
              padding: 8,
            }}>
            <Ionicons
              name="chatbubble"
              size={20}
              color={colorScheme === 'dark' ? '#fff' : '#000'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View
        className="mx-2 mt-1 flex-row rounded-t-2xl border-b border-gray-200 bg-background-default dark:border-gray-800 dark:bg-background-dark-paper"
        style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderColor: colorScheme === 'dark' ? '#1f2937' : '#e5e7eb',
          backgroundColor: colorScheme === 'dark' ? '#18181b' : '#fff',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          marginHorizontal: 8,
          marginTop: 4,
        }}>
        {['overview', 'progress', 'schedule'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-3 ${activeTab === tab ? 'border-b-2 border-primary-start' : 'border-b-2 border-transparent'}`}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab ? '#6366f1' : 'transparent',
            }}>
            <Text
              className={`text-center text-sm font-medium ${activeTab === tab ? 'text-primary-start' : 'text-gray-500 dark:text-gray-400'}`}
              style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: '500',
                color:
                  activeTab === tab ? '#6366f1' : colorScheme === 'dark' ? '#9ca3af' : '#6b7280',
              }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView className="flex-1" style={{ flex: 1 }}>
        <Animated.View entering={FadeIn}>{renderTabContent()}</Animated.View>
        {/* Footer */}
        <Text
          className="my-4 text-center text-xs text-gray-400"
          style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginVertical: 16 }}>
          © XaviTechSavy 2024
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ShardDetail;
