import React, { useCallback } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface AnimatedPressableProps {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
  children: React.ReactNode;
  scaleDown?: number;
  hitSlop?: number;
}

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 300,
  mass: 0.6,
};

const AnimatedPressable = ({
  onPress,
  disabled = false,
  style,
  className,
  children,
  scaleDown = 0.96,
  hitSlop = 0,
}: AnimatedPressableProps) => {
  const scale = useSharedValue(1);
  const opacityVal = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(scaleDown, SPRING_CONFIG);
    opacityVal.value = withSpring(0.85, SPRING_CONFIG);
  }, [scaleDown]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
    opacityVal.value = withSpring(1, SPRING_CONFIG);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacityVal.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={hitSlop}>
      <Animated.View style={[animatedStyle, style]} className={className}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default AnimatedPressable;
