import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { brand, FONT, RADIUS } from '~/components/hud';
import { useColorScheme } from '~/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
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
import { track } from '@/helpers/analytics';

// ─── Config ───────────────────────────────────────────────────────────────────

// Keep in sync with the benefits listed on the Play Console subscription — a
// benefit that appears in one and not the other reads as a bait-and-switch.
//
// "Ad-Free Experience" used to be here and was removed: the app has no ad SDK,
// so free users see no ads and Pro removes nothing. Selling the absence of
// something nobody experiences wasted the slot and is a benefit claim Play
// enforces against. The AI credit cap is the wall free users actually hit
// (FREE_MONTHLY_CREDITS = 15/month), so that's the honest headline.
const PRO_FEATURES = [
  { icon: 'infinite-outline', label: 'Unlimited Shards & Mini-Goals' },
  { icon: 'sparkles-outline', label: 'Unlimited AI Credits' },
  { icon: 'flash-outline', label: 'AI-Powered Scheduling' },
  { icon: 'bar-chart-outline', label: 'Advanced Analytics' },
  { icon: 'star-outline', label: 'Priority Support' },
];

const PACKAGE_ID_MAP: Record<string, string> = {
  monthly: '$rc_monthly',
  yearly: '$rc_annual',
};

/**
 * The plans we offer, in display order — annual first, because it's the one we
 * want chosen and the one that's actually good value (~49% off monthly).
 *
 * Lifetime is deliberately absent. At $199.99 it bought *unlimited AI* forever:
 * ~40 months of monthly revenue from the customers most likely to have stayed
 * longest, with a permanent support obligation, no recurring revenue, and a
 * margin that goes negative the longer the buyer sticks around. If we ever want
 * lifetime again it should be a time-boxed founder offer with a stated AI cap,
 * not a standing option.
 *
 * Anything the store returns that isn't on this list is filtered out, so a
 * leftover RevenueCat package can't render as a half-broken row.
 */
const SUPPORTED_PLANS = ['yearly', 'monthly'] as const;

const PLAN_META: Record<string, { label: string; period: string; badge?: string }> = {
  yearly:  { label: 'Yearly',  period: 'per year',  badge: 'BEST VALUE' },
  monthly: { label: 'Monthly', period: 'per month' },
};

/** Store/DB packages, filtered to what we sell and ordered for display. */
const orderPlans = (pkgs: any[]): any[] =>
  SUPPORTED_PLANS.map((id) => pkgs.find((p) => p.identifier === id)).filter(Boolean);

// Reason-specific line shown when the paywall is opened from a cap-hit.
const SOURCE_REASON: Record<string, string> = {
  ai_credits: "You're out of free AI quests this month.",
  shard_limit: "You've reached your 3-shard free limit.",
  collaborator_limit: 'Your free plan includes 1 collaborator per shard.',
  team_limit: 'Upgrade to create larger teams.',
  first_completion: 'Your free Pro run ends here — it lasted until you finished something.',
};

