import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client';
import { CURRENT_USER } from '~/Graphql/Queries';
import { UPDATE_PREFERENCES } from '~/Graphql/Mutations';
import { useAppStore } from '~/store/app.store';

const WorkloadSettings = () => {
  const colorScheme = useColorScheme();
  const { addAlert } = useAppStore();
  const [workload, setWorkload] = useState('Medium');
  const [workingDays, setWorkingDays] = useState<string[]>([]);

  const { data, loading: loadingUser } = useQuery(CURRENT_USER, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      if (data?.currentUser?.user?.preferences) {
        setWorkload(data.currentUser.user.preferences.workload || 'Medium');
        setWorkingDays(data.currentUser.user.preferences.workingDays || []);
      }
    },
  });

  const [updatePreferences, { loading: saving }] = useMutation(UPDATE_PREFERENCES);

  const handleSave = async () => {
    try {
      const { data } = await updatePreferences({
        variables: {
          input: {
            workload,
            workingDays,
          },
        },
      });

      if (data?.updatePreferences?.success) {
        addAlert({ str: 'Preferences updated successfully', type: 'success' });
        router.back();
      } else {
        addAlert({
          str: data?.updatePreferences?.message || 'Failed to update preferences',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Update preferences error:', error);
      addAlert({ str: 'Failed to update preferences', type: 'error' });
    }
  };

  const toggleDay = (day: string) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const workloads = [
    {
      id: 'Light',
      title: 'Light',
      description: 'Relaxed pace, fewer tasks per day.',
      icon: 'leaf-outline',
      color: 'bg-green-500',
    },
    {
      id: 'Medium',
      title: 'Medium',
      description: 'Balanced workload for steady progress.',
      icon: 'bicycle-outline',
      color: 'bg-blue-500',
    },
    {
      id: 'Aggressive',
      title: 'Aggressive',
      description: 'High intensity, maximum tasks per day.',
      icon: 'flame-outline',
      color: 'bg-red-500',
    },
  ];

  return (
    <View className="flex-1 justify-end bg-black/50">
      <TouchableWithoutFeedback onPress={() => router.back()}>
        <View className="absolute inset-0" />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="max-h-[85%] w-full rounded-t-3xl bg-background-paper dark:bg-background-dark-default">
        <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-gray-800">
            <TouchableOpacity onPress={() => router.back()} hitSlop={20}>
              <Ionicons name="close" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-text-primary dark:text-text-dark">
              Workload Settings
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={20}>
              {saving ? (
                <ActivityIndicator size="small" color="#8b5cf6" />
              ) : (
                <Text className="text-base font-semibold text-purple-600 dark:text-purple-400">
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 pt-4">
            {loadingUser ? (
              <ActivityIndicator size="large" color="#8b5cf6" className="mt-10" />
            ) : (
              <>
                {/* Workload Section */}
                <View className="mb-6">
                  <Text className="mb-3 text-base font-bold text-text-primary dark:text-text-dark">
                    Intensity Level
                  </Text>
                  <View className="gap-3">
                    {workloads.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => setWorkload(option.id)}
                        className={`flex-row items-center rounded-xl border p-4 ${
                          workload === option.id
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 bg-background-default dark:border-gray-700 dark:bg-background-dark-paper'
                        }`}>
                        <View
                          className={`mr-4 h-10 w-10 items-center justify-center rounded-full ${option.color}`}>
                          <Ionicons name={option.icon as any} size={20} color="#fff" />
                        </View>
                        <View className="flex-1">
                          <Text
                            className={`font-semibold ${
                              workload === option.id
                                ? 'text-purple-700 dark:text-purple-300'
                                : 'text-text-primary dark:text-text-dark'
                            }`}>
                            {option.title}
                          </Text>
                          <Text className="dark:text-text-dark-secondary text-xs text-text-secondary">
                            {option.description}
                          </Text>
                        </View>
                        {workload === option.id && (
                          <Ionicons name="checkmark-circle" size={24} color="#8b5cf6" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Working Days Section */}
                <View className="mb-8">
                  <Text className="mb-3 text-base font-bold text-text-primary dark:text-text-dark">
                    Working Days
                  </Text>
                  <Text className="dark:text-text-dark-secondary mb-4 text-sm text-text-secondary">
                    Select the days you want to receive tasks.
                  </Text>
                  <View className="flex-row flex-wrap justify-between gap-2">
                    {days.map((day) => {
                      const isSelected = workingDays.includes(day);
                      return (
                        <TouchableOpacity
                          key={day}
                          onPress={() => toggleDay(day)}
                          className={`h-12 w-12 items-center justify-center rounded-full border ${
                            isSelected
                              ? 'border-purple-500 bg-purple-500'
                              : 'border-gray-300 bg-background-default dark:border-gray-600 dark:bg-background-dark-paper'
                          }`}>
                          <Text
                            className={`font-semibold ${
                              isSelected ? 'text-white' : 'text-text-primary dark:text-text-dark'
                            }`}>
                            {day.charAt(0)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default WorkloadSettings;
