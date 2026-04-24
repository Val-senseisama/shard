import Purchases, { PurchasesOffering, LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';
import { CONFIG } from '../config';

const REVENUECAT_API_KEY = CONFIG.REVENUECAT_API_KEY;
const ENTITLEMENT_ID = 'Thinkertech Pro';

class PurchasesService {
  async initialize(userId?: string) {
    // Only configure on actual devices
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

    // Defensive check for missing native module (e.g. standard Expo Go or old build)
    if (!Purchases || typeof Purchases.configure !== 'function') {
      console.warn('[RevenueCat] Native module (RNPurchases) not found. RevenueCat features will be disabled until a native rebuild.');
      return;
    }

    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    
    try {
      await Purchases.configure({ 
        apiKey: REVENUECAT_API_KEY || "", 
        appUserID: userId 
      });
      console.log('✅ RevenueCat initialized for user:', userId || 'anonymous');
    } catch (e) {
      console.error('❌ RevenueCat initialization failed:', e);
    }
  }

  /**
   * Fetch current offerings (Monthly, Yearly, Lifetime)
   */
  async getOfferings(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null) {
        return offerings.current;
      }
      return null;
    } catch (e) {
      console.error('Error fetching offerings:', e);
      return null;
    }
  }

  /**
   * Check if user has active "Thinkertech Pro" entitlement
   */
  async checkEntitlement(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    } catch (e) {
      console.warn('Error checking entitlement:', e);
      return false;
    }
  }

  /**
   * Purchase a specific package
   */
  async purchasePackage(pack: any): Promise<boolean> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pack);
      return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    } catch (e: any) {
      if (!e.userCancelled) {
        console.error('Purchase error:', e);
      }
      throw e;
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases() {
    try {
      const customerInfo = await Purchases.restorePurchases();
      return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    } catch (e) {
      console.error('Restore error:', e);
      throw e;
    }
  }

  /**
   * Update the user identified in RevenueCat
   */
  async logIn(userId: string) {
    try {
      await Purchases.logIn(userId);
    } catch (e) {
      console.error('RevenueCat Login error:', e);
    }
  }

  async logOut() {
    try {
      await Purchases.logOut();
    } catch (e) {
      console.error('RevenueCat Logout error:', e);
    }
  }

  /**
   * Recover orphan / interrupted purchases.
   * Call this once after SDK init. RevenueCat will:
   *  - Complete any pending transactions in the store queue
   *  - Update the subscriber record
   * Returns true if the user gained an active entitlement as a result.
   */
  async syncOrphanPurchases(): Promise<boolean> {
    try {
      // syncAttributesAndOfferingsIfNeeded flushes pending store transactions
      await Purchases.syncAttributesAndOfferingsIfNeeded();
      // Then pull latest customer info to check entitlements
      const customerInfo = await Purchases.getCustomerInfo();
      const isPro = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
      console.log('[RevenueCat] 🔄 Orphan sync complete. isPro:', isPro);
      return isPro;
    } catch (e) {
      console.warn('[RevenueCat] Orphan sync failed:', e);
      return false;
    }
  }
}

export const purchasesService = new PurchasesService();
