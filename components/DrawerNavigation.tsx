if ((!Object.prototype as any)._toString) {
  Object.defineProperty(Object.prototype, '_toString', {
    value: Object.prototype.toString,
    writable: true,
    configurable: true,
  });
}

import React from 'react';
import { View, Text, Pressable, Image, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import Session from '@/helpers/Session';
import images from '@/constants/images';
import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { avatarUri } from '~/helpers/avatarUri';
import { useRoute } from '@react-navigation/native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface DrawerNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  user: Record<string, any> | null;
}

// Animated menu item component
const AnimatedMenuItem = ({
  item,
  isActive,
  onPress,
}: {
  item: any;
  isActive: boolean;
  onPress: () => void;
}) => {
  const colorScheme = useColorScheme();
  const scale = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  const bgOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const handlePressIn = () => {
    // Scale down + haptic
    Haptics?.impactAsync?.(Haptics?.ImpactFeedbackStyle?.Light);
    scale.value = withSpring(0.95, { damping: 15 });
    bgOpacity.value = withTiming(1, { duration: 100 });

    // Ripple effect
    rippleScale.value = 0;
    rippleOpacity.value = 0.3;
    rippleScale.value = withTiming(2, { duration: 600 });
    rippleOpacity.value = withTiming(0, { duration: 600 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12 });
    bgOpacity.value = withTiming(0, { duration: 200 });
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      className="relative my-3 overflow-hidden rounded-lg">
      {/* Ripple effect */}
      <Animated.View
        style={[
          rippleStyle,
          {
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 100,
            height: 100,
            marginLeft: -50,
            marginTop: -50,
            borderRadius: 50,
            backgroundColor: colorScheme === 'dark' ? '#667EEA' : '#4135F3',
          },
        ]}
      />

      {/* Background pulse */}
      <Animated.View
        style={[
          bgStyle,
          {
            position: 'absolute',
            inset: 0,
            backgroundColor:
              colorScheme === 'dark' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(65, 53, 243, 0.05)',
            borderRadius: 8,
          },
        ]}
      />

      {/* Active indicator */}
      {isActive && (
        <View
          className="absolute bottom-0 left-0 top-0 w-2 rounded-r-full"
          style={{ backgroundColor: '#667EEA' }}
        />
      )}

      {/* Content */}
      <Animated.View
        style={animatedStyle}
        className={`flex-row items-center gap-3 px-5 py-3 ${isActive ? 'pl-6' : ''}`}>
        {item.icon}
        <Text className="font-imedium text-base text-text-primary dark:text-text-dark">
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const DrawerNavigation = ({ isOpen, onClose, user }: DrawerNavigationProps) => {
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#ffffff' : '#000000';
  const route = useRoute();
  const translateX = useSharedValue(-300);

  React.useEffect(() => {
    translateX.value = withSpring(isOpen ? 0 : -300, {
      damping: 15,
      stiffness: 120,
      mass: 0.8,
    });
  }, [isOpen]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const overlayOpacity = useSharedValue(0);

  React.useEffect(() => {
    overlayOpacity.value = withTiming(isOpen ? 1 : 0, {
      duration: 200,
    });
  }, [isOpen]);

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayOpacity.value,
      pointerEvents: isOpen ? 'auto' : 'none',
    };
  });

  const handleLogout = async () => {
    await Session.clearAllCookies();
    router.replace('/login');
  };

  const isActive = (inputRoute: string) => {
    if (!route.name) return false;

    return route.name.toUpperCase() === inputRoute.toUpperCase().replace(' ', '-');
  };

  const menuItems = [
    {
      icon: <AntDesign name="home" size={32} color={iconColor} />,
      label: 'Home',
      onPress: () => router.push('/Home'),
    },
    {
      icon: <AntDesign name="calendar" size={32} color={iconColor} />,
      label: 'Schedule',
      onPress: () => router.push('/schedule'),
    },
    {
      icon: <Ionicons name="people-outline" size={32} color={iconColor} />,
      label: 'Friends',
      onPress: () => router.push('/friends'),
    },

    {
      icon: <MaterialIcons name="add-chart" size={32} color={iconColor} />,
      label: 'New Shard',
      onPress: () => router.push('/new-shard'),
    },
    {
      icon: <MaterialIcons name="assignment-late" size={32} color={iconColor} />,
      label: 'Backlog',
      onPress: () => router.push('/backlog'),
    },
    {
      icon: <AntDesign name="user" size={32} color={iconColor} />,
      label: 'Account',
      onPress: () => router.push('/account'),
    },
    {
      icon: <MaterialIcons name="logout" size={32} color={iconColor} />,
      label: 'Logout',
      onPress: handleLogout,
    },
  ];

  return (
    <>
      <Animated.View
        className="absolute inset-0 z-40 bg-black/50"
        style={overlayStyle}
        onTouchEnd={onClose}
      />
      <Animated.View
        className="absolute inset-0 z-50 min-h-screen max-w-[300px]"
        style={[animatedStyle, { borderTopRightRadius: 20, borderBottomRightRadius: 20 }]}>
        <View className="absolute bottom-0 left-0 top-0 max-w-[300px] rounded-r-3xl bg-background-paper p-4 dark:bg-background-dark-default">
          <View className="mb-8 mt-16 min-w-full flex-row items-center gap-3 rounded-xl bg-background-default px-3 py-4 dark:bg-background-dark-paper">
            <Image
              source={{ uri: avatarUri(user?.profilePic, user?.username) }}
              className="h-14 w-14 rounded-full border border-primary-start"
              style={{ backgroundColor: '#7c3aed' }}
              resizeMode="cover"
            />
            <View>
              <Text className="font-ibold text-lg text-text-primary dark:text-text-dark">
                {user?.username || 'Loading...'}
              </Text>
              <Text className="dark:text-text-dark-secondary text-sm text-text-secondary">
                {user?.email || ''}
              </Text>
            </View>
          </View>
          <View className=" flex-row items-center">
            <View className="dark:border-text-dark-grey-100 flex-1 border-b border-text-grey-100"></View>
            <Text className="px-2 font-ilight text-xl text-text-primary dark:text-text-dark">
              OPTIONS
            </Text>
            <View className="dark:border-text-dark-grey-100 flex-1 border-b border-text-grey-100"></View>
          </View>

          <View className="flex-1">
            {menuItems.map((item, index) => (
              <AnimatedMenuItem
                key={index}
                item={item}
                isActive={isActive(item.label)}
                onPress={() => {
                  item.onPress();
                  onClose();
                }}
              />
            ))}
            <View className="mb-8 flex-1 flex-col items-center justify-end gap-2">
              <Image
                source={colorScheme === 'dark' ? images.SmallLogoDark : images.SmallLogoLight}
                className="h-8"
                resizeMode="contain"
              />
              <Text className="font-ilight text-sm text-text-primary dark:text-text-dark">
                {' '}
                XaviTechSavy 2025{' '}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </>
  );
};

export default DrawerNavigation;
