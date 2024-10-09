import React, { useEffect, useState } from 'react';
import { SplashScreen, Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { ThemeProvider, useThemeContext } from '../ThemeProviderContext';
import { lightTheme } from '../constants/theme';

const RootLayout = () => {
  const [fontsLoaded, error] = useFonts({
    "Inter-Black": require("../assets/fonts/static/Inter-Black.ttf"),
    "Inter-ExtraBold": require("../assets/fonts/static/Inter-ExtraBold.ttf"),
    "Inter-ExtraLight": require("../assets/fonts/static/Inter-ExtraLight.ttf"),
    "Inter-Light": require("../assets/fonts/static/Inter-Light.ttf"),
    "Inter-Medium": require("../assets/fonts/static/Inter-Medium.ttf"),
    "Inter-Regular": require("../assets/fonts/static/Inter-Regular.ttf"),
    "Inter-SemiBold": require("../assets/fonts/static/Inter-SemiBold.ttf"),
    "Inter-Thin": require("../assets/fonts/static/Inter-Thin.ttf"),
    "Acme-Regular": require("../assets/fonts/Acme/Acme-Regular.ttf"),
    "Inter-Bold": require("../assets/fonts/static/Inter-Bold.ttf"),
    "Inter-BoldItalic": require("../assets/fonts/static/Inter-VariableFont_slnt,wght.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded, error]);

  if (!fontsLoaded && !error) return null;
  //const { theme, setTheme } = useThemeContext();


  // useEffect(() => {
  //   setTheme(lightTheme);
  // }, []);

  return (
    <ThemeProvider initialTheme={lightTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(screens)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
};

export default RootLayout;