const dayLabel = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SubscribeToProPage() {
  const isDark = useColorScheme() === 'dark';
  const theme = t(isDark);
  const { source } = useLocalSearchParams<{ source?: string }>();
  const reason = source ? SOURCE_REASON[source] : undefined;
  const user = useUserStore((state) => state.user);
  const isOnboarding = source === 'onboarding';
  const isFirstCompletion = source === 'first_completion';
  // Server-computed: the trial ends at the first finished quest, so the effective
  // deadline can be earlier than the stored `trialEndsAt`. Recomputing it here
  // from the raw date would overstate how long the user has.
  const trialDaysLeft = user?.trialDaysRemaining ?? 0;
  const inTrial = !!user?.isInTrial && trialDaysLeft > 0;

  const [selectedPkgId, setSelectedPkgId] = useState<string>('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const purchaseInFlight = useRef(false);

  // The DB `Offering` collection is a FALLBACK only — see below.
  const { data, loading, error } = useQuery(GET_OFFERINGS, { fetchPolicy: 'cache-and-network' });
  const offerings: any[] = data?.listOfferings ?? [];
  const dbPackages: any[] = offerings.flatMap((o) => o.packages);

  /**
   * Prices come from RevenueCat, not from our database.
   *
   * The paywall used to render `priceString` straight out of Mongo while charging
   * whatever Play/App Store actually had configured — two independent sources of
   * truth for the same number. Two consequences, both bad:
   *
   *  - if they drift, we display one price and bill another, which is a store
   *    policy violation and a refund/chargeback magnet;
   *  - the stored strings are hardcoded USD, so a user in India or Brazil was
   *    shown "$50.00" and charged a completely different localised amount.
   *
   * RevenueCat's `product.priceString` is already localised and is by definition
   * the amount that will be charged. The DB values are kept only as a last-resort
   * fallback for when the store SDK is unreachable, and are labelled as approximate
   * when used.
   */
  const [rcPackages, setRcPackages] = useState<any[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    purchasesService
      .getOfferings()
      .then((o) => {
        if (cancelled || !o?.availablePackages) return;
        setRcPackages(
          o.availablePackages.map((p: any) => ({
            identifier:
              Object.keys(PACKAGE_ID_MAP).find(
                (k) => PACKAGE_ID_MAP[k] === p.packageType || PACKAGE_ID_MAP[k] === p.identifier
              ) ?? p.identifier,
            priceString: p.product?.priceString ?? '',
            price: p.product?.price ?? 0,
            currencyCode: p.product?.currencyCode ?? 'USD',
            rcPackage: p,
          }))
        );
      })
      .catch(() => {
        // Leave rcPackages null so the DB fallback renders.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const storePlans = orderPlans(rcPackages ?? []);
  const usingStorePrices = storePlans.length > 0;
  const packages: any[] = usingStorePrices ? storePlans : orderPlans(dbPackages);

  const updateUser = useUserStore((state) => state.updateUser);

  const handlePurchase = useCallback(async () => {
    if (!selectedPkgId || purchaseInFlight.current) return;
    purchaseInFlight.current = true;
    setPurchasing(true);
    track('upgrade_tap', { source: source || undefined, props: { packageId: selectedPkgId } });
    try {
      const rcOfferings = await purchasesService.getOfferings();
      if (!rcOfferings) {
        Toast.show({ type: 'error', text1: 'Store unavailable', text2: 'Please try again later.' });
        return;
      }
      // Prefer the exact package the displayed price came from — that's what makes
      // "what you see is what you're charged" true rather than hopeful.
      const displayed = packages.find((p) => p.identifier === selectedPkgId)?.rcPackage;
      const rcPkgId = PACKAGE_ID_MAP[selectedPkgId];
      const pkg =
        displayed ??
        rcOfferings.availablePackages.find(
          (p) => p.packageType === rcPkgId || p.identifier === rcPkgId
        ) ??
        rcOfferings.availablePackages[0];

      if (!pkg) throw new Error('No packages available in store.');

      const success = await purchasesService.purchasePackage(pkg);
      if (success) {
        track('purchase_completed', { source: source || undefined, props: { packageId: selectedPkgId } });
        updateUser({ subscriptionTier: 'pro' });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ type: 'success', text1: 'Welcome to Shard Pro!', text2: 'All features unlocked.' });
        router.replace('/(screens)/(tabs)/Home');
      }
    } catch (e: any) {
      track('purchase_cancelled', {
        source: source || undefined,
        props: { packageId: selectedPkgId, reason: e.userCancelled ? 'cancelled' : 'failed' },
      });
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
        <AnimatedPressable onPress={() => router.back()} scaleDown={0.88} style={{ alignSelf: 'flex-start', marginBottom: 20 }} accessibilityLabel="Close">
          <Ionicons name="close" size={24} color={theme.textSecondary} />
        </AnimatedPressable>

        {/* Hero */}
        <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', marginBottom: 28 }}>
          <LinearGradient
            colors={['#7c3aed', brand.violetDeep]}
            style={{ borderRadius: RADIUS.lg, padding: 18, marginBottom: 16 }}>
            <Ionicons name="flash" size={36} color="#fff" />
          </LinearGradient>
          <Text style={{ fontSize: 28, fontFamily: FONT.extrabold, color: theme.text, textAlign: 'center', letterSpacing: -0.5 }}>
            {isFirstCompletion
              ? 'You just finished a quest'
              : isOnboarding
                ? 'Your Pro trial is live'
                : 'Unlock Shard Pro'}
          </Text>
          {inTrial ? (
            <View style={{ backgroundColor: 'rgba(124,58,237,0.12)', borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 8, marginTop: 12 }}>
              <Text style={{ fontSize: 14, color: ACCENT, textAlign: 'center', fontFamily: FONT.semibold }}>
                🎉 {dayLabel(trialDaysLeft)} of Pro, on the house — everything below is unlocked.
              </Text>
            </View>
          ) : reason ? (
            <View style={{ backgroundColor: 'rgba(124,58,237,0.12)', borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 8, marginTop: 12 }}>
              <Text style={{ fontSize: 14, color: ACCENT, textAlign: 'center', fontFamily: FONT.semibold }}>
                {reason}
              </Text>
            </View>
          ) : null}
          <Text style={{ fontSize: 15, color: theme.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
            {isFirstCompletion
              ? 'That\u2019s the thing working. Pro keeps the AI planning, the coach and the analytics coming for the next one.'
              : isOnboarding
                ? 'Keep unlimited AI, advanced analytics and your AI coach after the trial \u2014 lock in Pro now.'
                : 'Supercharge your productivity with unlimited access to all features.'}
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(260)}
          style={{ backgroundColor: theme.card, borderRadius: RADIUS.md, padding: 20, marginBottom: 24, gap: 14, borderWidth: 1, borderColor: isDark ? theme.border : 'rgba(0,0,0,0.05)' }}>
          {PRO_FEATURES.map((f) => (
            <View key={f.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)', borderRadius: RADIUS.sm, padding: 9 }}>
                <Ionicons name={f.icon as any} size={18} color={ACCENT} />
              </View>
              <Text style={{ fontSize: 15, color: theme.text, fontFamily: FONT.medium, flex: 1 }}>{f.label}</Text>
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
          <Animated.View entering={FadeInDown.delay(150).duration(260)} style={{ gap: 12, marginBottom: 24 }}>
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
                    borderRadius: RADIUS.md,
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
                        <Text style={{ fontSize: 16, fontFamily: FONT.bold, color: theme.text }}>{meta.label}</Text>
                        {meta.badge && (
                          <View style={{ backgroundColor: ACCENT, borderRadius: RADIUS.xs, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ color: '#fff', fontSize: 9, fontFamily: FONT.extrabold }}>
                              {meta.badge}{savingsPct && pkg.identifier === 'yearly' ? ` · SAVE ${savingsPct}%` : ''}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{meta.period}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 18, fontFamily: FONT.extrabold, color: selected ? ACCENT : theme.text }}>
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
            colors={['#7c3aed', brand.violetDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: RADIUS.md, height: 56, alignItems: 'center', justifyContent: 'center', opacity: purchasing ? 0.7 : 1 }}>
            {purchasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 17, fontFamily: FONT.extrabold }}>
                Continue with {PLAN_META[selectedPkgId]?.label ?? 'Plan'}
              </Text>
            )}
          </LinearGradient>
        </AnimatedPressable>

        {/* An easy way out. Someone who just finished a quest has earned goodwill;
            trapping them behind a wall spends it. */}
        {(isOnboarding || isFirstCompletion) && (
          <AnimatedPressable
            onPress={() => router.replace('/(screens)/(tabs)/Home')}
            scaleDown={0.94}
            style={{ alignItems: 'center', paddingVertical: 12, marginBottom: 4 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 15, fontFamily: FONT.semibold }}>
              {isFirstCompletion ? 'Maybe later →' : 'Continue with my free trial →'}
            </Text>
          </AnimatedPressable>
        )}

        {/* Restore */}
        <AnimatedPressable onPress={handleRestore} disabled={restoring} scaleDown={0.94} style={{ alignItems: 'center', paddingVertical: 10, marginBottom: 16 }}>
          {restoring ? (
            <ActivityIndicator color={theme.textSecondary} size="small" />
          ) : (
            <Text style={{ color: theme.textSecondary, fontSize: 14 }}>Restore Purchases</Text>
          )}
        </AnimatedPressable>

        <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
          {usingStorePrices
            ? `Prices shown in ${packages.find((p) => p.identifier === selectedPkgId)?.currencyCode ?? 'your local currency'}, charged by the store.`
            : 'Approximate prices — your store will show the exact amount in your local currency at checkout.'}{' '}
          Subscription renews automatically. Cancel anytime.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
