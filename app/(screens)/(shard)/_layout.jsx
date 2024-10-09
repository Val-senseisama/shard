import { View, Text } from 'react-native'
import React from 'react'
import { ThemeProvider } from '../../../ThemeProviderContext';
import { Stack } from 'expo-router';

import { NavigationContainer } from "@react-navigation/native";
import { lightTheme } from '../../../constants/theme';

const ShardLayout = () => {
 
  return (
    
      <ThemeProvider initialTheme={lightTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="chat" options={{ headerShown: false }} />
          <Stack.Screen name="progress" options={{ headerShown: false }} />
          <Stack.Screen name="partners" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
  );
}

export default ShardLayout