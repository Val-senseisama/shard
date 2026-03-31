import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client';
import { GET_NOTIFICATION_PREFERENCES } from '~/Graphql/Queries';

import { UPDATE_NOTIFICATION_PREFERENCES } from '~/Graphql/Mutations';
import { SEND_TEST_NOTIFICATION } from '~/Graphql/PushNotifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Alert } from 'react-native';

const NotificationSettings = () => {
  const colorScheme = useColorScheme();
  const { data, loading, error } = useQuery(GET_NOTIFICATION_PREFERENCES);
  const [updatePreferences] = useMutation(UPDATE_NOTIFICATION_PREFERENCES, {
    refetchQueries: [GET_NOTIFICATION_PREFERENCES],
    onCompleted: (data) => {
      console.log('Preferences updated successfully', data);
    },
    onError: (error) => {
      console.error('Error updating preferences:', error);
    },
  });
  const [sendTestNotification] = useMutation(SEND_TEST_NOTIFICATION);

  const [preferences, setPreferences] = useState({
    pushEnabled: true,
    emailEnabled: false,
    friendRequests: true,
    messages: true,
    shardInvites: true,
    shardUpdates: true,
    questDeadlines: true,
    achievements: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    if (data?.getNotificationPreferences?.preferences) {
      setPreferences(data.getNotificationPreferences.preferences);
    }
  }, [data]);

  // Helper to strip __typename from preferences object
  const stripTypename = (obj: any) => {
    const { __typename, ...rest } = obj;
    return rest;
  };

  const handleToggle = async (key: keyof typeof preferences) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPrefs);
    console.log(stripTypename(newPrefs), 'newPrefs');

    try {
      await updatePreferences({
        variables: {
          input: stripTypename(newPrefs),
        },
      });
    } catch (err) {
      console.error('Error updating preferences:', err);
      // Revert on error
      setPreferences(preferences);
    }
  };

  const handleTimeChange = async (type: 'start' | 'end', event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
      setShowEndPicker(false);
    }

    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;

      const key = type === 'start' ? 'quietHoursStart' : 'quietHoursEnd';
      const newPrefs = { ...preferences, [key]: timeString };
      setPreferences(newPrefs);

      try {
        await updatePreferences({
          variables: {
            input: stripTypename(newPrefs),
          },
        });
      } catch (err) {
        console.error('Error updating time:', err);
      }
    }
  };

  const parseTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    return date;
  };

  const handleTestNotification = async () => {
    try {
      const { data } = await sendTestNotification();
      if (data?.sendTestNotification?.success) {
        Alert.alert('Success', 'Test notification sent! Check your status bar.');
      } else {
        Alert.alert(
          'Error',
          data?.sendTestNotification?.message || 'Failed to send test notification.'
        );
      }
    } catch (err) {
      console.error('Error sending test notification:', err);
      Alert.alert('Error', 'Failed to send test notification.');
    }
  };

  const renderToggle = (label: string, key: string, icon: string, description?: string) => (
    <View className="mb-4 flex-row items-center justify-between">
      <View className="flex-1 pr-4">
        <View className="flex-row items-center">
          <Ionicons
            name={icon as any}
            size={20}
            color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
          />
          <Text className="ml-3 text-base font-medium text-text-primary dark:text-text-dark">
            {label}
          </Text>
        </View>
        {description && (
          <Text className="dark:text-text-dark-secondary ml-8 mt-1 text-xs text-text-secondary">
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={(preferences as any)[key]}
        onValueChange={() => handleToggle(key as keyof typeof preferences)}
        trackColor={{ false: '#d1d5db', true: '#8b5cf6' }}
        thumbColor={(preferences as any)[key] ? '#fff' : '#f4f3f4'}
        disabled={key !== 'pushEnabled' && !preferences.pushEnabled}
      />
    </View>
  );

  if (loading && !preferences) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background-paper dark:bg-background-dark-default">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      {/* Header */}
      <View className="flex-row items-center border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} hitSlop={20}>
          <Ionicons name="arrow-back" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text className="ml-4 text-lg font-bold text-text-primary dark:text-text-dark">
          Notification Settings
        </Text>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {/* Master Toggle */}
        <View className="mb-8 rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-bold text-text-primary dark:text-text-dark">
                Push Notifications
              </Text>
              <Text className="dark:text-text-dark-secondary text-sm text-text-secondary">
                Enable or disable all push notifications
              </Text>
            </View>
            <Switch
              value={preferences.pushEnabled}
              onValueChange={() => handleToggle('pushEnabled')}
              trackColor={{ false: '#d1d5db', true: '#8b5cf6' }}
              thumbColor={preferences.pushEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Granular Settings */}
        <View className="mb-6">
          <Text className="dark:text-text-dark-secondary mb-4 text-sm font-bold uppercase tracking-wider text-text-secondary">
            Notification Types
          </Text>
          <View className="rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
            {renderToggle(
              'Messages',
              'messages',
              'chatbubble-outline',
              'Direct messages and chat mentions'
            )}
            {renderToggle(
              'Friend Requests',
              'friendRequests',
              'people-outline',
              'New friend requests and acceptances'
            )}
            {renderToggle(
              'Shard Invites',
              'shardInvites',
              'mail-outline',
              'Invitations to join new shards'
            )}
            {renderToggle(
              'Shard Updates',
              'shardUpdates',
              'prism-outline',
              'Task completions and progress updates'
            )}
            {renderToggle(
              'Quest Deadlines',
              'questDeadlines',
              'alarm-outline',
              'Reminders for upcoming deadlines'
            )}
            {renderToggle(
              'Achievements',
              'achievements',
              'trophy-outline',
              'New achievements and level ups'
            )}
          </View>
        </View>

        {/* Quiet Hours */}
        <View className="mb-6">
          <Text className="dark:text-text-dark-secondary mb-4 text-sm font-bold uppercase tracking-wider text-text-secondary">
            Quiet Hours
          </Text>
          <View className="rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
            {renderToggle(
              'Enable Quiet Hours',
              'quietHoursEnabled',
              'moon-outline',
              'Mute notifications during specific times'
            )}

            {preferences.quietHoursEnabled && (
              <View className="mt-4 flex-row justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
                <TouchableOpacity
                  onPress={() => setShowStartPicker(true)}
                  className="flex-1 items-center border-r border-gray-200 dark:border-gray-700">
                  <Text className="dark:text-text-dark-secondary text-xs text-text-secondary">
                    Start Time
                  </Text>
                  <Text className="mt-1 text-lg font-bold text-blue-500">
                    {preferences.quietHoursStart}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowEndPicker(true)}
                  className="flex-1 items-center">
                  <Text className="dark:text-text-dark-secondary text-xs text-text-secondary">
                    End Time
                  </Text>
                  <Text className="mt-1 text-lg font-bold text-blue-500">
                    {preferences.quietHoursEnd}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Email Settings */}
        <View className="mb-8">
          <Text className="dark:text-text-dark-secondary mb-4 text-sm font-bold uppercase tracking-wider text-text-secondary">
            Other
          </Text>
          <View className="rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
            {renderToggle(
              'Email Notifications',
              'emailEnabled',
              'mail-open-outline',
              'Receive updates via email'
            )}
          </View>
        </View>

        {/* Debug / Test Section */}
        <View className="mb-8">
          <Text className="dark:text-text-dark-secondary mb-4 text-sm font-bold uppercase tracking-wider text-text-secondary">
            Debug
          </Text>
          <TouchableOpacity
            onPress={handleTestNotification}
            className="flex-row items-center justify-center rounded-xl bg-blue-500 p-4 active:bg-blue-600">
            <Ionicons name="notifications" size={20} color="#fff" />
            <Text className="ml-2 font-bold text-white">Send Test Notification</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Time Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={parseTime(preferences.quietHoursStart)}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(e, date) => handleTimeChange('start', e, date)}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={parseTime(preferences.quietHoursEnd)}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(e, date) => handleTimeChange('end', e, date)}
        />
      )}
    </SafeAreaView>
  );
};

export default NotificationSettings;
