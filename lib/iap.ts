/**
 * IAP wrapper for StreetEye.
 *
 * expo-in-app-purchases was removed in Expo SDK 44+.
 * TODO: Install react-native-iap (or RevenueCat SDK) and replace stubs below.
 *       RevenueCat is recommended: https://www.revenuecat.com/docs/getting-started/installation/reactnative
 *
 * Current behaviour: purchase/restore always throw 'IAP_NOT_CONFIGURED' so
 * the paywall UI renders correctly while the real IAP integration is pending.
 */

import { Platform } from 'react-native';
import { api } from './api/client';
import { useSubscriptionStore } from '@/store/subscription.store';

export const SKU_MONTHLY = 'streeteye_premium_monthly';

/** Initiate a purchase. Throws if IAP is not configured. */
export async function purchasePremium(): Promise<void> {
  // TODO: Replace with real IAP call once react-native-iap is installed.
  //
  // Example with react-native-iap:
  //   import { requestPurchase } from 'react-native-iap';
  //   await requestPurchase({ sku: SKU_MONTHLY });
  //
  throw new Error('IAP_NOT_CONFIGURED');
}

/** Re-verify receipt to restore a previous purchase. */
export async function restorePurchases(): Promise<void> {
  // TODO: Replace with real restore call.
  //
  // Example:
  //   import { getAvailablePurchases } from 'react-native-iap';
  //   const purchases = await getAvailablePurchases();
  //   const latest = purchases.find(p => p.productId === SKU_MONTHLY);
  //   if (latest) await verifyReceiptWithBackend(latest.transactionReceipt);
  //
  throw new Error('IAP_NOT_CONFIGURED');
}

/** Send receipt to backend to verify & activate subscription. */
export async function verifyReceiptWithBackend(receipt: string): Promise<void> {
  await api.post('/subscriptions/verify', {
    receipt,
    platform: Platform.OS.toUpperCase(),
    productId: SKU_MONTHLY,
  });
  // Refresh subscription status
  const { loadFromProfile } = useSubscriptionStore.getState();
  await loadFromProfile(true);
}
