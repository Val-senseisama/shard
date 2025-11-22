import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const AuthLayout = () => {
  const [fontsLoaded] = useFonts({
    'Inter-Bold': require('../../assets/fonts/Inter_24pt-Bold.ttf'),
    'Inter-SemiBold': require('../../assets/fonts/Inter_18pt-SemiBold.ttf'),
    'Inter-Regular': require('../../assets/fonts/Inter_18pt-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} initialRouteName="welcome">
        <Stack.Screen name="welcome" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="complete-profile" />
      </Stack>
      <StatusBar backgroundColor="#161622" style="light" />
    </View>
  );
};

export default AuthLayout;
