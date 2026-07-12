import React from 'react';
import { View, useColorScheme, StyleSheet } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hud, FONT, SHARD_GRADIENT } from '~/components/hud';

// Active-tab HUD tick — a short bright bar riding the top facet edge of the slab.
const TabIcon = ({
  focused,
  color,
  isDark,
  render,
}: {
  focused: boolean;
  color: string;
  isDark: boolean;
  render: (color: string) => React.ReactNode;
}) => {
  const c = hud(isDark);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 48 }}>
      <View
        style={{
          position: 'absolute',
          top: -11,
          width: 22,
          height: 2,
          backgroundColor: focused ? c.violet : 'transparent',
        }}
      />
      {render(color)}
    </View>
  );
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const c = hud(isDark);

  const activeColor = c.violet;
  const inactiveColor = c.textFaint;
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
          height: 68 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 11,
          backgroundColor: c.bgElev,
          borderTopWidth: 1,
          borderTopColor: c.panelBorder,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            {/* Thin violet facet highlight riding the top edge of the slab */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: c.violet, opacity: 0.35 }} />
          </View>
        ),
        tabBarLabelStyle: {
          fontFamily: FONT.mono,
          fontSize: 9,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginTop: 5,
        },
      }}>
      <Tabs.Screen
        name="Home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} isDark={isDark} render={(cl) => <AntDesign name="home" size={21} color={cl} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Log',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} isDark={isDark} render={(cl) => <AntDesign name="calendar" size={21} color={cl} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="new-shard-tab"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={styles.createOuter}>
              {/* Crystalline shard — a rotated cut, not a soft glowing circle */}
              <LinearGradient
                colors={SHARD_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.shard, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.5)' }]}>
                <View style={styles.shardInner}>
                  <Ionicons name="add" size={26} color="#fff" />
                </View>
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
          title: 'Party',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} isDark={isDark} render={(cl) => <Ionicons name="people-outline" size={21} color={cl} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'You',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} isDark={isDark} render={(cl) => <AntDesign name="user" size={21} color={cl} />} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createOuter: {
    top: -18,
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 45°-rotated square reads as a cut shard; inner counter-rotates the icon upright.
  shard: {
    width: 46,
    height: 46,
    borderRadius: 12,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 9,
  },
  shardInner: {
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
