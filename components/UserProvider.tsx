import { CURRENT_USER, GET_ACHIEVEMENTS } from '@/Graphql/Queries';
import { CLEAR_PENDING_ACHIEVEMENTS } from '@/Graphql/Mutations';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { useUserStore } from '@/store/user.store';
import { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { purchasesService } from '@/services/purchasesService';
import Purchases from 'react-native-purchases';

const UserProvider = () => {
  const { user: storeUser, setUser, updateUser } = useUserStore();
  const [clearPending] = useMutation(CLEAR_PENDING_ACHIEVEMENTS);
  const [fetchAchievements] = useLazyQuery(GET_ACHIEVEMENTS, { fetchPolicy: 'cache-first' });

  useQuery(CURRENT_USER, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      if (data?.currentUser?.user) {
        setUser(data.currentUser.user);
      }
    },
    onError: (error) => {
      console.log(error);
    },
  });

  // RevenueCat Listener & Initialization
  useEffect(() => {
    const initPurchases = async () => {
      // If we have a user in store, identify them in RevenueCat
      if (storeUser?.id) {
        await purchasesService.initialize(storeUser.id);
      } else {
        await purchasesService.initialize();
      }

      // ── Orphan purchase recovery ──────────────────────────────────────────
      // Flush any transactions that were started but not completed (e.g. app
      // was killed mid-purchase). This MUST run before the user can tap "buy"
      // again, otherwise RevenueCat throws OperationAlreadyInProgressError.
      const wasPro = await purchasesService.syncOrphanPurchases();
      if (wasPro && storeUser?.subscriptionTier !== 'pro') {
        console.log('[RevenueCat] 🎉 Orphan sync recovered a Pro subscription!');
        updateUser({ subscriptionTier: 'pro' });
      } else if (!wasPro) {
        // Also check entitlement normally in case they cancelled
        const isPro = await purchasesService.checkEntitlement();
        if (isPro && storeUser?.subscriptionTier !== 'pro') {
          updateUser({ subscriptionTier: 'pro' });
        }
      }
    };

    initPurchases();

    // Listen for customer info updates (e.g. from a background purchase or restore)
    const listener = (customerInfo: any) => {
      const isPro = !!customerInfo.entitlements.active['Thinkertech Pro'];
      if (isPro && storeUser?.subscriptionTier !== 'pro') {
        updateUser({ subscriptionTier: 'pro' });
      } else if (!isPro && storeUser?.subscriptionTier === 'pro') {
        updateUser({ subscriptionTier: 'free' });
      }
    };

    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [storeUser?.id]);

  useEffect(() => {
    const pending: string[] = storeUser?.pendingAchievements ?? [];
    if (pending.length === 0) return;

    let cancelled = false;

    // Resolve IDs → real names + emoji before celebrating. This used to toast
    // the raw ID ("You've earned a new badge: streak_7") and then immediately
    // clear the list, so the names were gone for good — on the one moment the
    // app is supposed to feel rewarding.
    (async () => {
      let byId: Record<string, { name: string; icon?: string; description?: string }> = {};
      try {
        const { data } = await fetchAchievements();
        for (const a of data?.getAchievements?.achievements ?? []) {
          byId[a.id] = { name: a.name, icon: a.icon, description: a.description };
        }
      } catch (err) {
        console.warn('Could not resolve achievement names:', err);
      }
      if (cancelled) return;

      for (const achId of pending) {
        const meta = byId[achId];
        Toast.show({
          type: 'success',
          text1: meta?.icon ? `${meta.icon}  Achievement unlocked!` : 'Achievement unlocked!',
          // Fall back to the ID only if the lookup genuinely failed.
          text2: meta ? `${meta.name} — ${meta.description ?? ''}`.trim().replace(/—\s*$/, '') : achId,
          onPress: () => Toast.hide(),
        });
      }

      // Only now is it safe to drop them server-side.
      clearPending().catch(console.error);
    })();

    return () => {
      cancelled = true;
    };
  }, [storeUser?.pendingAchievements]);

  return null;
};

export default UserProvider;
