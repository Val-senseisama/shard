import { Stack, Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
   <>
   <Stack screenOptions={{
      headerShown: false,
      animation:'slide_from_right',
      
    }}>
    <Stack.Screen name="Home" />
    <Stack.Screen name="new-shard" />
    <Stack.Screen name="schedule" />
    <Stack.Screen name="settings" />
    <Stack.Screen name="account" />
    </Stack>
   </>
  );
}
