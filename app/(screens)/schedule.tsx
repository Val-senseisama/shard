import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { GET_MY_SCHEDULE } from '~/Graphql/Queries';
import { router } from 'expo-router';
import DrawerNavigation from '~/components/DrawerNavigation';
import { useUserStore } from '~/store/user.store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_ITEM_WIDTH = 60;

const Schedule = () => {
  const colorScheme = useColorScheme();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const user = useUserStore((state) => state.user);

  const { data, loading, error, refetch } = useQuery(GET_MY_SCHEDULE);

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
  const todayIndex = 30; // Today is at index 30
  const today = new Date().toISOString().split('T')[0];
  const selectedDateKey = selectedDate.toISOString().split('T')[0];

  // Auto-scroll to today on mount
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: todayIndex,
        animated: true,
        viewPosition: 0.5, // Center the item
      });
    }, 100);
  }, []);

  // Scroll to selected date when it changes
  useEffect(() => {
    const selectedIndex = allDays.findIndex(
      day => day.toISOString().split('T')[0] === selectedDateKey
    );
    if (selectedIndex !== -1) {
      flatListRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [selectedDateKey]);

  // Get tasks for selected date
  const tasksForSelectedDate = data?.getMySchedule?.tasksByDate?.[selectedDateKey] || [];

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

  // Format time from date
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Group tasks by mini-goal
  const groupedTasks = tasksForSelectedDate.reduce((acc: any, task: any) => {
    const key = task.miniGoalId;
    if (!acc[key]) {
      acc[key] = {
        miniGoalTitle: task.miniGoalTitle,
        shardTitle: task.shardTitle,
        tasks: [],
      };
    }
    acc[key].tasks.push(task);
    return acc;
  }, {});

  const colors = ['#d946ef', '#7c3aed', '#6366f1', '#ec4899', '#8b5cf6'];

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      <DrawerNavigation isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} user={user} />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => setIsDrawerOpen(true)} hitSlop={20}>
          <Ionicons
            name="menu"
            size={24}
            color={colorScheme === 'dark' ? '#fff' : '#000'}
          />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary dark:text-text-dark">
          My Schedule
        </Text>
        <TouchableOpacity onPress={() => refetch()} hitSlop={20}>
          <Ionicons
            name="refresh"
            size={24}
            color={colorScheme === 'dark' ? '#fff' : '#000'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Calendar Week View */}
        <Animated.View entering={FadeIn}>
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
                // Handle scroll failure gracefully
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

          {/* Tasks Header */}
          <Text className="mb-4 text-center text-lg font-bold text-text-primary dark:text-text-dark">
            {selectedDateKey === today ? "TODAY'S GOALS" : "SCHEDULED GOALS"}
          </Text>

          {/* Loading State */}
          {loading && (
            <View className="items-center justify-center py-20">
              <Text className="text-text-secondary dark:text-text-dark-secondary">
                Loading schedule...
              </Text>
            </View>
          )}

          {/* Error State */}
          {error && (
            <View className="items-center justify-center py-20">
              <Ionicons 
                name="alert-circle-outline" 
                size={64} 
                color={colorScheme === 'dark' ? '#4b5563' : '#9ca3af'} 
              />
              <Text className="mt-4 text-center text-text-secondary dark:text-text-dark-secondary">
                Failed to load schedule
              </Text>
            </View>
          )}

          {/* Empty State */}
          {!loading && !error && tasksForSelectedDate.length === 0 && (
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
          {!loading && !error && Object.keys(groupedTasks).length > 0 && (
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
                        {/* Shard Title */}
                        <Text className="mb-1 text-xs font-semibold" style={{ color: color }}>
                          {group.shardTitle}
                        </Text>

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
      </ScrollView>
    </SafeAreaView>
  );
};

export default Schedule;