import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import BlockButton from '../BlockButton';
import images from '@/constants/images';

const { width: viewportWidth } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Turn goals into quests',
    description: 'Transform your daily tasks into exciting challenges and track your progress with a gamified experience.',
    icon: '🎯',
  },
  {
    id: '2',
    title: 'Earn XP and level up',
    description: 'Gain experience points for completing tasks and unlock achievements as you progress.',
    icon: '✨',
  },
  {
    id: '3',
    title: 'Collaborate or go solo',
    description: 'Team up with friends to achieve common goals or focus on your personal journey.',
    icon: '👥',
  },
];

export default function OnboardingSlides() {
  const [activeSlide, setActiveSlide] = useState(0);
  const router = useRouter();
  const scrollX = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const [fontsLoaded] = useFonts({
    'Inter-Bold': require('../../assets/fonts/Inter_24pt-Bold.ttf'),
    'Inter-SemiBold': require('../../assets/fonts/Inter_18pt-SemiBold.ttf'),
    'Inter-Regular': require('../../assets/fonts/Inter_18pt-Regular.ttf'),
  });

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const slide = Math.round(offsetX / viewportWidth);
    
    // Only update if we're on a new slide
    if (slide !== activeSlide) {
      scrollX.value = withSpring(slide * viewportWidth);
      setActiveSlide(slide);
    }
  };

  const goToNextSlide = () => {
    if (activeSlide < slides.length - 1) {
      const nextSlide = activeSlide + 1;
      scrollViewRef.current?.scrollTo({
        x: nextSlide * viewportWidth,
        animated: true
      });
    } else {
      // Navigate to register screen when onboarding is complete
      router.replace('/(auth)/register');
    }
  };

  const goToSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      scrollViewRef.current?.scrollTo({
        x: index * viewportWidth,
        animated: true
      });
    }
  };

  const skipToRegister = () => {
    router.replace('/(auth)/register');
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-background-default dark:bg-background-dark-default pt-4">
      {/* Skip Button */}
      <View className="flex-row justify-end px-4">
        <TouchableOpacity onPress={skipToRegister} className="p-2">
          <Text className="text-primary text-base font-iregular">Skip</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1">
        {/* Logo */}
        <View className="items-center py-2">
          <Image 
            source={images.FractalShard} 
            className="h-24 w-24"
            resizeMode="contain"
          />
        </View>
        
        {/* Slides Container */}
        <View className="flex-1 mt-4">
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{
              width: viewportWidth * slides.length,
            }}
          >
            {slides.map((slide) => (
              <View 
                key={slide.id} 
                className="flex-1 items-center px-6"
                style={{ width: viewportWidth }}
              >
                <View className="items-center w-full max-w-xs">
                  <Text className="text-5xl mb-6">{slide.icon}</Text>
                  <Text 
                    className="text-2xl text-center text-text-primary dark:text-text-dark mb-4"
                    style={{
                      fontFamily: 'Inter-Bold',
                      lineHeight: 32,
                    }}
                  >
                    {slide.title}
                  </Text>
                  <Text 
                    className="text-base text-center text-text-secondary dark:text-text-dark-secondary"
                    style={{
                      fontFamily: 'Inter-Regular',
                      lineHeight: 24,
                    }}
                  >
                    {slide.description}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Pagination */}
          <View className="flex-row justify-center items-center mt-8 mb-4">
            {slides.map((_, index) => (
              <View
                key={index}
                className={`h-2 rounded-full mx-1 ${
                  activeSlide === index 
                    ? 'bg-primary w-6' 
                    : 'bg-gray-300 dark:bg-gray-600 w-2'
                }`}
              />
            ))}
          </View>

          {/* Next Button */}
          <View className="px-6 pb-8 mt-2">
            <BlockButton
              title={activeSlide === slides.length - 1 ? 'Get Started' : 'Next'}
              onPress={goToNextSlide}
              otherStyles="w-full h-12 rounded-xl"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
