import { CURRENT_USER } from '@/Graphql/Queries';
import { CLEAR_PENDING_ACHIEVEMENTS } from '@/Graphql/Mutations';
import { useQuery, useMutation } from '@apollo/client';
import { useUserStore } from '@/store/user.store';
import { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { purchasesService } from '@/services/purchasesService';
import Purchases from 'react-native-purchases';

const UserProvider = () => {
  const { user: storeUser, setUser, updateUser } = useUserStore();
  const [clearPending] = useMutation(CLEAR_PENDING_ACHIEVEMENTS);

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
    if (storeUser?.pendingAchievements && storeUser.pendingAchievements.length > 0) {
      // Show toast for each pending achievement
      storeUser.pendingAchievements.forEach((achId: string) => {
        Toast.show({
          type: 'success',
          text1: 'Achievement Unlocked!',
          text2: `You've earned a new badge: ${achId}`,
          onPress: () => Toast.hide(),
        });
      });

      // Clear them on the server
      clearPending().catch(console.error);
    }
  }, [storeUser?.pendingAchievements]);

  return null;
};

export default UserProvider;
