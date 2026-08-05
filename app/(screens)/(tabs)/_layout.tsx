import React from 'react';
import { View, Text, Pressable, useColorScheme, StyleSheet } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hud, FONT, SHARD_GRADIENT } from '~/components/hud';

const LABELS: Record<string, string> = { Home: 'Home', schedule: 'Log', friends: 'Party', account: 'You' };

const renderIcon = (name: string, color: string, focused: boolean) => {
  switch (name) {
    case 'Home':
      return <AntDesign name="home" size={21} color={color} />;
    case 'schedule':
      return <AntDesign name="calendar" size={20} color={color} />;
    case 'friends':
      return <Ionicons name={focused ? 'people' : 'people-outline'} size={21} color={color} />;
    case 'account':
      return <AntDesign name="user" size={21} color={color} />;
    default:
      return null;
  }
};

// The core "Forge a quest" action — a crystalline shard, centered in the bar.
const CenterForge = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <Pressable onPress={() => router.push('/new-shard')} style={{ alignItems: 'center', justifyContent: 'center' }} hitSlop={10} accessibilityRole="button" accessibilityLabel="New quest">
      <View style={styles.forgeGlow} />
      <LinearGradient colors={SHARD_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.forge}>
        <LinearGradient
          colors={['rgba(255,255,255,0.4)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 0.6 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ transform: [{ rotate: '-45deg' }] }}>
          <Ionicons name="add" size={24} color="#fff" />
        </View>
      </LinearGradient>
    </Pressable>
  </View>
);

function FloatingTabBar({ state, navigation }: any) {
  const isDark = useColorScheme() === 'dark';
  const c = hud(isDark);
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 10), backgroundColor: 'transparent' }}>
      <View style={[styles.capsule, { backgroundColor: c.panel, borderColor: c.panelBorder }]}>
        {state.routes.map((route: any, index: number) => {
          if (route.name === 'new-shard-tab') return <CenterForge key={route.key} />;

          const focused = state.index === index;
          const color = focused ? c.violet : c.textFaint;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <Pressable key={route.key} onPress={onPress} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 46 }}>
              <View
                style={[
                  { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: focused ? 12 : 8, borderRadius: 20 },
                  focused && { backgroundColor: 'rgba(139,92,246,0.16)' },
                ]}>
                {renderIcon(route.name, color, focused)}
                {focused && (
                  <Text style={{ marginLeft: 7, fontFamily: FONT.semibold, fontSize: 11, color: c.violet }}>
                    {LABELS[route.name]}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Home" />
      <Tabs.Screen name="schedule" />
      <Tabs.Screen name="new-shard-tab" />
      <Tabs.Screen name="friends" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 14,
  },
  forgeGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(139,92,246,0.30)',
    transform: [{ rotate: '45deg' }],
  },
  // A rotated *rounded* square reads as a cut crystal; a rotated *hard* square
  // reads as a warning sign. Same motif, softer cut.
  forge: {
    width: 46,
    height: 46,
    borderRadius: 16,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
});
