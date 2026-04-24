import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@apollo/client';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { GET_OFFERINGS } from '@/Graphql/Queries';
import { purchasesService } from '@/services/purchasesService';
import { useUserStore } from '@/store/user.store';
import AnimatedPressable from '~/components/AnimatedPressable';
import { ACCENT, t } from '~/components/shard/constants';
import Animated, { FadeInDown } from 'react-native-reanimated';

// ─── Config ───────────────────────────────────────────────────────────────────

const PRO_FEATURES = [
  { icon: 'infinite-outline', label: 'Unlimited Shards & Mini-Goals' },
  { icon: 'flash-outline', label: 'AI-Powered Scheduling' },
  { icon: 'bar-chart-outline', label: 'Advanced Analytics' },
  { icon: 'star-outline', label: 'Priority Support' },
  { icon: 'shield-checkmark-outline', label: 'Ad-Free Experience' },
];

const PACKAGE_ID_MAP: Record<string, string> = {
  monthly: '$rc_monthly',
  yearly: '$rc_annual',
  lifetime: '$rc_lifetime',
};

const PLAN_META: Record<string, { label: string; period: string; badge?: string }> = {
  monthly: { label: 'Monthly', period: 'per month' },
  yearly:  { label: 'Yearly',  period: 'per year',  badge: 'BEST VALUE' },
  lifetime:{ label: 'Lifetime',period: 'one-time payment' },
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SubscribeToProPage() {
  const isDark = useColorScheme() === 'dark';
  const theme = t(isDark);

  const [selectedPkgId, setSelectedPkgId] = useState<string>('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const purchaseInFlight = useRef(false);

  const { data, loading, error } = useQuery(GET_OFFERINGS, { fetchPolicy: 'cache-and-network' });
  const offerings: any[] = data?.listOfferings ?? [];
  const packages: any[] = offerings.flatMap((o) => o.packages);

  const updateUser = useUserStore((state) => state.updateUser);

  const handlePurchase = useCallback(async () => {
    if (!selectedPkgId || purchaseInFlight.current) return;
    purchaseInFlight.current = true;
    setPurchasing(true);
    try {
      const rcOfferings = await purchasesService.getOfferings();
      if (!rcOfferings) {
        Toast.show({ type: 'error', text1: 'Store unavailable', text2: 'Please try again later.' });
        return;
      }
      const rcPkgId = PACKAGE_ID_MAP[selectedPkgId];
      const pkg = rcOfferings.availablePackages.find(
        (p) => p.packageType === rcPkgId || p.identifier === rcPkgId
      ) ?? rcOfferings.availablePackages[0];

      if (!pkg) throw new Error('No packages available in store.');

      const success = await purchasesService.purchasePackage(pkg);
      if (success) {
        updateUser({ subscriptionTier: 'pro' });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ type: 'success', text1: 'Welcome to Shard Pro!', text2: 'All features unlocked.' });
        router.replace('/(screens)/(tabs)/Home');
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Toast.show({ type: 'error', text1: 'Purchase Failed', text2: e.message || 'Please try again.' });
      }
    } finally {
      purchaseInFlight.current = false;
      setPurchasing(false);
    }
  }, [selectedPkgId, updateUser]);

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const isPro = await purchasesService.restorePurchases();
      if (isPro) {
        updateUser({ subscriptionTier: 'pro' });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ type: 'success', text1: 'Pro restored!', text2: 'Your subscription is active.' });
        router.back();
      } else {
        Toast.show({ type: 'info', text1: 'No subscription found', text2: 'No active Pro plan for this account.' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Restore failed', text2: 'Please try again.' });
    } finally {
      setRestoring(false);
    }
  };

  // Find monthly price to compute yearly savings
  const monthlyPkg = packages.find(p => p.identifier === 'monthly');
  const yearlyPkg  = packages.find(p => p.identifier === 'yearly');
  const savingsPct = monthlyPkg && yearlyPkg && monthlyPkg.price > 0
    ? Math.round((1 - yearlyPkg.price / (monthlyPkg.price * 12)) * 100)
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Close */}
        <AnimatedPressable onPress={() => router.back()} scaleDown={0.88} style={{ alignSelf: 'flex-start', marginBottom: 20 }}>
          <Ionicons name="close" size={24} color={theme.textSecondary} />
        </AnimatedPressable>

        {/* Hero */}
        <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', marginBottom: 28 }}>
          <LinearGradient
            colors={['#7c3aed', '#6d28d9']}
            style={{ borderRadius: 22, padding: 18, marginBottom: 16 }}>
            <Ionicons name="flash" size={36} color="#fff" />
          </LinearGradient>
          <Text style={{ fontSize: 28, fontWeight: '800', color: theme.text, textAlign: 'center', letterSpacing: -0.5 }}>
            Unlock Shard Pro
          </Text>
          <Text style={{ fontSize: 15, color: theme.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
            Supercharge your productivity with unlimited access to all features.
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={{ backgroundColor: theme.card, borderRadius: 18, padding: 20, marginBottom: 24, gap: 14, borderWidth: 1, borderColor: isDark ? theme.border : 'rgba(0,0,0,0.05)' }}>
          {PRO_FEATURES.map((f) => (
            <View key={f.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)', borderRadius: 10, padding: 9 }}>
                <Ionicons name={f.icon as any} size={18} color={ACCENT} />
              </View>
              <Text style={{ fontSize: 15, color: theme.text, fontWeight: '500', flex: 1 }}>{f.label}</Text>
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
            </View>
          ))}
        </Animated.View>

        {/* Plans */}
        {loading ? (
          <ActivityIndicator color={ACCENT} style={{ marginVertical: 32 }} />
        ) : error ? (
          <Text style={{ color: '#ef4444', textAlign: 'center', marginBottom: 24 }}>
            Could not load plans. Check your connection.
          </Text>
        ) : (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ gap: 12, marginBottom: 24 }}>
            {packages.map((pkg) => {
              const selected = selectedPkgId === pkg.identifier;
              const meta = PLAN_META[pkg.identifier] ?? { label: pkg.identifier, period: '' };
              return (
                <AnimatedPressable
                  key={pkg.identifier}
                  onPress={() => setSelectedPkgId(pkg.identifier)}
                  scaleDown={0.97}
                  style={{
                    backgroundColor: selected ? isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.07)' : theme.card,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: selected ? ACCENT : isDark ? theme.border : 'rgba(0,0,0,0.06)',
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {/* Radio */}
                    <View style={{
                      width: 22, height: 22, borderRadius: 11,
                      borderWidth: 2,
                      borderColor: selected ? ACCENT : theme.textSecondary,
                      backgroundColor: selected ? ACCENT : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />}
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>{meta.label}</Text>
                        {meta.badge && (
                          <View style={{ backgroundColor: ACCENT, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                              {meta.badge}{savingsPct && pkg.identifier === 'yearly' ? ` · SAVE ${savingsPct}%` : ''}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{meta.period}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: selected ? ACCENT : theme.text }}>
                    {pkg.priceString}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </Animated.View>
        )}

        {/* CTA */}
        <AnimatedPressable onPress={handlePurchase} disabled={purchasing || loading || !selectedPkgId} scaleDown={0.96} style={{ marginBottom: 14 }}>
          <LinearGradient
            colors={['#7c3aed', '#6d28d9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center', opacity: purchasing ? 0.7 : 1 }}>
            {purchasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>
                Continue with {PLAN_META[selectedPkgId]?.label ?? 'Plan'}
              </Text>
            )}
          </LinearGradient>
        </AnimatedPressable>

        {/* Restore */}
        <AnimatedPressable onPress={handleRestore} disabled={restoring} scaleDown={0.94} style={{ alignItems: 'center', paddingVertical: 10, marginBottom: 16 }}>
          {restoring ? (
            <ActivityIndicator color={theme.textSecondary} size="small" />
          ) : (
            <Text style={{ color: theme.textSecondary, fontSize: 14 }}>Restore Purchases</Text>
          )}
        </AnimatedPressable>

        <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
          Prices shown in {packages.find(p => p.identifier === selectedPkgId)?.currencyCode ?? 'local currency'}.{' '}
          Subscription renews automatically. Cancel anytime.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
