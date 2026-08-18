import { CURRENT_USER, GET_ACHIEVEMENTS } from '@/Graphql/Queries';
import { CLEAR_PENDING_ACHIEVEMENTS } from '@/Graphql/Mutations';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { useUserStore } from '@/store/user.store';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import Toast from 'react-native-toast-message';
import { purchasesService } from '@/services/purchasesService';
import { inEntitlementGrace, endEntitlementGrace } from '@/helpers/entitlementGrace';
import Purchases from 'react-native-purchases';
import { router } from 'expo-router';

const UserProvider = () => {
  const { user: storeUser, setUser, updateUser } = useUserStore();
  const [clearPending] = useMutation(CLEAR_PENDING_ACHIEVEMENTS);
  const [fetchAchievements] = useLazyQuery(GET_ACHIEVEMENTS, { fetchPolicy: 'cache-first' });

  const { refetch: refetchCurrentUser } = useQuery(CURRENT_USER, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      const fresh = data?.currentUser?.user;
      if (!fresh) return;

      // Inside the post-purchase window the server may simply not have been told
      // yet (see helpers/entitlementGrace). Writing its `free` verbatim here is
      // what wiped out the tier the paywall had just set, leaving a paying user
      // staring at the upgrade card. Hold `pro` and retry until it agrees.
      if (inEntitlementGrace() && fresh.subscriptionTier !== 'pro') {
        setUser({ ...fresh, subscriptionTier: 'pro' });
        if (graceRetry.current) clearTimeout(graceRetry.current);
        graceRetry.current = setTimeout(() => {
          refetchCurrentUser().catch(() => {});
        }, 3000);
        return;
      }

      if (fresh.subscriptionTier === 'pro') endEntitlementGrace();
      setUser(fresh);
    },
    onError: (error) => {
      console.log(error);
    },
  });

  const graceRetry = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (graceRetry.current) clearTimeout(graceRetry.current);
  }, []);

  /**
   * Replace the thin user the login screen wrote with the real one.
   *
   * `login` returns a hand-built five-field object — id, email, username, role,
   * emailVerified — and `login.tsx` sets THAT as the whole user. So straight
   * after signing in the store has no `xp`, `level`, `achievements`,
   * `currentStreak` or `profilePic`, and the app renders a real account as
   * "Total XP 0 · Level 1 · Badges 0" with a placeholder avatar.
   *
   * This provider lives in the root layout, so its `CURRENT_USER` already fired
   * once before a token existed and won't re-run on its own just because one
   * appeared. Watching for the id to show up is what closes that gap.
   *
   * Keyed on `xp === undefined` rather than on the id alone: that is precisely
   * the "came from login" signature, so a normal cold start with a fully
   * hydrated store doesn't pay for an extra round-trip.
   */
  const needsFullUser = !!storeUser?.id && storeUser?.xp === undefined;
  useEffect(() => {
    if (!needsFullUser) return;
    refetchCurrentUser()
      .then(({ data }) => {
        const fresh = data?.currentUser?.user;
        // `onCompleted` is not guaranteed to fire for a refetch, so write the
        // result here rather than relying on the callback above.
        if (fresh) setUser(fresh);
      })
      .catch(() => {
        // Offline right after login. The AppState listener below retries on the
        // next foreground.
      });
  }, [needsFullUser, refetchCurrentUser, setUser]);

  // The listener below is registered once per user id, but needs to compare
  // against the CURRENT tier. Reading storeUser directly would close over the
  // value from whenever the effect last ran.
  const tierRef = useRef(storeUser?.subscriptionTier);
  tierRef.current = storeUser?.subscriptionTier;

  // CURRENT_USER only runs on mount, so anything that changes server-side while
  // the app is open never reaches the client. A subscription expiring is the
  // case that hurts: the tier flips to `free` in the database, the app carries
  // on showing the PRO badge, and — because the upgrade CTA is hidden for Pro
  // users — there is no route back to the paywall. The user is locked out of
  // resubscribing until they kill and relaunch the app.
  //
  // Refetching whenever the app comes back to the foreground closes that
  // window, and is cheap: one query on a transition users make constantly.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refetchCurrentUser().catch(() => {
          // Offline. Keep whatever we have; the next foreground retries.
        });
      }
    });
    return () => sub.remove();
  }, [refetchCurrentUser]);

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
    //
    // Granting Pro from the client is safe — the worst case is a user briefly
    // sees features the server will confirm they paid for a moment later.
    //
    // REVOKING from the client is not. RevenueCat's CustomerInfo is served from
    // a local cache that is legitimately empty on a cold start, offline, or
    // before the SDK has finished identifying the user. Treating that as "not
    // subscribed" used to overwrite the tier the server had just told us was
    // `pro`, which silently downgraded paying users and put the upgrade wall
    // back in front of them. The database is the source of truth (see
    // Helpers/Entitlements.ts), so on a negative signal we ask it rather than
    // guessing.
    const listener = (customerInfo: any) => {
      const isPro = !!customerInfo.entitlements.active['Thinkertech Pro'];
      if (isPro && tierRef.current !== 'pro') {
        updateUser({ subscriptionTier: 'pro' });
      } else if (!isPro && tierRef.current === 'pro') {
        refetchCurrentUser().catch(() => {
          // Offline or the request failed — keep the tier we have. A real
          // expiry arrives via the RevenueCat webhook and lands on the next
          // successful fetch.
        });
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

      // Toasts don't queue — each `show` replaces the one on screen. Looping
      // over the list therefore rendered only the LAST unlock, for a moment,
      // and then the list was cleared server-side for good. Finishing a first
      // quest unlocks four at once, so the most rewarding moment in the app was
      // also the one that threw the most away.
      if (pending.length === 1) {
        const meta = byId[pending[0]];
        Toast.show({
          type: 'success',
          text1: meta?.icon ? `${meta.icon}  Achievement unlocked!` : 'Achievement unlocked!',
          // Fall back to the ID only if the lookup genuinely failed.
          text2: meta
            ? `${meta.name} — ${meta.description ?? ''}`.trim().replace(/—\s*$/, '')
            : pending[0],
          onPress: () => {
            Toast.hide();
            router.push('/(screens)/achievements');
          },
        });
      } else {
        const names = pending.map((id) => byId[id]?.name).filter(Boolean);
        const icons = pending
          .map((id) => byId[id]?.icon)
          .filter(Boolean)
          .slice(0, 3)
          .join('');
        Toast.show({
          type: 'success',
          text1: `${icons || '🏆'}  ${pending.length} achievements unlocked!`,
          text2: names.length > 0 ? `${names.join(', ')} — tap to see them` : 'Tap to see them',
          onPress: () => {
            Toast.hide();
            router.push('/(screens)/achievements');
          },
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
