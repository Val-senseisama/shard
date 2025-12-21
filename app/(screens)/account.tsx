import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  useColorScheme,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import DrawerNavigation from '~/components/DrawerNavigation';
import { useUserStore } from '~/store/user.store';
import { useAppStore } from '~/store/app.store';
import { useQuery, useMutation } from '@apollo/client';
import { GET_NOTIFICATION_PREFERENCES } from '~/Graphql/Queries';
import { UPDATE_NOTIFICATION_PREFERENCES } from '~/Graphql/Mutations';

interface SettingsItem {
  icon: string;
  label: string;
  action: () => void;
  toggle?: boolean;
  value?: boolean;
  onToggle?: (value: boolean) => void | Promise<void>;
}

const Account = () => {
  const colorScheme = useColorScheme();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const user = useUserStore((state) => state.user);
  const { isDarkMode, toggleDarkMode } = useAppStore();
  const scrollY = useSharedValue(0);

  // Notification preferences state
  const [notifPreferences, setNotifPreferences] = useState({
    pushEnabled: true,
    emailEnabled: false,
  });

  // Fetch notification preferences
  const { data: prefsData } = useQuery(GET_NOTIFICATION_PREFERENCES);
  const [updatePreferences] = useMutation(UPDATE_NOTIFICATION_PREFERENCES);

  useEffect(() => {
    if (prefsData?.getNotificationPreferences?.preferences) {
      setNotifPreferences(prefsData.getNotificationPreferences.preferences);
    }
  }, [prefsData]);

  const handleNotificationToggle = async (value: boolean) => {
    const newPrefs = { ...notifPreferences, pushEnabled: value };
    setNotifPreferences(newPrefs);
    try {
      await updatePreferences({
        variables: {
          input: newPrefs,
        },
      });
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    }
  };

  const AVATAR_MAX_SIZE = 80;
  const AVATAR_MIN_SIZE = 40;
  const AVATAR_ANIMATION_RANGE = 120;

  // Animated styles for avatar
  const avatarAnimatedStyle = useAnimatedStyle(() => {
    const size = interpolate(
      scrollY.value,
      [0, AVATAR_ANIMATION_RANGE],
      [AVATAR_MAX_SIZE, AVATAR_MIN_SIZE],
      Extrapolate.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [AVATAR_ANIMATION_RANGE * 0.3, AVATAR_ANIMATION_RANGE],
      [1, 0],
      Extrapolate.CLAMP
    );
    return { width: size, height: size, opacity: Math.max(0, Math.min(1, opacity)) };
  });

  // Animated style for header background
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [AVATAR_ANIMATION_RANGE * 0.3, AVATAR_ANIMATION_RANGE],
      [0, 1],
      Extrapolate.CLAMP
    );
    return { opacity: Math.max(0, Math.min(1, opacity)) };
  });

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // RPG Stats
  const stats = [
    { name: 'Strength', value: user?.strength || 5, icon: 'barbell-outline', color: '#ef4444' },
    { name: 'Intelligence', value: user?.intelligence || 5, icon: 'bulb-outline', color: '#3b82f6' },
    { name: 'Charisma', value: user?.charisma || 5, icon: 'chatbubbles-outline', color: '#8b5cf6' },
    { name: 'Endurance', value: user?.endurance || 5, icon: 'fitness-outline', color: '#10b981' },
    { name: 'Creativity', value: user?.creativity || 5, icon: 'color-palette-outline', color: '#f59e0b' },
  ];


  // Settings sections
  const settingsSections: { title: string; items: SettingsItem[] }[] = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline', label: 'Edit Profile', action: () => router.push('/edit-profile') },
        { icon: 'lock-closed-outline', label: 'Change Password', action: () => router.push('/change-password') },
        { icon: 'star-outline', label: 'Subscribe to Pro', action: () => {} },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { 
          icon: 'notifications-outline', 
          label: 'Notifications', 
          action: () => {},
          toggle: true,
          value: notifPreferences.pushEnabled,
          onToggle: handleNotificationToggle,
        },
        { 
          icon: 'moon-outline', 
          label: 'Dark Mode', 
          action: () => {},
          toggle: true,
          value: isDarkMode,
          onToggle: toggleDarkMode,
        },
      ],
    },
    {
      title: 'About',
      items: [
        { icon: 'help-circle-outline', label: 'Help & Support', action: () => {} },
        { icon: 'document-text-outline', label: 'Terms of Service', action: () => {} },
        { icon: 'shield-checkmark-outline', label: 'Privacy Policy', action: () => {} },
      ],
    },
  ];

  return (
    <View className="flex-1">
      <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
        <DrawerNavigation isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} user={user} />

        {/* Header with animated background */}
        <View className="relative">
          <Animated.View
            style={[headerAnimatedStyle]}
            className="absolute inset-0 bg-background-paper dark:bg-background-dark-default"
          />
          <View className="flex-row items-center justify-between px-4 py-3">
            <TouchableOpacity onPress={() => setIsDrawerOpen(true)} hitSlop={20}>
              <Ionicons
                name="menu"
                size={24}
                color={colorScheme === 'dark' ? '#fff' : '#000'}
              />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-text-primary dark:text-text-dark">
              Account
            </Text>
            <TouchableOpacity onPress={() => router.push('/edit-profile')} hitSlop={20}>
              <Ionicons
                name="create-outline"
                size={24}
                color={colorScheme === 'dark' ? '#fff' : '#000'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          className="flex-1"
          showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View className="items-center px-4 py-6">
            <Animated.View style={avatarAnimatedStyle} className="mb-4">
              <Image
                source={{ uri: user?.profilePic || 'https://via.placeholder.com/150' }}
                className="h-full w-full rounded-full bg-gray-200"
              />
            </Animated.View>
            <Text className="text-2xl font-bold text-text-primary dark:text-text-dark">
              {user?.username || 'User'}
            </Text>
            <Text className="mt-1 text-sm text-text-secondary dark:text-text-dark-secondary">
              {user?.email || 'user@example.com'}
            </Text>
            {user?.bio && (
              <Text className="mt-3 text-center text-sm text-text-secondary dark:text-text-dark-secondary">
                {user.bio}
              </Text>
            )}
          </View>

          {/* XP and Level */}
          <View className="mx-4 mb-6 rounded-2xl p-6" style={{ backgroundColor: '#8b5cf6' }}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Level</Text>
                <Text className="text-3xl font-bold text-white">{user?.level || 1}</Text>
              </View>
              <View className="h-12 w-px" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
              <View>
                <Text className="text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Total XP</Text>
                <Text className="text-3xl font-bold text-white">{user?.xp || 0}</Text>
              </View>
              <View className="h-12 w-px" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
              <View>
                <Text className="text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Achievements</Text>
                <Text className="text-3xl font-bold text-white">{user?.achievements?.length || 0}</Text>
              </View>
            </View>
          </View>

          {/* RPG Stats */}
          <View className="mx-4 mb-6">
            <Text className="mb-3 text-lg font-bold text-text-primary dark:text-text-dark">
              Character Stats
            </Text>
            <View className="gap-3">
              {stats.map((stat) => (
                <View
                  key={stat.name}
                  className="flex-row items-center rounded-xl bg-background-default p-4 dark:bg-background-dark-paper">
                  <View
                    className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${stat.color}20` }}>
                    <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-text-primary dark:text-text-dark">
                      {stat.name}
                    </Text>
                    <View className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${(stat.value / 10) * 100}%`,
                          backgroundColor: stat.color,
                        }}
                      />
                    </View>
                  </View>
                  <Text className="ml-3 text-lg font-bold" style={{ color: stat.color }}>
                    {stat.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Settings Sections */}
          {settingsSections.map((section, sectionIndex) => (
            <View key={section.title} className="mx-4 mb-6">
              <Text className="mb-3 text-lg font-bold text-text-primary dark:text-text-dark">
                {section.title}
              </Text>
              <View className="overflow-hidden rounded-xl bg-background-default dark:bg-background-dark-paper">
                {section.items.map((item, index) => (
                  <TouchableOpacity
                    key={item.label}
                    onPress={item.toggle ? undefined : item.action}
                    disabled={item.toggle}
                    className={`flex-row items-center justify-between p-4 ${
                      index !== section.items.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''
                    }`}>
                    <View className="flex-row items-center">
                      <Ionicons
                        name={item.icon as any}
                        size={22}
                        color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
                      />
                      <Text className="ml-3 text-base text-text-primary dark:text-text-dark">
                        {item.label}
                      </Text>
                    </View>
                    {item.toggle ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onToggle}
                        trackColor={{ false: '#d1d5db', true: '#8b5cf6' }}
                        thumbColor={item.value ? '#fff' : '#f4f3f4'}
                      />
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={colorScheme === 'dark' ? '#4b5563' : '#9ca3af'}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Logout Button */}
          <View className="mx-4 mb-8">
            <TouchableOpacity
              onPress={() => {
                // TODO: Implement logout
                router.replace('/login');
              }}
              className="items-center rounded-xl bg-red-500 p-4">
              <Text className="font-semibold text-white">Log Out</Text>
            </TouchableOpacity>
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default Account;