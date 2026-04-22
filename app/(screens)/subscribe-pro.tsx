import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@apollo/client';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { GET_OFFERINGS } from '@/Graphql/Queries';
import { purchasesService } from '@/services/purchasesService';
import { useUserStore } from '@/store/user.store';

const PRO_FEATURES = [
  { icon: 'infinite-outline', label: 'Unlimited Shards & Mini-Goals' },
  { icon: 'flash-outline', label: 'AI-Powered Scheduling' },
  { icon: 'bar-chart-outline', label: 'Advanced Analytics' },
  { icon: 'star-outline', label: 'Priority Support' },
  { icon: 'shield-checkmark-outline', label: 'Ad-Free Experience' },
];

// Maps server package identifier → RevenueCat package identifier
const PACKAGE_ID_MAP: Record<string, string> = {
  monthly: '$rc_monthly',
  yearly: '$rc_annual',
  lifetime: '$rc_lifetime',
};

export default function SubscribeToProPage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [selectedPkgId, setSelectedPkgId] = useState<string>('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  // Ref-based guard prevents double-tap from triggering OperationAlreadyInProgressError
  const purchaseInFlight = useRef(false);

  const { data, loading, error } = useQuery(GET_OFFERINGS, {
    fetchPolicy: 'cache-and-network',
  });

  const offerings: any[] = data?.listOfferings ?? [];
  // Flatten packages across all offerings into a single list
  const packages: any[] = offerings.flatMap((o) => o.packages);

  const bg = isDark ? '#0F172A' : '#F8FAFC';
  const card = isDark ? '#1E293B' : '#FFFFFF';
  const text = isDark ? '#F1F5F9' : '#0F172A';
  const muted = isDark ? '#94A3B8' : '#64748B';
  const accent = '#7C3AED';
  const accentLight = isDark ? '#4C1D95' : '#EDE9FE';

  const updateUser = useUserStore((state) => state.updateUser);

  const handlePurchase = useCallback(async () => {
    if (!selectedPkgId) return;
    // Hard lock: ref is synchronous, state is not — prevents double-tap race
    if (purchaseInFlight.current) return;
    purchaseInFlight.current = true;
    setPurchasing(true);
    try {
      const rcOfferings = await purchasesService.getOfferings();
      if (!rcOfferings) {
        Alert.alert('Unavailable', 'Store packages not available. Please try again later.');
        return;
      }
      const rcPkgId = PACKAGE_ID_MAP[selectedPkgId];
      const pkg = rcOfferings.availablePackages.find(
        (p) => p.packageType === rcPkgId || p.identifier === rcPkgId
      );

      let success = false;
      if (!pkg) {
        // Fallback: try all available packages
        const fallback = rcOfferings.availablePackages[0];
        if (fallback) {
          success = await purchasesService.purchasePackage(fallback);
        } else {
          throw new Error('No packages available in store.');
        }
      } else {
        success = await purchasesService.purchasePackage(pkg);
      }

      if (success) {
        // Update local store immediately so UI feels snappy
        updateUser({ subscriptionTier: 'pro' });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(screens)/(tabs)/Home');
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase Failed', e.message || 'Could not complete purchase.');
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
        Alert.alert('Restored!', 'Your Pro subscription has been restored.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Not Found', 'No active subscription found for this account.');
      }
    } catch {
      Alert.alert('Error', 'Could not restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ alignSelf: 'flex-start', marginBottom: 20 }}>
          <Ionicons name="close" size={24} color={muted} />
        </TouchableOpacity>

        {/* Title */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View
            style={{
              backgroundColor: accentLight,
              borderRadius: 20,
              padding: 16,
              marginBottom: 16,
            }}>
            <Ionicons name="flash" size={36} color={accent} />
          </View>
          <Text style={{ fontSize: 28, fontWeight: '800', color: text, textAlign: 'center' }}>
            Unlock Shard Pro
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: muted,
              textAlign: 'center',
              marginTop: 8,
              lineHeight: 22,
            }}>
            Supercharge your productivity with unlimited access to all features.
          </Text>
        </View>

        {/* Pro Features */}
        <View
          style={{
            backgroundColor: card,
            borderRadius: 16,
            padding: 20,
            marginBottom: 28,
            gap: 14,
          }}>
          {PRO_FEATURES.map((f) => (
            <View key={f.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ backgroundColor: accentLight, borderRadius: 10, padding: 8 }}>
                <Ionicons name={f.icon as any} size={20} color={accent} />
              </View>
              <Text style={{ fontSize: 15, color: text, fontWeight: '500', flex: 1 }}>
                {f.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        {loading ? (
          <ActivityIndicator color={accent} style={{ marginVertical: 32 }} />
        ) : error ? (
          <Text style={{ color: 'red', textAlign: 'center', marginBottom: 24 }}>
            Could not load plans. Please check your connection.
          </Text>
        ) : (
          <View style={{ gap: 12, marginBottom: 28 }}>
            {packages.map((pkg) => {
              const selected = selectedPkgId === pkg.identifier;
              const isPopular = pkg.identifier === 'yearly';
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  onPress={() => setSelectedPkgId(pkg.identifier)}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: selected ? accentLight : card,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: selected ? accent : 'transparent',
                    padding: 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: selected ? accent : muted,
                        backgroundColor: selected ? accent : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      {selected && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '700',
                            color: text,
                            textTransform: 'capitalize',
                          }}>
                          {pkg.identifier}
                        </Text>
                        {isPopular && (
                          <View
                            style={{
                              backgroundColor: accent,
                              borderRadius: 6,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                            }}>
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                              BEST VALUE
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 13, color: muted, marginTop: 2 }}>
                        {pkg.currencyCode}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{ fontSize: 18, fontWeight: '800', color: selected ? accent : text }}>
                    {pkg.priceString}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          onPress={handlePurchase}
          disabled={purchasing || loading || !selectedPkgId}
          activeOpacity={0.85}
          style={{
            backgroundColor: accent,
            borderRadius: 16,
            paddingVertical: 18,
            alignItems: 'center',
            opacity: purchasing || loading ? 0.7 : 1,
            marginBottom: 16,
          }}>
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>
              Continue with{' '}
              {selectedPkgId
                ? selectedPkgId.charAt(0).toUpperCase() + selectedPkgId.slice(1)
                : 'Plan'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity
          onPress={handleRestore}
          disabled={restoring}
          style={{ alignItems: 'center', paddingVertical: 8 }}>
          {restoring ? (
            <ActivityIndicator color={muted} size="small" />
          ) : (
            <Text style={{ color: muted, fontSize: 14 }}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        <Text
          style={{
            color: muted,
            fontSize: 12,
            textAlign: 'center',
            marginTop: 16,
            lineHeight: 18,
          }}>
          Prices are set in{' '}
          {packages.find((p) => p.identifier === selectedPkgId)?.currencyCode ?? 'USD'}.
          Subscription renews automatically. Cancel anytime.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
