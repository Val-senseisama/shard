import { View } from 'react-native';
import { Stack } from 'expo-router';
import OnboardingSlides from '../../components/onboarding/OnboardingSlides';

export default function OnboardingScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <OnboardingSlides />
    </View>
  );
}
