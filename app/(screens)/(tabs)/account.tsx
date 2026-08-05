import React, { useMemo } from 'react';
import { View, Text, Image, ScrollView, useColorScheme, Switch, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '~/store/user.store';
import { useAppStore } from '~/store/app.store';
import { useApolloClient } from '@apollo/client';
import { avatarUri } from '~/helpers/avatarUri';
import AnimatedPressable from '~/components/AnimatedPressable';
import Session from '~/helpers/Session';
import Toast from 'react-native-toast-message';
import RevenueCatUI from 'react-native-purchases-ui';
import { purchasesService } from '~/services/purchasesService';
import { openPaywall } from '~/helpers/paywall';
import StreakCard from '~/components/StreakCard';

// ─── Radar Chart ─────────────────────────────────────────────────────

const RADAR_SIZE = 150;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = 55;
const STAT_LABELS = ['STR', 'INT', 'CHA', 'END', 'CRE'];

const getPoint = (index: number, value: number, max: number) => {
  const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;
  const r = (value / max) * RADAR_RADIUS;
  return { x: RADAR_CENTER + r * Math.cos(angle), y: RADAR_CENTER + r * Math.sin(angle) };
};

const RadarChart = ({ stats, isDark }: { stats: number[]; isDark: boolean }) => {
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const labelPositions = Array.from({ length: 5 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return {
      x: RADAR_CENTER + (RADAR_RADIUS + 18) * Math.cos(angle),
      y: RADAR_CENTER + (RADAR_RADIUS + 18) * Math.sin(angle),
    };
  });

  const dataPoints = stats.map((v, i) => getPoint(i, v, 10));
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <Svg width={RADAR_SIZE} height={RADAR_SIZE}>
      {/* Grid rings */}
      {gridLevels.map((level) => {
        const pts = Array.from({ length: 5 }, (_, i) => getPoint(i, level * 10, 10));
        return (
          <Polygon
            key={level}
            points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)'}
            strokeWidth={0.8}
          />
        );
      })}
      {/* Axis lines */}
      {Array.from({ length: 5 }, (_, i) => {
        const pt = getPoint(i, 10, 10);
        return (
          <Line
            key={`axis-${i}`}
            x1={RADAR_CENTER}
            y1={RADAR_CENTER}
            x2={pt.x}
            y2={pt.y}
            stroke={isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)'}
            strokeWidth={0.6}
          />
        );
      })}
      {/* Data area */}
      <Polygon
        points={dataPolygon}
        fill="rgba(139,92,246,0.25)"
        stroke="#8b5cf6"
        strokeWidth={1.5}
      />
      {/* Data points */}
      {dataPoints.map((p, i) => (
        <Circle key={`dot-${i}`} cx={p.x} cy={p.y} r={3} fill="#8b5cf6" />
      ))}
      {/* Labels */}
      {labelPositions.map((pos, i) => (
        <SvgText
          key={`label-${i}`}
          x={pos.x}
          y={pos.y}
          fontSize={9}
          fontWeight="700"
          fill={isDark ? '#adaaaa' : '#767575'}
          textAnchor="middle"
          alignmentBaseline="central">
          {STAT_LABELS[i]}
        </SvgText>
      ))}
    </Svg>
  );
};

// ─── Level Thermometer ───────────────────────────────────────────────

const LevelThermometer = ({
  level,
  xp,
  isDark,
}: {
  level: number;
  xp: number;
  isDark: boolean;
}) => {
  const xpForNext = level * 1000;
  const progress = Math.min(xp / xpForNext, 1);

  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '700',
          color: isDark ? '#adaaaa' : '#767575',
          letterSpacing: 0.2,
        }}>
        Level
      </Text>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#8b5cf6' }}>{level}</Text>
      <View
        style={{
          width: 10,
          height: 100,
          borderRadius: 5,
          backgroundColor: isDark ? '#1a1a1a' : '#f3f4f6',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.15)',
        }}>
        <LinearGradient
          colors={['#8b5cf6', '#6d28d9']}
          style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            height: `${progress * 100}%`,
            borderRadius: 5,
          }}
        />
      </View>
    </View>
  );
};

// ─── Settings Row ────────────────────────────────────────────────────

interface SettingsItem {
  icon: string;
  label: string;
  action: () => void;
  toggle?: boolean;
  value?: boolean;
  onToggle?: (value: boolean) => void | Promise<void>;
}

