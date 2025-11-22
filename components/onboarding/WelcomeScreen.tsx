import { Image, StyleSheet, Text, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { useCallback } from 'react';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import BlockButton from '../BlockButton';

export default function WelcomeScreen() {
  const router = useRouter();

    const [fontsLoaded] = useFonts({
      'Inter-Bold': require('../../assets/fonts/Inter_24pt-Bold.ttf'),
      'Inter-SemiBold': require('../../assets/fonts/Inter_18pt-SemiBold.ttf'),
      'Inter-Regular': require('../../assets/fonts/Inter_18pt-Regular.ttf'),
    });

  const onLayoutRootView = useCallback(() => {
    // Layout root view callback if needed
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView className="min-h-screen min-w-full flex-1 bg-background-default dark:bg-background-dark-default">
      <ScrollView className="flex-1">
        <View className="min-h-screen min-w-full flex-1 items-center p-4">
          <Animated.View 
            entering={FadeIn.duration(1000)}
            className="mb-5 mt-10"
          >
            <Image
              source={require('../../assets/images/Fractal-shard.png')}
              className="h-64 w-64"
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.duration(1000).delay(200)}
            className="mb-10 items-center"
          >
            <Text className="mb-2 text-center font-ibold text-3xl text-text-primary dark:text-text-dark">
              Welcome to Shard
            </Text>
            <Text className="text-center text-lg text-text-secondary dark:text-text-dark-secondary">
              Where goals become quests.
            </Text>
          </Animated.View>

          <Animated.View 
            entering={FadeInUp.duration(1000).delay(400)}
            className="w-full max-w-md"
          >
            <View 
              style={{
                elevation: 3,
                padding: 24,
                gap: 16,
              }}
              className="w-full rounded-2xl bg-background-paper dark:bg-background-dark-paper"
            >
              <BlockButton 
                title="Create Account"
                otherStyles="w-full h-12 rounded-xl"
                onPress={() => router.push('/(auth)/onboarding')}
                variant='outline'
              />
              
              <BlockButton 
                title="Log In"
                otherStyles="w-full h-12 rounded-xl bg-transparent"
                onPress={() => router.push('/(auth)/login')}

              />
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Keeping styles object for any additional styles that can't be handled by className
});
