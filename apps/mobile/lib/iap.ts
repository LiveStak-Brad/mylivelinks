/**
 * In-App Purchase service for mobile coin purchases
 * 
 * Handles iOS App Store and Google Play purchases with server-side verification.
 */

import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Product,
  type Purchase,
  type PurchaseError,
  fetchProducts,
} from 'react-native-iap';
import { supabase } from './supabase';

const API_BASE_URL = 'https://www.mylivelinks.com';

export interface CoinPack {
  productId: string;
  packName: string;
  usdCents: number;
  coins: number;
  description?: string;
}

// Mobile IAP product IDs - must match App Store Connect / Google Play Console
export const MOBILE_COIN_PACKS: CoinPack[] = [
  { productId: 'com.mylivelinks.app.coins_250', packName: 'Starter', usdCents: 500, coins: 250, description: 'Get started' },
  { productId: 'com.mylivelinks.app.coins_500', packName: 'Popular', usdCents: 1000, coins: 500, description: 'Best value' },
  { productId: 'com.mylivelinks.app.coins_1250', packName: 'Value', usdCents: 2500, coins: 1250, description: 'Great deal' },
  { productId: 'com.mylivelinks.app.coins_2500', packName: 'Premium', usdCents: 5000, coins: 2500, description: 'Most popular' },
  { productId: 'com.mylivelinks.app.coins_5000', packName: 'Super', usdCents: 10000, coins: 5000, description: 'Big spender' },
  { productId: 'com.mylivelinks.app.coins_12500', packName: 'Mega', usdCents: 25000, coins: 12500, description: 'Whale tier' },
  { productId: 'com.mylivelinks.app.coins_25000', packName: 'Ultra', usdCents: 50000, coins: 25000, description: 'VIP' },
  { productId: 'com.mylivelinks.app.coins_50000', packName: 'Ultimate', usdCents: 100000, coins: 50000, description: 'Maximum value' },
];

const PRODUCT_IDS = MOBILE_COIN_PACKS.map((p) => p.productId);

export type IAPState = {
  isInitialized: boolean;
  products: Product[];
  isLoading: boolean;
  error: string | null;
};

let purchaseUpdateSubscription: ReturnType<typeof purchaseUpdatedListener> | null = null;
let purchaseErrorSubscription: ReturnType<typeof purchaseErrorListener> | null = null;

/**
 * Initialize IAP connection and fetch products
 */
export async function initializeIAP(): Promise<{ products: Product[]; error: string | null }> {
  try {
    console.log('[iap] Initializing connection...');
    await initConnection();
    console.log('[iap] Connection established');

    const products = await fetchProducts({ skus: PRODUCT_IDS });
    const productList = products ?? [];
    console.log('[iap] Fetched products:', productList.length);

    return { products: productList as Product[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to initialize IAP';
    console.error('[iap] Init error:', message);
    return { products: [], error: message };
  }
}

/**
 * Clean up IAP connection
 */
export async function cleanupIAP(): Promise<void> {
  try {
    if (purchaseUpdateSubscription) {
      purchaseUpdateSubscription.remove();
      purchaseUpdateSubscription = null;
    }
    if (purchaseErrorSubscription) {
      purchaseErrorSubscription.remove();
      purchaseErrorSubscription = null;
    }
    await endConnection();
    console.log('[iap] Connection ended');
  } catch (err) {
    console.error('[iap] Cleanup error:', err);
  }
}

/**
 * Request a purchase for a coin pack
 */
export async function purchaseCoinPack(productId: string): Promise<Purchase | null> {
  try {
    console.log('[iap] Requesting purchase for:', productId);

    const purchase = await requestPurchase({ request: { sku: productId } } as any);
    if (Array.isArray(purchase)) {
      return purchase[0] ?? null;
    }
    return purchase ?? null;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Purchase failed';
    console.error('[iap] Purchase error:', message);
    throw new Error(message);
  }
}

/**
 * Confirm purchase with backend and credit coins
 */
export async function confirmPurchaseWithServer(purchase: Purchase): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData?.session?.access_token) {
      console.error('[iap] No session for confirmation:', sessionError);
      return { ok: false, error: 'Not authenticated' };
    }

    const accessToken = sessionData.session.access_token;
    const platform = Platform.OS as 'ios' | 'android';

    const body: Record<string, string | null | undefined> = {
      platform,
      productId: purchase.productId,
    };

    if (platform === 'ios') {
      body.transactionId = purchase.transactionId;
      body.transactionReceipt = (purchase as any).transactionReceipt;
    } else {
      body.purchaseToken = purchase.purchaseToken;
      body.packageName = (purchase as any).packageNameAndroid;
    }

    console.log('[iap] Confirming purchase with server:', { platform, productId: purchase.productId });

    const response = await fetch(`${API_BASE_URL}/api/coins/iap/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.error || data?.message || `Server error: ${response.status}`;
      console.error('[iap] Server confirmation failed:', errorMsg);
      return { ok: false, error: errorMsg };
    }

    console.log('[iap] Purchase confirmed, ledgerId:', data?.ledgerId);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Confirmation failed';
    console.error('[iap] Confirmation error:', message);
    return { ok: false, error: message };
  }
}

/**
 * Finish transaction after successful server confirmation
 */
export async function finishPurchase(purchase: Purchase): Promise<void> {
  try {
    await finishTransaction({ purchase, isConsumable: true });
    console.log('[iap] Transaction finished');
  } catch (err) {
    console.error('[iap] Finish transaction error:', err);
  }
}

/**
 * Set up purchase listeners for handling purchases
 */
export function setupPurchaseListeners(
  onPurchaseSuccess: (purchase: Purchase) => void,
  onPurchaseError: (error: PurchaseError) => void
): () => void {
  purchaseUpdateSubscription = purchaseUpdatedListener(onPurchaseSuccess);
  purchaseErrorSubscription = purchaseErrorListener(onPurchaseError);

  return () => {
    if (purchaseUpdateSubscription) {
      purchaseUpdateSubscription.remove();
      purchaseUpdateSubscription = null;
    }
    if (purchaseErrorSubscription) {
      purchaseErrorSubscription.remove();
      purchaseErrorSubscription = null;
    }
  };
}

/**
 * Get pack info by product ID
 */
export function getPackByProductId(productId: string): CoinPack | undefined {
  return MOBILE_COIN_PACKS.find((p) => p.productId === productId);
}

/**
 * Format price from store product
 */
export function formatProductPrice(product: Product): string {
  return (product as any).localizedPrice || `$${((product as any).price ? parseFloat(String((product as any).price)) : 0).toFixed(2)}`;
}