const SettingsRow = ({
  item,
  isLast,
  isDark,
}: {
  item: SettingsItem;
  isLast: boolean;
  isDark: boolean;
}) => {
  const inner = (
    <View
      className="flex-row items-center justify-between px-4 py-3.5"
      style={
        !isLast
          ? { borderBottomWidth: 1, borderBottomColor: isDark ? '#262626' : '#f3f4f6' }
          : undefined
      }>
      <View className="flex-row items-center gap-3">
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.06)',
          }}>
          <Ionicons name={item.icon as any} size={18} color="#8b5cf6" />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '500', color: isDark ? '#fff' : '#1a1a1a' }}>
          {item.label}
        </Text>
      </View>
      {item.toggle ? (
        <Switch
          value={item.value}
          onValueChange={item.onToggle}
          trackColor={{ false: isDark ? '#484847' : '#d1d5db', true: 'rgba(139,92,246,0.4)' }}
          thumbColor={item.value ? '#8b5cf6' : isDark ? '#767575' : '#f4f3f4'}
        />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={isDark ? '#484847' : '#d1d5db'} />
      )}
    </View>
  );

  if (item.toggle) return inner;

  return (
    <AnimatedPressable onPress={item.action} scaleDown={0.98}>
      {inner}
    </AnimatedPressable>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────

const Account = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const user = useUserStore((state) => state.user);
  const { logout } = useUserStore();
  const client = useApolloClient();
  const { isDarkMode, toggleDarkMode } = useAppStore();

  const level = user?.level || 1;
  const xp = user?.xp || 0;
  const xpForNext = level * 1000;
  const stats = [
    user?.strength || 0,
    user?.intelligence || 0,
    user?.charisma || 0,
    user?.endurance || 0,
    user?.creativity || 0,
  ];

  const settingsSections: { title: string; items: SettingsItem[] }[] = useMemo(
    () => [
      {
        title: 'Account',
        items: [
          {
            icon: 'person-outline',
            label: 'Edit Profile',
            action: () => router.push('/edit-profile'),
          },
          {
            icon: 'lock-closed-outline',
            label: 'Change Password',
            action: () => router.push('/change-password'),
          },
          {
            icon: 'receipt-outline',
            label: 'Purchase History',
            action: () => router.push('/(screens)/purchase-history'),
          },
          // Free users get the prominent upsell card above; Pro users manage here.
          ...(user?.subscriptionTier === 'pro'
            ? [
                {
                  icon: 'settings-outline',
                  label: 'Manage Subscription',
                  action: () => RevenueCatUI.presentCustomerCenter(),
                },
              ]
            : []),
        ],
      },
      {
        title: 'Quests & Progress',
        items: [
          {
            icon: 'compass-outline',
            label: 'Side Quests & Challenges',
            action: () => router.push('/(screens)/side-quests'),
          },
          {
            icon: 'bar-chart-outline',
            label: 'Productivity Insights',
            action: () => router.push('/(screens)/productivity'),
          },
        ],
      },
      {
        title: 'Settings',
        items: [
          {
            icon: 'speedometer-outline',
            label: 'Workload Settings',
            action: () => router.push('/(screens)/workload-settings'),
          },
          {
            icon: 'notifications-outline',
            label: 'Notifications',
            action: () => router.push('/(screens)/notification-settings'),
          },
          {
            icon: 'moon-outline',
            label: 'Dark Mode',
            action: () => {},
            toggle: true,
            value: isDarkMode,
            onToggle: toggleDarkMode,
          },
        ],
      },
      {
        title: 'Support',
        items: [
          {
            icon: 'help-circle-outline',
            label: 'Help & Support',
            action: () => router.push('/help-support'),
          },
          {
            icon: 'document-text-outline',
            label: 'Terms of Service',
            action: () => router.push('/terms-of-service'),
          },
          {
            icon: 'shield-checkmark-outline',
            label: 'Privacy Policy',
            action: () => router.push('/privacy-policy'),
          },
        ],
      },
    ],
    [isDarkMode, toggleDarkMode, user?.subscriptionTier]
  );

  const handleLogout = async () => {
    try {
      await client.clearStore();
      await Session.clearAllCookies();
      logout();
      router.replace('/(auth)/welcome');
      Toast.show({ type: 'success', text1: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      Toast.show({ type: 'error', text1: 'Error logging out' });
    }
  };

  const cardBg = isDark ? 'rgba(26,26,26,0.6)' : 'rgba(255,255,255,0.85)';
  const cardBorder = isDark ? 'rgba(72,72,71,0.15)' : 'rgba(0,0,0,0.06)';

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#8b5cf6', letterSpacing: -0.5 }}>
          Profile
        </Text>
        <AnimatedPressable
          onPress={() => router.push('/edit-profile')}
          hitSlop={20}
          scaleDown={0.9} accessibilityLabel="Settings">
          <Ionicons name="settings-outline" size={22} color={isDark ? '#adaaaa' : '#767575'} />
        </AnimatedPressable>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ── Profile Hero ── */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          className="mx-5 mt-2 flex-row overflow-hidden rounded-3xl border"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
          {/* Left: Avatar + Info */}
          <View className="items-center p-5" style={{ width: '40%' }}>
            <View style={{ marginBottom: 10 }}>
              <Image
                source={{ uri: avatarUri(user?.profilePic, user?.username) }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  borderWidth: 3,
                  borderColor: '#8b5cf6',
                }}
              />
              {/* Level badge */}
              <View
                style={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: '#8b5cf6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: isDark ? '#0e0e0e' : '#fff',
                }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{level}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: isDark ? '#fff' : '#1a1a1a',
                  textAlign: 'center',
                }}
                numberOfLines={1}>
                {user?.username || 'User'}
              </Text>
              {user?.subscriptionTier === 'pro' && (
                <View
                  style={{
                    backgroundColor: '#FFD700',
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                    borderRadius: 4,
                  }}>
                  <Text style={{ fontSize: 8, fontWeight: '900', color: '#000' }}>PRO</Text>
                </View>
              )}
            </View>
            <Text
              style={{
                fontSize: 11,
                color: isDark ? '#767575' : '#9ca3af',
                textAlign: 'center',
                marginTop: 2,
              }}
              numberOfLines={1}>
              {user?.email || ''}
            </Text>
          </View>

          {/* Divider + Level Thermometer */}
          <View className="items-center justify-center py-4">
            <LevelThermometer level={level} xp={xp} isDark={isDark} />
          </View>

          {/* Right: Power Level + Radar */}
          <View className="flex-1 items-center justify-center p-3">
            <View className="mb-1 w-full">
              <View className="mb-1 flex-row items-center justify-between">
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: isDark ? '#adaaaa' : '#767575',
                  }}>
                  Power Level
                </Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#8b5cf6' }}>
                  Level {level}
                </Text>
              </View>
              <View
                style={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: isDark ? '#262626' : '#f3f4f6',
                  overflow: 'hidden',
                }}>
                <LinearGradient
                  colors={['#ba9eff', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: '100%',
                    width: `${Math.min((xp / xpForNext) * 100, 100)}%`,
                    borderRadius: 3,
                  }}
                />
              </View>
              <Text
                style={{
                  fontSize: 9,
                  color: isDark ? '#484847' : '#d1d5db',
                  marginTop: 2,
                  textAlign: 'right',
                }}>
                {xp}/{xpForNext}
              </Text>
            </View>
            <RadarChart stats={stats} isDark={isDark} />
          </View>
        </Animated.View>

        {/* ── Streak ── */}
        {/* Its own surface because the streak has states now (at risk, frozen,
            broken-and-repairable), not just a count. The small tile below still
            shows the number at a glance. */}
        <Animated.View entering={FadeInDown.delay(80).duration(260)} className="mx-5 mt-4">
          <StreakCard
            onRepaired={(days) =>
              Toast.show({
                type: 'success',
                text1: 'Streak restored',
                text2: `Your ${days}-day streak is back.`,
              })
            }
          />
        </Animated.View>

        {/* ── Progression Stats ── */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(260)}
          className="mx-5 mt-4 flex-row gap-3">
          {/* XP Card */}
          <View
            className="flex-1 items-center rounded-2xl border p-4"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(139,92,246,0.12)',
                marginBottom: 6,
              }}>
              <Ionicons name="flash" size={18} color="#8b5cf6" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#8b5cf6' }}>{xp}</Text>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '600',
                color: isDark ? '#767575' : '#9ca3af',
                marginTop: 2,
              }}>
              Total XP
            </Text>
          </View>

          {/* Streak Card */}
          <View
            className="flex-1 items-center rounded-2xl border p-4"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(249,115,22,0.12)',
                marginBottom: 6,
              }}>
              <Ionicons name="flame" size={18} color="#f97316" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#f97316' }}>
              {user?.currentStreak || 0}
            </Text>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '600',
                color: isDark ? '#767575' : '#9ca3af',
                marginTop: 2,
              }}>
              Day Streak
            </Text>
          </View>

          {/* Achievements Card */}
          <AnimatedPressable
            onPress={() => router.push('/(screens)/achievements')}
            style={{ flex: 1 }}
            scaleDown={0.96}>
            <View
              className="h-full items-center rounded-2xl border p-4"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(234,179,8,0.12)',
                  marginBottom: 6,
                }}>
                <Ionicons name="trophy" size={18} color="#eab308" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#eab308' }}>
                {user?.achievements?.length || 0}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: isDark ? '#767575' : '#9ca3af',
                  marginTop: 2,
                }}>
                Badges
              </Text>
            </View>
          </AnimatedPressable>
        </Animated.View>

        {/* ── Pro Upsell (free users only) ── */}
        {user?.subscriptionTier !== 'pro' && (
          <Animated.View entering={FadeInDown.delay(150).duration(260)} className="mx-5 mt-5">
            <AnimatedPressable onPress={() => openPaywall('account')} scaleDown={0.97}>
              <LinearGradient
                colors={['#7c3aed', '#6d28d9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 18,
                  padding: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name="flash" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff' }}>
                    {user?.isInTrial
                      ? `${user.trialDaysRemaining ?? 0} days of Pro left`
                      : 'Unlock Shard Pro'}
                  </Text>
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                    {user?.isInTrial
                      ? 'Lock in Pro before your free trial ends'
                      : 'Unlimited shards, AI quests & analytics'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#fff" />
              </LinearGradient>
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* ── Invite friends (referral) ── */}
        {user?.referralCode && (
          <Animated.View entering={FadeInDown.delay(150).duration(260)} className="mx-5 mt-4">
            <AnimatedPressable
              onPress={() => {
                Share.share({
                  message: `Join me on Shard — turn your goals into quests. Use my code ${user.referralCode} when you sign up and we both get bonus AI credits!`,
                }).catch(() => {});
              }}
              scaleDown={0.97}>
              <View
                style={{
                  borderRadius: 18,
                  padding: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: isDark ? '#484847' : '#d1d5db',
                }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: 'rgba(124,58,237,0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name="gift" size={22} color="#7c3aed" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: isDark ? '#fff' : '#1A1A1A' }}>Invite friends</Text>
                  <Text style={{ fontSize: 13, color: isDark ? '#B9B9B9' : '#666666', marginTop: 2 }}>
                    Your code <Text style={{ color: '#7c3aed', fontWeight: '800' }}>{user.referralCode}</Text> · you both get bonus credits
                    {(user.referralCount ?? 0) > 0 ? ` · ${user.referralCount} joined` : ''}
                  </Text>
                </View>
                <Ionicons name="share-social-outline" size={22} color={isDark ? '#B9B9B9' : '#666666'} />
              </View>
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* ── Settings Sections ── */}
        {settingsSections.map((section, sectionIndex) => (
          <Animated.View
            key={section.title}
            entering={FadeInDown.delay(200 + sectionIndex * 80).duration(260)}
            className="mx-5 mt-5">
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                color: isDark ? '#adaaaa' : '#767575',
                letterSpacing: 0.2,
                marginBottom: 8,
              }}>
              {section.title}
            </Text>
            <View
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: cardBorder,
              }}>
              {section.items.map((item, index) => (
                <SettingsRow
                  key={item.label}
                  item={item}
                  isLast={index === section.items.length - 1}
                  isDark={isDark}
                />
              ))}
            </View>
          </Animated.View>
        ))}

        {/* ── Logout ── */}
        <Animated.View entering={FadeInDown.delay(150).duration(260)} className="mx-5 mt-6">
          <AnimatedPressable onPress={handleLogout} scaleDown={0.97}>
            <View
              style={{
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: 'center',
                backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)',
              }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#ef4444' }}>Log Out</Text>
            </View>
          </AnimatedPressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Account;
