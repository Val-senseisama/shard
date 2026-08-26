import React, { useMemo } from 'react';
import { View, Text, Image, ScrollView, Switch, Share } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '~/store/user.store';
import { useAppStore, type ThemePref } from '~/store/app.store';
import { brand, hud, FONT, RADIUS } from '~/components/hud';
import { useApolloClient } from '@apollo/client';
import { avatarUri } from '~/helpers/avatarUri';
import AnimatedPressable from '~/components/AnimatedPressable';
import Session from '~/helpers/Session';
import Toast from 'react-native-toast-message';
import RevenueCatUI from 'react-native-purchases-ui';
import { purchasesService } from '~/services/purchasesService';
import { openPaywall } from '~/helpers/paywall';
import StreakCard from '~/components/StreakCard';
import { inviteMessage } from '~/constants/links';

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
          fontFamily: FONT.bold,
          color: isDark ? '#adaaaa' : '#767575',
          letterSpacing: 0.2,
        }}>
        Level
      </Text>
      <Text style={{ fontSize: 18, fontFamily: FONT.extrabold, color: brand.violet }}>{level}</Text>
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
          colors={[brand.violet, brand.violetDeep]}
          style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            height: `${progress * 100}%`,
            borderRadius: RADIUS.xs,
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
  /** Mutually-exclusive choices, rendered as a segmented control. */
  segments?: { label: string; value: string }[];
  segmentValue?: string;
  onSelectSegment?: (value: string) => void;
  /** Small muted text shown just before the chevron, e.g. a renewal date. */
  hint?: string;
}

/**
 * Segmented control for a small set of exclusive options.
 *
 * Exists because Appearance was a two-state Switch, which cannot express
 * "follow the system" — so choosing either position silently overrode the OS
 * setting with no way back to it. A switch is the wrong control for a
 * three-state choice; that mismatch was the visible half of the theming bug.
 */
