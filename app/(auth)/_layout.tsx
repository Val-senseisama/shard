import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

const AuthLayout = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0f' },
        }}
        initialRouteName="welcome">
        <Stack.Screen name="welcome" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="complete-profile" />
      </Stack>
      <StatusBar style="light" translucent backgroundColor="transparent" />
    </View>
  );
};

export default AuthLayout;
