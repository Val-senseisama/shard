import { View } from 'react-native';
import { Stack } from 'expo-router';
import WelcomeScreen from '../../components/onboarding/WelcomeScreen';

export default function WelcomePage() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <WelcomeScreen />
    </View>
  );
}
