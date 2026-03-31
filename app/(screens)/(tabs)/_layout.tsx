import React from 'react';
import { View, useColorScheme, StyleSheet, Platform } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const activeColor = '#7c3aed';
  const inactiveColor = isDark ? '#6b7280' : '#9ca3af';
  const bottomPadding = Math.max(insets.bottom, 14);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 72 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 10,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
            {/* Main blur — cranked up high */}
            <BlurView
              intensity={Platform.OS === 'android' ? 25 : 100}
              tint={isDark ? 'dark' : 'light'}
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
            />

            {/* Tinted glass overlay — very translucent */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: isDark
                    ? 'rgba(15, 20, 35, 0.35)'
                    : 'rgba(255, 255, 255, 0.25)',
                },
              ]}
            />

            {/* Top highlight edge — the glass shine */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(255, 255, 255, 0.8)',
              }}
            />

            {/* Inner glow gradient at top */}
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(255, 255, 255, 0.06)', 'transparent']
                  : ['rgba(255, 255, 255, 0.5)', 'transparent']
              }
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 20,
              }}
            />
          </View>
        ),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="Home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <AntDesign name="home" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => (
            <AntDesign name="calendar" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="new-shard-tab"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={styles.createButtonOuter}>
              <View style={[styles.createButtonGlow, isDark && styles.createButtonGlowDark]} />
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed', '#6d28d9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createGradient}>
                <Ionicons name="add" size={30} color="#fff" />
              </LinearGradient>
            </View>
          ),
          tabBarLabel: () => null,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/new-shard');
          },
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color }) => (
            <Ionicons name="people-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => (
            <AntDesign name="user" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createButtonOuter: {
    top: -22,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonGlow: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
  },
  createButtonGlowDark: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  createGradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
});
