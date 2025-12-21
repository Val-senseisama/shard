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
          animation: 'slide_from_right',
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
      </Stack>
    </>
  );
}
