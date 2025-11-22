import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  useColorScheme,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useShardStore } from '~/store/shard.store';
import { useQuery } from '@apollo/client';
import { GET_SHARD_SCHEDULE } from '~/Graphql/Queries';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_ITEM_WIDTH = 60;

type TabType = 'overview' | 'progress' | 'schedule';

interface Participant {
  id: string;
  name: string;
  color: string;
}

interface Goal {
  id: string;
  title: string;
  tasks: Task[];
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

const ShardInfo = () => {
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams();
  const { selectedShard, getShardById } = useShardStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [expandedSummary, setExpandedSummary] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const flatListRef = useRef<FlatList>(null);
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      title: 'Set up Research environment',
      tasks: [
        { id: '1-1', title: 'Get and set up MS Word 2019.', completed: true },
        { id: '1-2', title: 'Use google scholar to find works.', completed: false },
        { id: '1-3', title: 'Get and set up mendeley.', completed: true },
      ],
    },
    {
      id: '2',
      title: 'Literature Review',
      tasks: [
        { id: '2-1', title: 'Read 10 research papers', completed: false },
        { id: '2-2', title: 'Summarize key findings', completed: false },
      ],
    },
  ]);

  // Get shard data
  const shardId = (params.shardId as string) || selectedShard?.id;
  const shardData = shardId ? getShardById(shardId) || selectedShard : selectedShard;

  // Fetch schedule data
  const { data: scheduleData, loading: scheduleLoading, refetch: refetchSchedule } = useQuery(
    GET_SHARD_SCHEDULE,
    {
      variables: { shardId },
      skip: !shardId || activeTab !== 'schedule',
    }
  );

  // Format time from date
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Generate 60 days (30 before, 30 after today)
  const getDaysArray = () => {
    const days = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 30);
    
    for (let i = 0; i < 60; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const allDays = getDaysArray();
  const todayIndex = 30;
  const today = new Date().toISOString().split('T')[0];
  const selectedDateKey = selectedDate.toISOString().split('T')[0];

  // Auto-scroll to today on mount when schedule tab is active
  useEffect(() => {
    if (activeTab === 'schedule') {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: todayIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }, 100);
    }
  }, [activeTab]);

  // Scroll to selected date when it changes
  useEffect(() => {
    const selectedIndex = allDays.findIndex(
      day => day.toISOString().split('T')[0] === selectedDateKey
    );
    if (selectedIndex !== -1 && activeTab === 'schedule') {
      flatListRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [selectedDateKey]);

  // Get tasks for selected date
  const tasksForSelectedDate = scheduleData?.getShardSchedule?.tasksByDate?.[selectedDateKey] || [];

  // Render day item for FlatList
  const renderDayItem = ({ item: day, index }: { item: Date; index: number }) => {
    const dateKey = day.toISOString().split('T')[0];
    const isToday = dateKey === today;
    const isSelected = dateKey === selectedDateKey;
    
    return (
      <TouchableOpacity
        onPress={() => setSelectedDate(day)}
        className="items-center justify-center rounded-xl p-3 mx-1"
        style={{
          backgroundColor: isSelected 
            ? (colorScheme === 'dark' ? '#374151' : '#e5e7eb') 
            : 'transparent',
          width: DAY_ITEM_WIDTH,
          height: 60,
          borderWidth: isToday ? 2 : 0,
          borderColor: '#7c3aed',
        }}>
        <Text
          className="text-xs font-medium mb-1"
          style={{ color: '#9ca3af' }}>
          {day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
        </Text>
        <Text
          className="text-base font-semibold"
          style={{
            color: isSelected 
              ? (colorScheme === 'dark' ? '#fff' : '#000')
              : '#9ca3af',

              fontSize: isToday ? 24 : 12,
              opacity: isToday ? 1 : 0.9,
          }}>
          {day.getDate()}
        </Text>
      </TouchableOpacity>
    );
  };

  // Group tasks by mini-goal
  const groupedTasks = tasksForSelectedDate.reduce((acc: any, task: any) => {
    const key = task.miniGoalId;
    if (!acc[key]) {
      acc[key] = {
        miniGoalTitle: task.miniGoalTitle,
        tasks: [],
      };
    }
    acc[key].tasks.push(task);
    return acc;
  }, {});

  const colors = ['#d946ef', '#7c3aed', '#6366f1', '#ec4899', '#8b5cf6'];

  // Fallback if no shard found
  if (!shardData) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background-paper dark:bg-background-dark-default">
        <Ionicons
          name="alert-circle-outline"
          size={64}
          color={colorScheme === 'dark' ? '#4b5563' : '#9ca3af'}
        />
        <Text className="mt-4 text-center text-text-secondary dark:text-text-dark-secondary">
          Shard not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-lg px-6 py-3"
          style={{ backgroundColor: '#7c3aed' }}>
          <Text className="font-semibold text-white">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Mock participants - in real app, fetch based on shard
  const participants: Participant[] = [
    { id: '1', name: 'Levi Idhosa', color: '#d946ef' },
    { id: '2', name: 'John Bull', color: '#d946ef' },
    { id: '3', name: 'Sasha Davis', color: '#6366f1' },
  ];

  const toggleTask = (goalId: string, taskId: string) => {
    setGoals(prevGoals =>
      prevGoals.map(goal =>
        goal.id === goalId
          ? {
              ...goal,
              tasks: goal.tasks.map(task =>
                task.id === taskId ? { ...task, completed: !task.completed } : task
              ),
            }
          : goal
      )
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} hitSlop={20}>
          <AntDesign
            name="arrowleft"
            size={24}
            color={colorScheme === 'dark' ? '#fff' : '#000'}
          />
        </TouchableOpacity>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs - Pill Style */}
      <View className="mb-4 px-4">
        <View className="flex-row justify-between rounded-full p-1">
          <TouchableOpacity
            onPress={() => setActiveTab('overview')}
            className="flex-1 items-center rounded-full py-2"
            style={{ backgroundColor: activeTab === 'overview' ? '#7c3aed' : 'transparent' }}>
            <Text
              className="text-sm font-semibold"
              style={{ color: activeTab === 'overview' ? '#ffffff' : (colorScheme === 'dark' ? '#9ca3af' : '#6b7280') }}>
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('progress')}
            className="flex-1 items-center rounded-full py-2"
            style={{ backgroundColor: activeTab === 'progress' ? '#7c3aed' : 'transparent' }}>
            <Text
              className="text-sm font-semibold"
              style={{ color: activeTab === 'progress' ? '#ffffff' : (colorScheme === 'dark' ? '#9ca3af' : '#6b7280') }}>
              Progress
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('schedule')}
            className="flex-1 items-center rounded-full py-2"
            style={{ backgroundColor: activeTab === 'schedule' ? '#7c3aed' : 'transparent' }}>
            <Text
              className="text-sm font-semibold"
              style={{ color: activeTab === 'schedule' ? '#ffffff' : (colorScheme === 'dark' ? '#9ca3af' : '#6b7280') }}>
              Schedule
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4">
        {activeTab === 'overview' && (
          <Animated.View entering={FadeIn}>
            {/* Shard Header Card */}
            <View 
              className="mb-6 overflow-hidden rounded-2xl p-4"
              style={{ backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f9fafb' }}>
              <View className="flex-row">
                {/* Left Column: Image + Icons */}
                <View className="mr-4">
                  {/* Shard Image */}
                  <Image
                    source={{ uri: shardData.image }}
                    className="mb-3 h-40 w-40 rounded-xl bg-gray-200"
                    resizeMode="cover"
                  />

                  {/* Action Icons */}
                  <View className="flex-row items-center justify-center gap-3">
                    <TouchableOpacity
                      onPress={() => console.log('Open shard chat')}
                      className="items-center justify-center rounded-full p-2"
                      style={{ backgroundColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={18}
                        color={colorScheme === 'dark' ? '#fff' : '#000'}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => console.log('Edit shard')}
                      className="items-center justify-center rounded-full p-2"
                      style={{ backgroundColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }}>
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color={colorScheme === 'dark' ? '#fff' : '#000'}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/notifications', params: { shardId: shardData.id } })}
                      className="items-center justify-center rounded-full p-2"
                      style={{ backgroundColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }}>
                      <Ionicons
                        name="notifications-outline"
                        size={18}
                        color={colorScheme === 'dark' ? '#fff' : '#000'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Right Column: Title and Participants */}
                <View className="flex-1 justify-start"
                style={{
                  alignItems: 'flex-start',
                }}
                >
                  <Text className="mb-3 text-lg font-bold text-text-primary dark:text-text-dark">
                    {shardData.title}
                  </Text>

                  {/* Participants */}
                  <View className="flex-row flex-wrap gap-2">
                    {participants.map((participant: Participant) => (
                      <View
                        key={participant.id}
                        className="rounded-full px-3 py-1.5"
                        style={{ backgroundColor: participant.color }}>
                        <Text className="text-xs font-semibold text-white">
                          {participant.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Shard Summary */}
            <View className="mb-6">
              <Text className="mb-2 text-sm font-bold uppercase text-text-primary dark:text-text-dark">
                Shard Summary
              </Text>
              <Text
                className="text-sm leading-6 text-text-secondary dark:text-text-dark-secondary"
                numberOfLines={expandedSummary ? undefined : 3}>
                {shardData.summary}
              </Text>
              <TouchableOpacity onPress={() => setExpandedSummary(!expandedSummary)}>
                <Text className="mt-2 text-sm font-semibold" style={{ color: '#a855f7' }}>
                  {expandedSummary ? 'Read Less' : 'Read More'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Shard Goals */}
            <View className="mb-6">
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-sm font-bold uppercase text-text-primary dark:text-text-dark">
                  Shard Goals
                </Text>
                <TouchableOpacity>
                  <Ionicons
                    name="ellipsis-vertical"
                    size={20}
                    color={colorScheme === 'dark' ? '#fff' : '#000'}
                  />
                </TouchableOpacity>
              </View>

              {goals.map((goal, goalIndex) => (
                <Animated.View
                  key={goal.id}
                  entering={FadeInDown.delay(goalIndex * 100)}
                  className="mb-6">
                  <Text className="mb-3 text-base font-bold text-text-primary dark:text-text-dark">
                    {goalIndex + 1}. {goal.title}
                  </Text>
                  {goal.tasks.map((task) => (
                    <TouchableOpacity
                      key={task.id}
                      onPress={() => toggleTask(goal.id, task.id)}
                      className="mb-3 flex-row items-center">
                      <View
                        className="mr-3 h-6 w-6 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: task.completed ? '#a855f7' : 'transparent',
                          borderWidth: task.completed ? 0 : 2,
                          borderColor: '#d1d5db',
                        }}>
                        {task.completed && (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        )}
                      </View>
                      <Text
                        className="flex-1 text-sm"
                        style={{
                          color: task.completed
                            ? '#9ca3af'
                            : colorScheme === 'dark'
                            ? '#fff'
                            : '#000',
                          textDecorationLine: task.completed ? 'line-through' : 'none',
                        }}>
                        {task.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {activeTab === 'progress' && (
          <View className="items-center justify-center py-20">
            <Ionicons
              name="bar-chart-outline"
              size={64}
              color={colorScheme === 'dark' ? '#4b5563' : '#9ca3af'}
            />
            <Text className="mt-4 text-center text-text-secondary dark:text-text-dark-secondary">
              Progress tracking coming soon
            </Text>
          </View>
        )}

        {activeTab === 'schedule' && (
          <Animated.View entering={FadeIn}>
            {/* Calendar Week View */}
            <View className="mb-6 rounded-2xl p-4" style={{ backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f9fafb' }}>
              <Text className="mb-4 text-center text-lg font-bold text-text-primary dark:text-text-dark">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
              </Text>
              
              {/* Horizontal Scrollable Days */}
              <FlatList
                ref={flatListRef}
                data={allDays}
                renderItem={renderDayItem}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: SCREEN_WIDTH / 2 - DAY_ITEM_WIDTH / 2 }}
                snapToInterval={DAY_ITEM_WIDTH + 8}
                decelerationRate="fast"
                onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    flatListRef.current?.scrollToIndex({
                      index: info.index,
                      animated: true,
                      viewPosition: 0.5,
                    });
                  }, 100);
                }}
              />
            </View>

            {/* Today's Goals Header */}
            <Text className="mb-4 text-center text-lg font-bold text-text-primary dark:text-text-dark">
              {selectedDateKey === today ? "TODAY'S GOALS" : "SCHEDULED GOALS"}
            </Text>

            {/* Loading State */}
            {scheduleLoading && (
              <View className="items-center justify-center py-20">
                <Text className="text-text-secondary dark:text-text-dark-secondary">
                  Loading schedule...
                </Text>
              </View>
            )}

            {/* Empty State */}
            {!scheduleLoading && tasksForSelectedDate.length === 0 && (
              <View className="items-center justify-center py-20">
                <Ionicons
                  name="calendar-outline"
                  size={64}
                  color={colorScheme === 'dark' ? '#4b5563' : '#9ca3af'}
                />
                <Text className="mt-4 text-center text-text-secondary dark:text-text-dark-secondary">
                  No tasks scheduled for this date
                </Text>
              </View>
            )}

            {/* Goal Cards */}
            {!scheduleLoading && Object.keys(groupedTasks).length > 0 && (
              <View className="gap-4">
                {Object.values(groupedTasks).map((group: any, groupIndex: number) => {
                  const color = colors[groupIndex % colors.length];
                  const firstTask = group.tasks[0];
                  const lastTask = group.tasks[group.tasks.length - 1];
                  
                  return (
                    <Animated.View
                      key={groupIndex}
                      entering={FadeInDown.delay(groupIndex * 100)}
                      className="overflow-hidden rounded-2xl"
                      style={{ backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f9fafb' }}>
                      <View className="flex-row">
                        {/* Colored Left Border */}
                        <View style={{ width: 6, backgroundColor: color }} />
                        
                        {/* Content */}
                        <View className="flex-1 p-4">
                          {/* Mini-Goal Title */}
                          <Text className="mb-3 text-base font-bold text-text-primary dark:text-text-dark">
                            {group.miniGoalTitle}
                          </Text>

                          {/* Time Range */}
                          {firstTask.dueDate && (
                            <View className="mb-3 flex-row items-center gap-2">
                              <Ionicons name="time-outline" size={18} color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                              <View className="rounded px-2 py-1" style={{ backgroundColor: color }}>
                                <Text className="text-xs font-semibold text-white">
                                  {formatTime(firstTask.dueDate)}
                                </Text>
                              </View>
                              {group.tasks.length > 1 && lastTask.dueDate && (
                                <>
                                  <Text className="text-sm text-text-secondary dark:text-text-dark-secondary">To</Text>
                                  <View className="rounded px-2 py-1" style={{ backgroundColor: color, opacity: 0.8 }}>
                                    <Text className="text-xs font-semibold text-white">
                                      {formatTime(lastTask.dueDate)}
                                    </Text>
                                  </View>
                                </>
                              )}
                            </View>
                          )}

                          {/* Tasks */}
                          <View className="gap-2">
                            {group.tasks.map((task: any) => (
                              <TouchableOpacity
                                key={task.id}
                                className="flex-row items-center gap-3">
                                <View
                                  className="h-5 w-5 items-center justify-center rounded-full"
                                  style={{
                                    backgroundColor: task.completed ? color : 'transparent',
                                    borderWidth: task.completed ? 0 : 2,
                                    borderColor: '#d1d5db',
                                  }}>
                                  {task.completed && (
                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                  )}
                                </View>
                                <Text
                                  className="flex-1 text-sm"
                                  style={{
                                    color: task.completed
                                      ? '#9ca3af'
                                      : colorScheme === 'dark'
                                      ? '#fff'
                                      : '#000',
                                    textDecorationLine: task.completed ? 'line-through' : 'none',
                                  }}>
                                  {task.title}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
export default ShardInfo;
