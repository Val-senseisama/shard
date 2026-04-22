import { Stack } from 'expo-router';
import React from 'react';

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'ios_from_right',
        presentation: 'card',
        gestureEnabled: true,
        animationDuration: 300,
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="new-shard" />
      <Stack.Screen name="add-partners" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="purchase-history" />
      <Stack.Screen
        name="friend-profile"
        options={{
          presentation: 'formSheet',
          animation: 'slide_from_bottom',
          headerShown: false,
          sheetAllowedDetents: [0.55, 0.85],
          sheetInitialDetentIndex: 0,
          sheetCornerRadius: 24,
          sheetExpandsWhenScrolledToEdge: false,
        }}
      />
      <Stack.Screen name="shard-info" />
      <Stack.Screen name="backlog" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="subscribe-pro" />
      <Stack.Screen name="notification-settings" />
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
      <Stack.Screen name="workload-settings" />
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
  );
}