const Segmented = ({
  segments,
  value,
  onSelect,
  isDark,
}: {
  segments: { label: string; value: string }[];
  value: string;
  onSelect: (v: string) => void;
  isDark: boolean;
}) => {
  const c = hud(isDark);
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: c.track,
        borderRadius: RADIUS.sm,
        padding: 2,
      }}>
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <AnimatedPressable
            key={s.value}
            onPress={() => onSelect(s.value)}
            scaleDown={0.97}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={s.label}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: RADIUS.sm - 2,
              backgroundColor: active ? c.violet : 'transparent',
            }}>
            <Text
              style={{
                fontFamily: active ? FONT.semibold : FONT.medium,
                fontSize: 12,
                color: active ? '#fff' : c.textDim,
              }}>
              {s.label}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
};

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
            borderRadius: RADIUS.xs,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.06)',
          }}>
          <Ionicons name={item.icon as any} size={18} color="#8b5cf6" />
        </View>
        <Text style={{ fontSize: 14, fontFamily: FONT.medium, color: isDark ? '#fff' : '#1a1a1a' }}>
          {item.label}
        </Text>
      </View>
      {item.segments ? (
        <Segmented
          segments={item.segments}
          value={item.segmentValue ?? ''}
          onSelect={item.onSelectSegment ?? (() => {})}
          isDark={isDark}
        />
      ) : item.toggle ? (
        <Switch
          value={item.value}
          onValueChange={item.onToggle}
          trackColor={{ false: isDark ? '#484847' : '#d1d5db', true: 'rgba(139,92,246,0.4)' }}
          thumbColor={item.value ? brand.violet : isDark ? '#767575' : '#f4f3f4'}
        />
      ) : (
        <View className="flex-row items-center" style={{ gap: 6 }}>
          {item.hint ? (
            <Text
              style={{
                fontSize: 12,
                fontFamily: FONT.medium,
                color: isDark ? '#767575' : '#9ca3af',
              }}
              numberOfLines={1}>
              {item.hint}
            </Text>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={isDark ? '#484847' : '#d1d5db'} />
        </View>
      )}
    </View>
  );

  if (item.toggle || item.segments) return inner;

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
  const themePref = useAppStore((s) => s.themePref);
  const setThemePref = useAppStore((s) => s.setThemePref);

  const level = user?.level || 1;
  const xp = user?.xp || 0;
  const xpForNext = level * 1000;

  // Renewal date for the Manage Subscription row. Absent for users who
  // subscribed before the server started recording it, and for anyone whose
  // first webhook hasn't landed yet — so the row degrades to no hint rather
  // than showing "Invalid Date".
  const renewalHint = useMemo(() => {
    const raw = (user as any)?.subscriptionExpiresAt;
    if (!raw) return undefined;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return undefined;
    const when = date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    // Past date = cancelled but still inside the paid period.
    return date.getTime() < Date.now() ? `Ended ${when}` : `Renews ${when}`;
  }, [(user as any)?.subscriptionExpiresAt]);
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
                  // The renewal date is the thing people actually open this row
                  // to find. Showing it inline means the common question is
                  // answered without a round trip into the Customer Center.
                  hint: renewalHint,
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
            label: 'Appearance',
            action: () => {},
            segments: [
              { label: 'System', value: 'system' },
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
            ],
            segmentValue: themePref,
            onSelectSegment: (v) => setThemePref(v as ThemePref),
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
    [themePref, setThemePref, user?.subscriptionTier]
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
        <Text style={{ fontSize: 22, fontFamily: FONT.bold, color: brand.violet, letterSpacing: -0.5 }}>
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
                  borderColor: brand.violet,
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
                  backgroundColor: brand.violet,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: isDark ? '#0e0e0e' : '#fff',
                }}>
                <Text style={{ fontSize: 10, fontFamily: FONT.extrabold, color: '#fff' }}>{level}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: FONT.bold,
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
                    borderRadius: RADIUS.xs,
                  }}>
                  <Text style={{ fontSize: 8, fontFamily: FONT.black, color: '#000' }}>PRO</Text>
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
                    fontFamily: FONT.bold,
                    color: isDark ? '#adaaaa' : '#767575',
                  }}>
                  Power Level
                </Text>
                <Text style={{ fontSize: 10, fontFamily: FONT.bold, color: brand.violet }}>
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
                  colors={['#ba9eff', brand.violet]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: '100%',
                    width: `${Math.min((xp / xpForNext) * 100, 100)}%`,
                    borderRadius: RADIUS.xs,
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

        {/* ── Progression Stats ── */}
        <Animated.View
          entering={FadeInDown.delay(80).duration(260)}
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
            <Text style={{ fontSize: 20, fontFamily: FONT.extrabold, color: brand.violet }}>{xp}</Text>
            <Text
              style={{
                fontSize: 10,
                fontFamily: FONT.semibold,
                color: isDark ? '#767575' : '#9ca3af',
                marginTop: 2,
              }}>
              Total XP
            </Text>
          </View>

          {/* Level Card */}
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
              <Ionicons name="star" size={18} color="#8b5cf6" />
            </View>
            <Text style={{ fontSize: 20, fontFamily: FONT.extrabold, color: brand.violet }}>
              {level}
            </Text>
            <Text
              style={{
                fontSize: 10,
                fontFamily: FONT.semibold,
                color: isDark ? '#767575' : '#9ca3af',
                marginTop: 2,
              }}>
              Level
            </Text>
          </View>

          {/* Achievements Card */}
          <AnimatedPressable
            onPress={() => router.push('/(screens)/achievements')}
            containerStyle={{ flex: 1 }} style={{ }}
            scaleDown={0.96}>
            <View
              className="items-center rounded-2xl border p-4"
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
              <Text style={{ fontSize: 20, fontFamily: FONT.extrabold, color: '#eab308' }}>
                {user?.achievements?.length || 0}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: FONT.semibold,
                  color: isDark ? '#767575' : '#9ca3af',
                  marginTop: 2,
                }}>
                Badges
              </Text>
            </View>
          </AnimatedPressable>
        </Animated.View>

        {/* ── Streak ── */}
        {/* Its own surface because the streak has states now (at risk, frozen,
            broken-and-repairable), not just a count. The small tile below still
            shows the number at a glance.

            Deliberately NOT an entering animation, unlike its neighbours. This
            card's size depends on data that arrives after mount — the repair
            block only exists in the broken state and adds ~115px — and a
            Reanimated layout animation snapshots the view's frame. Animating a
            container that then grows leaves the native view holding the old
            frame, so the card painted its content outside its own bounds and
            behind the Pro banner and the Account list, which had been laid out
            in the space it never reserved. Every sibling here mounts at its full
            size in one go; this one does not, so it does not get the animation. */}
        <View className="mx-5 mt-4">
          <StreakCard
            onRepaired={(days) =>
              Toast.show({
                type: 'success',
                text1: 'Streak restored',
                text2: `Your ${days}-day streak is back.`,
              })
            }
          />
        </View>

        {/* ── Pro Upsell (free users only) ── */}
        {/* No `entering` here, unlike the sections above it.

            A Reanimated entering animation captures the view's layout at MOUNT.
            This block is gated on `user`, so it mounts after the first paint —
            at a moment when the streak card above it is still the height of its
            loading skeleton. It froze at that position and never moved again,
            which is why it was drawn over the streak card ~110dp too high.

            The rule this encodes: `entering` is only safe on a view that exists
            at first paint. Anything that mounts on async data must not carry
            one, because there is no guarantee the layout above it has settled. */}
        {user?.subscriptionTier !== 'pro' && (
          <View className="mx-5 mt-5">
            <AnimatedPressable onPress={() => openPaywall('account')} scaleDown={0.97}>
              <LinearGradient
                colors={['#7c3aed', brand.violetDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: RADIUS.md,
                  padding: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: RADIUS.sm,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name="flash" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontFamily: FONT.extrabold, color: '#fff' }}>
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
          </View>
        )}

        {/* ── Invite friends (referral) ── */}
        {/* Same reason as the Pro block above: mounts on async user data. */}
        {user?.referralCode && (
          <View className="mx-5 mt-4">
            <AnimatedPressable
              onPress={() => {
                Share.share({
                  message: inviteMessage(user.referralCode!),
                }).catch(() => {});
              }}
              scaleDown={0.97}>
              <View
                style={{
                  borderRadius: RADIUS.md,
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
                    borderRadius: RADIUS.sm,
                    backgroundColor: 'rgba(124,58,237,0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name="gift" size={22} color="#7c3aed" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontFamily: FONT.extrabold, color: isDark ? '#fff' : '#1A1A1A' }}>Invite friends</Text>
                  <Text style={{ fontSize: 13, color: isDark ? '#B9B9B9' : '#666666', marginTop: 2 }}>
                    Your code <Text style={{ color: '#7c3aed', fontFamily: FONT.extrabold }}>{user.referralCode}</Text> · you both get bonus credits
                    {(user.referralCount ?? 0) > 0 ? ` · ${user.referralCount} joined` : ''}
                  </Text>
                </View>
                <Ionicons name="share-social-outline" size={22} color={isDark ? '#B9B9B9' : '#666666'} />
              </View>
            </AnimatedPressable>
          </View>
        )}

        {/* ── Settings Sections ── */}
        {/* No `entering`, for the same reason as the two blocks above — these sit
            below the streak card, whose height is not known until GET_STREAKS
            resolves. A Reanimated entering animation on Android commits an
            absolute frame; when the card above then grows from its skeleton to
            its full height, these do not move, and the section is drawn on top
            of the Pro banner instead of below it. */}
        {settingsSections.map((section) => (
          <View key={section.title} className="mx-5 mt-5">
            <Text
              style={{
                fontSize: 10,
                fontFamily: FONT.bold,
                color: isDark ? '#adaaaa' : '#767575',
                letterSpacing: 0.2,
                marginBottom: 8,
              }}>
              {section.title}
            </Text>
            <View
              style={{
                borderRadius: RADIUS.md,
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
          </View>
        ))}

        {/* ── Logout ── */}
        <View className="mx-5 mt-6">
          <AnimatedPressable onPress={handleLogout} scaleDown={0.97}>
            <View
              style={{
                borderRadius: RADIUS.md,
                paddingVertical: 14,
                alignItems: 'center',
                backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)',
              }}>
              <Text style={{ fontSize: 14, fontFamily: FONT.semibold, color: '#ef4444' }}>Log Out</Text>
            </View>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Account;
