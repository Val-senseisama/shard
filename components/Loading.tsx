import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Animated } from 'react-native';
import images from '@/constants/images';

interface LoadingProps {
  timing?: boolean;
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ timing, message }) => {
  const [timer, setTimer] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const pulseAnimation = Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(pulseAnimation).start();

    return () => {
      scaleAnim.setValue(1);
    };
  }, [scaleAnim]);

  useEffect(() => {
    const fadeAnimation = Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.4,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(fadeAnimation).start();

    return () => {
      fadeAnim.setValue(1);
    };
  }, [fadeAnim]);

  return (
    <View className="absolute inset-0 z-50" style={{ 
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }}>
      <View className="absolute inset-0 bg-black/50" />
      <View className="flex-1 items-center justify-center">
        <View className="items-center">
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Image
              source={images.FractalShard}
              className="h-48 mb-5"
              resizeMode="contain"
            />
          </Animated.View>
          <Animated.Text 
            style={{ opacity: fadeAnim }}
            className="text-base text-center font-bold text-white mb-3"
          >
            {message}
          </Animated.Text>
         
          {timing && (
            <Text className="text-center text-white mt-2">
              {Math.floor(timer / 60)}m {timer % 60}s
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default Loading;
