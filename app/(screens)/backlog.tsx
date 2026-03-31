import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AntDesign, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client';
import { GET_MY_SCHEDULE } from '~/Graphql/Queries';
import { COMPLETE_TASK } from '~/Graphql/Mutations';
import { useAppStore } from '~/store/app.store';
import Toast from 'react-native-toast-message';
import DrawerNavigation from '@/components/DrawerNavigation';
import { useUserStore } from '~/store/user.store';
import images from '@/constants/images';
import { Image } from 'react-native';

const Backlog = () => {
  const colorScheme = useColorScheme();
  const { addAlert } = useAppStore();
  const user = useUserStore((state) => state.user);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data, loading, refetch } = useQuery(GET_MY_SCHEDULE, {
    fetchPolicy: 'cache-and-network',
  });

  const [completeTask] = useMutation(COMPLETE_TASK);

  const overdueTasks = useMemo(() => {
    if (!data?.getMySchedule?.tasks) return [];

    const now = Date.now();
    return data.getMySchedule.tasks
      .filter((task: any) => {
        const dueDate = parseInt(task.dueDate);
        return !task.completed && dueDate < now;
      })
      .sort((a: any, b: any) => parseInt(a.dueDate) - parseInt(b.dueDate));
  }, [data]);

  const handleCompleteTask = async (task: any) => {
    try {
      const { data } = await completeTask({
        variables: {
          shardId: task.shardId,
          miniGoalId: task.miniGoalId,
          taskIndex: 0, // Note: API might need task ID instead of index, but schema uses index.
          // If GET_MY_SCHEDULE doesn't return index, we might have issues.
          // Assuming task object has necessary info or we need to find index.
          // Wait, GET_MY_SCHEDULE returns task ID. COMPLETE_TASK takes taskIndex.
          // This is a potential issue if we don't have the index.
          // For now, let's assume we can't easily complete from here without index.
          // OR, we can try to find the index if we had the full list of tasks for the goal.
          // Let's check if we can navigate to the shard instead.
        },
      });
      // ...
    } catch (error) {
      console.error(error);
    }
  };

  // Since COMPLETE_TASK requires taskIndex which we might not have easily here without fetching the shard,
  // let's make the action "Go to Shard" or implement a new mutation COMPLETE_TASK_BY_ID if possible.
  // Checking Mutations.ts... (I recall seeing COMPLETE_TASK taking shardId, miniGoalId, taskIndex).
  // If I can't complete directly, I'll navigate to the shard.

  return (
    <View className="flex-1 bg-background-default dark:bg-background-dark-default">
      <SafeAreaView className="flex-1">
        <DrawerNavigation
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          user={user}
        />

        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => setIsDrawerOpen(true)}>
              <AntDesign
                name="menu-unfold"
                size={24}
                color={colorScheme === 'dark' ? '#fff' : '#000'}
              />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-text-primary dark:text-text-dark">Backlog</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="rounded-full bg-red-100 px-3 py-1 dark:bg-red-900/30">
              <Text className="font-bold text-red-600 dark:text-red-400">
                {overdueTasks.length} Overdue
              </Text>
            </View>
          </View>
        </View>

        {/* Content */}
        {loading && !data ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : (
          <FlatList
            data={overdueTasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
            ListEmptyComponent={
              <View className="mt-20 items-center justify-center">
                <MaterialIcons
                  name="assignment-turned-in"
                  size={64}
                  color={colorScheme === 'dark' ? '#374151' : '#e5e7eb'}
                />
                <Text className="mt-4 text-lg font-medium text-gray-500">No overdue tasks!</Text>
                <Text className="text-sm text-gray-400">You're all caught up.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const daysOverdue = Math.floor(
                (Date.now() - parseInt(item.dueDate)) / (1000 * 60 * 60 * 24)
              );

              return (
                <TouchableOpacity
                  onPress={() =>
                    router.push(`/(screens)/shard/${item.shardId}`)
                  }
                  className="mb-3 flex-row items-center justify-between rounded-xl bg-background-paper p-4 shadow-sm dark:bg-background-dark-paper">
                  <View className="flex-1">
                    <Text className="font-semibold text-text-primary dark:text-text-dark">
                      {item.title}
                    </Text>
                    <View className="mt-1 flex-row items-center gap-2">
                      <Text className="dark:text-text-dark-secondary text-xs text-text-secondary">
                        {item.shardTitle}
                      </Text>
                      <Text className="text-xs text-red-500">{daysOverdue} days overdue</Text>
                    </View>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={colorScheme === 'dark' ? '#6b7280' : '#9ca3af'}
                  />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

export default Backlog;
