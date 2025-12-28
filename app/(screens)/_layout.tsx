import { Stack, Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'ios_from_right', // Hardware accelerated, smoother than simple_push
          presentation: 'card',
          gestureEnabled: true,
          animationDuration: 300, // Faster transitions
        }}>
        <Stack.Screen name="Home" />
        <Stack.Screen name="new-shard" />
        <Stack.Screen name="add-partners" />
        <Stack.Screen name="schedule" />
        <Stack.Screen name="account" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="add-friend" />
        <Stack.Screen name="friend-profile" />
        <Stack.Screen name="shard-info" />
        <Stack.Screen name="shard/[id]/index" />
        <Stack.Screen name="shard/[id]/edit" />
        <Stack.Screen name="shard/[id]/notifications" />
        <Stack.Screen name="shard/[id]/chat" />
        <Stack.Screen
          name="change-password"
          options={{
            presentation: 'transparentModal',
            animation: 'slide_from_bottom',
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen
          name="workload-settings"
          options={{
            presentation: 'transparentModal',
            animation: 'slide_from_bottom',
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen
          name="help-support"
          options={{
            presentation: 'transparentModal',
            animation: 'slide_from_bottom',
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen
          name="terms-of-service"
          options={{
            presentation: 'transparentModal',
            animation: 'slide_from_bottom',
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen
          name="privacy-policy"
          options={{
            presentation: 'transparentModal',
            animation: 'slide_from_bottom',
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack>
    </>
  );
}
