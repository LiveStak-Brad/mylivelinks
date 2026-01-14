import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { Product, Purchase, PurchaseError } from 'react-native-iap';

import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../theme/useTheme';
import {
  MOBILE_COIN_PACKS,
  initializeIAP,
  cleanupIAP,
  purchaseCoinPack,
  confirmPurchaseWithServer,
  finishPurchase,
  setupPurchaseListeners,
  getPackByProductId,
  formatProductPrice,
  type CoinPack,
} from '../lib/iap';

const API_BASE_URL = 'https://www.mylivelinks.com';

type NormalizedTransaction = {
  id: string;
  type: 'coin_purchase' | 'gift_sent' | 'gift_received' | 'conversion' | 'cashout';
  asset: 'coin' | 'diamond' | 'usd';
  amount: number;
  direction: 'in' | 'out';
  description: string;
  created_at: string;
};

export default function WalletScreen() {
  const { mode, colors } = useTheme();
  const { user } = useAuth();
  const [coinBalance, setCoinBalance] = useState(0);
  const [diamondBalance, setDiamondBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // IAP state
  const [iapProducts, setIapProducts] = useState<Product[]>([]);
  const [iapInitialized, setIapInitialized] = useState(false);
  const [iapError, setIapError] = useState<string | null>(null);
  const [purchasingProductId, setPurchasingProductId] = useState<string | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedPack, setSelectedPack] = useState<CoinPack | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const purchaseInProgressRef = useRef(false);

  // Cashout modal state
  const [cashoutModalVisible, setCashoutModalVisible] = useState(false);

  // Transaction history state
  const [transactions, setTransactions] = useState<NormalizedTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  // Initialize IAP on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { products, error: initError } = await initializeIAP();
      if (!mounted) return;

      if (initError) {
        setIapError(initError);
      } else {
        setIapProducts(products);
        setIapInitialized(true);
      }
    };

    void init();

    return () => {
      mounted = false;
      void cleanupIAP();
    };
  }, []);

  // Set up purchase listeners
  useEffect(() => {
    const handlePurchaseSuccess = async (purchase: Purchase) => {
      if (purchaseInProgressRef.current) return;
      purchaseInProgressRef.current = true;

      try {
        console.log('[wallet] Purchase received:', purchase.productId);

        // Confirm with server
        const result = await confirmPurchaseWithServer(purchase);

        if (result.ok) {
          // Finish the transaction
          await finishPurchase(purchase);

          // Refresh balances
          await fetchBalances();

          const pack = getPackByProductId(purchase.productId);
          Alert.alert(
            'Purchase Successful!',
            `You received ${pack?.coins.toLocaleString() ?? '???'} coins!`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Purchase Failed', result.error || 'Could not verify purchase with server.');
        }
      } catch (err) {
        console.error('[wallet] Purchase handling error:', err);
        Alert.alert('Error', 'An error occurred processing your purchase.');
      } finally {
        setPurchasingProductId(null);
        purchaseInProgressRef.current = false;
      }
    };

    const handlePurchaseError = (error: PurchaseError) => {
      console.error('[wallet] Purchase error:', error);
      setPurchasingProductId(null);
      purchaseInProgressRef.current = false;

      // Don't show alert for user cancellation
      if ((error as any).code === 'E_USER_CANCELLED' || error.code === 'user-cancelled') {
        return;
      }

      Alert.alert('Purchase Failed', error.message || 'An error occurred during purchase.');
    };

    const cleanup = setupPurchaseListeners(handlePurchaseSuccess, handlePurchaseError);
    return cleanup;
  }, []);

  const fetchBalances = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('coin_balance, earnings_balance')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('[wallet] fetch error:', fetchError.message);
        setError('Failed to load balances');
        return;
      }

      setCoinBalance(data?.coin_balance ?? 0);
      setDiamondBalance(data?.earnings_balance ?? 0);
    } catch (err) {
      console.error('[wallet] exception:', err);
      setError('Failed to load balances');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchTransactions = useCallback(async () => {
    if (!user?.id) return;

    try {
      setTransactionsLoading(true);
      setTransactionsError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        setTransactionsError('Not authenticated');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/transactions?limit=10`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('[wallet] transactions fetch error:', err);
      setTransactionsError('Could not load transactions');
    } finally {
      setTransactionsLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void fetchBalances();
      void fetchTransactions();
    }, [fetchBalances, fetchTransactions])
  );

  // Cashout handlers
  const handleCashoutPress = () => {
    setCashoutModalVisible(true);
  };

  const handleOpenWebCashout = async () => {
    setCashoutModalVisible(false);
    const url = `${API_BASE_URL}/wallet`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Could not open web browser');
      }
    } catch (err) {
      console.error('[wallet] Linking error:', err);
      Alert.alert('Error', 'Failed to open cashout page');
    }
  };

  const handleViewTransactionsOnWeb = async () => {
    const url = `${API_BASE_URL}/wallet`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Could not open web browser');
      }
    } catch (err) {
      console.error('[wallet] Linking error:', err);
      Alert.alert('Error', 'Failed to open transactions page');
    }
  };

  const getTransactionIcon = (tx: NormalizedTransaction): string => {
    switch (tx.type) {
      case 'coin_purchase': return '💰';
      case 'gift_sent': return '🎁';
      case 'gift_received': return '💎';
      case 'conversion': return '🔄';
      case 'cashout': return '💵';
      default: return '📝';
    }
  };

  const formatTransactionAmount = (tx: NormalizedTransaction): string => {
    const sign = tx.direction === 'in' ? '+' : '-';
    if (tx.asset === 'usd') {
      return `${sign}$${(tx.amount / 100).toFixed(2)}`;
    }
    return `${sign}${tx.amount.toLocaleString()} ${tx.asset === 'coin' ? '🪙' : '💎'}`;
  };

  const formatTransactionDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const themed = useMemo(
    () => ({
      bg: colors.bg,
      surface: colors.surface,
      text: colors.text,
      mutedText: colors.mutedText,
      subtleText: (colors as any).subtleText ?? colors.mutedText,
      border: colors.border,
      cardBg: mode === 'dark' ? '#1a1a1a' : colors.surface,
      cardBorder: mode === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border,
      coinGlow: mode === 'dark' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(251, 191, 36, 0.15)',
      diamondGlow: mode === 'dark' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.15)',
      coinBorder: mode === 'dark' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 191, 36, 0.5)',
      diamondBorder: mode === 'dark' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.5)',
      packCardBg: mode === 'dark' ? '#1a1a1a' : colors.surface,
      packCardBorder: mode === 'dark' ? '#333' : colors.border,
    }),
    [mode, colors]
  );

  // Handle pack selection - show confirmation modal
  const handlePackPress = (pack: CoinPack) => {
    const product = iapProducts.find((p) => (p as any).productId === pack.productId || (p as any).id === pack.productId);
    setSelectedPack(pack);
    setSelectedProduct(product || null);
    setConfirmModalVisible(true);
  };

  // Handle purchase confirmation
  const handleConfirmPurchase = async () => {
    if (!selectedPack || purchasingProductId) return;

    setConfirmModalVisible(false);
    setPurchasingProductId(selectedPack.productId);

    try {
      await purchaseCoinPack(selectedPack.productId);
      // Purchase listener will handle the rest
    } catch (err) {
      console.error('[wallet] Purchase request error:', err);
      setPurchasingProductId(null);
      Alert.alert('Purchase Failed', err instanceof Error ? err.message : 'Could not initiate purchase.');
    }
  };

  // Get display price for a pack
  const getPackDisplayPrice = (pack: CoinPack): string => {
    const product = iapProducts.find((p) => (p as any).productId === pack.productId || (p as any).id === pack.productId);
    if (product) {
      return formatProductPrice(product);
    }
    return `$${(pack.usdCents / 100).toFixed(2)}`;
  };

  const renderPackCard = (pack: CoinPack) => {
    const isPurchasing = purchasingProductId === pack.productId;
    const isDisabled = !iapInitialized || !!purchasingProductId;

    return (
      <TouchableOpacity 
        key={pack.productId}
        style={[
          styles.packCard, 
          { backgroundColor: themed.packCardBg, borderColor: themed.packCardBorder },
          isPurchasing && styles.packCardPurchasing,
        ]}
        disabled={isDisabled}
        onPress={() => handlePackPress(pack)}
        activeOpacity={0.7}
      >
        {isPurchasing && (
          <View style={styles.packLoadingOverlay}>
            <ActivityIndicator size="small" color="#22c55e" />
          </View>
        )}
        <Text style={[styles.packName, { color: themed.mutedText }]}>{pack.packName}</Text>
        <Text style={styles.packPrice}>{getPackDisplayPrice(pack)}</Text>
        <Text style={[styles.packCoins, { color: themed.text }]}>{pack.coins.toLocaleString()} 🪙</Text>
        {pack.description && (
          <Text style={[styles.packDescription, { color: themed.subtleText }]}>{pack.description}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themed.bg }]} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>💼</Text>
          <View>
            <Text style={[styles.headerTitle, { color: themed.text }]}>Wallet</Text>
            <Text style={[styles.headerSubtitle, { color: themed.mutedText }]}>Manage your coins and earnings</Text>
          </View>
        </View>

        <View style={styles.balanceSection}>
          {error && (
            <TouchableOpacity 
              style={[styles.errorBanner, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
              onPress={() => void fetchBalances()}
            >
              <Text style={styles.errorText}>{error}</Text>
              <Text style={[styles.errorRetry, { color: themed.mutedText }]}>Tap to retry</Text>
            </TouchableOpacity>
          )}
          <View style={[styles.balanceCard, { backgroundColor: themed.cardBg, borderColor: themed.coinBorder }]}>
            <View style={[styles.balanceGlow, { backgroundColor: themed.coinGlow }]} />
            <View style={styles.balanceContent}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceEmoji}>🪙</Text>
                <Text style={[styles.balanceLabel, { color: themed.mutedText }]}>Coins</Text>
              </View>
              {loading ? (
                <ActivityIndicator size="small" color="#f59e0b" style={styles.balanceLoader} />
              ) : (
                <Text style={styles.balanceAmount}>{coinBalance.toLocaleString()}</Text>
              )}
              <Text style={[styles.balanceDescription, { color: themed.subtleText }]}>For sending gifts</Text>
            </View>
          </View>
          
          <View style={[styles.balanceCard, { backgroundColor: themed.cardBg, borderColor: themed.diamondBorder }]}>
            <View style={[styles.balanceGlow, { backgroundColor: themed.diamondGlow }]} />
            <View style={styles.balanceContent}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceEmoji}>💎</Text>
                <Text style={[styles.balanceLabel, { color: themed.mutedText }]}>Diamonds</Text>
              </View>
              {loading ? (
                <ActivityIndicator size="small" color="#a855f7" style={styles.balanceLoader} />
              ) : (
                <Text style={[styles.balanceAmount, styles.diamondAmount]}>{diamondBalance.toLocaleString()}</Text>
              )}
              <Text style={[styles.balanceDescription, { color: themed.subtleText }]}>≈ ${(diamondBalance / 100).toFixed(2)} USD</Text>
            </View>
          </View>

          {/* Cashout Button */}
          <TouchableOpacity
            style={[styles.cashoutButton, { backgroundColor: '#22c55e' }]}
            onPress={handleCashoutPress}
            activeOpacity={0.8}
          >
            <Text style={styles.cashoutButtonText}>💵 Cash Out Diamonds</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.packsSection}>
          <Text style={[styles.sectionTitle, { color: themed.text }]}>💰 Purchase Coins</Text>
          <Text style={[styles.sectionSubtitle, { color: themed.mutedText }]}>Get coins to support your favorite creators with gifts</Text>
          
          {iapError && (
            <View style={[styles.iapErrorBanner, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
              <Text style={styles.iapErrorText}>Store unavailable: {iapError}</Text>
            </View>
          )}

          {!iapInitialized && !iapError && (
            <View style={styles.iapLoadingContainer}>
              <ActivityIndicator size="small" color={themed.mutedText} />
              <Text style={[styles.iapLoadingText, { color: themed.mutedText }]}>Loading store...</Text>
            </View>
          )}
          
          <View style={styles.packsGrid}>
            {MOBILE_COIN_PACKS.map(renderPackCard)}
          </View>
          
          <Text style={[styles.securePayment, { color: themed.subtleText }]}>Secure payments via App Store / Google Play</Text>
        </View>

        {/* Transaction History Section */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionsHeader}>
            <Text style={[styles.sectionTitle, { color: themed.text }]}>📜 Recent Transactions</Text>
            <TouchableOpacity onPress={handleViewTransactionsOnWeb}>
              <Text style={styles.viewAllLink}>View all →</Text>
            </TouchableOpacity>
          </View>

          {transactionsLoading && (
            <View style={styles.transactionsLoadingContainer}>
              <ActivityIndicator size="small" color={themed.mutedText} />
              <Text style={[styles.transactionsLoadingText, { color: themed.mutedText }]}>Loading...</Text>
            </View>
          )}

          {transactionsError && !transactionsLoading && (
            <TouchableOpacity
              style={[styles.transactionsErrorBanner, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
              onPress={handleViewTransactionsOnWeb}
            >
              <Text style={styles.transactionsErrorText}>{transactionsError}</Text>
              <Text style={[styles.transactionsErrorLink, { color: themed.mutedText }]}>View on web instead →</Text>
            </TouchableOpacity>
          )}

          {!transactionsLoading && !transactionsError && transactions.length === 0 && (
            <View style={[styles.emptyTransactions, { backgroundColor: themed.cardBg, borderColor: themed.cardBorder }]}>
              <Text style={[styles.emptyTransactionsText, { color: themed.mutedText }]}>No transactions yet</Text>
            </View>
          )}

          {!transactionsLoading && !transactionsError && transactions.length > 0 && (
            <View style={[styles.transactionsList, { backgroundColor: themed.cardBg, borderColor: themed.cardBorder }]}>
              {transactions.slice(0, 5).map((tx, index) => (
                <View
                  key={tx.id}
                  style={[
                    styles.transactionRow,
                    index < Math.min(transactions.length, 5) - 1 && { borderBottomWidth: 1, borderBottomColor: themed.border },
                  ]}
                >
                  <Text style={styles.transactionIcon}>{getTransactionIcon(tx)}</Text>
                  <View style={styles.transactionInfo}>
                    <Text style={[styles.transactionDescription, { color: themed.text }]}>{tx.description}</Text>
                    <Text style={[styles.transactionDate, { color: themed.subtleText }]}>{formatTransactionDate(tx.created_at)}</Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      { color: tx.direction === 'in' ? '#22c55e' : '#ef4444' },
                    ]}
                  >
                    {formatTransactionAmount(tx)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Purchase Confirmation Modal */}
      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themed.cardBg }]}>
            <Text style={[styles.modalTitle, { color: themed.text }]}>Confirm Purchase</Text>
            
            {selectedPack && (
              <>
                <View style={styles.modalPackInfo}>
                  <Text style={styles.modalPackCoins}>{selectedPack.coins.toLocaleString()} 🪙</Text>
                  <Text style={[styles.modalPackName, { color: themed.mutedText }]}>{selectedPack.packName} Pack</Text>
                </View>
                
                <Text style={styles.modalPrice}>
                  {selectedProduct ? formatProductPrice(selectedProduct) : `$${(selectedPack.usdCents / 100).toFixed(2)}`}
                </Text>
                
                <Text style={[styles.modalDisclaimer, { color: themed.subtleText }]}>
                  Payment will be charged to your {selectedProduct ? 'App Store / Google Play' : 'store'} account.
                </Text>
              </>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton, { borderColor: themed.border }]}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: themed.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleConfirmPurchase}
                disabled={!selectedPack}
              >
                <Text style={styles.modalConfirmButtonText}>Purchase</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cashout Modal */}
      <Modal
        visible={cashoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCashoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themed.cardBg }]}>
            <Text style={[styles.modalTitle, { color: themed.text }]}>💵 Cash Out</Text>
            
            <Text style={[styles.cashoutModalDescription, { color: themed.mutedText }]}>
              Cashout is currently handled on the web for security and compliance reasons.
            </Text>
            
            <Text style={[styles.cashoutModalNote, { color: themed.subtleText }]}>
              You'll be redirected to complete your cashout securely via Stripe Connect.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton, { borderColor: themed.border }]}
                onPress={() => setCashoutModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: themed.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.cashoutWebButton]}
                onPress={handleOpenWebCashout}
              >
                <Text style={styles.cashoutWebButtonText}>Open Web Cashout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  headerIcon: {
    fontSize: 48,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  balanceSection: {
    gap: 16,
    marginBottom: 24,
  },
  balanceCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  balanceGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  balanceContent: {
    position: 'relative',
    zIndex: 1,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  balanceEmoji: {
    fontSize: 20,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#f59e0b',
    marginBottom: 8,
  },
  diamondAmount: {
    color: '#a855f7',
  },
  balanceDescription: {
    fontSize: 12,
  },
  balanceLoader: {
    height: 44,
    marginBottom: 8,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  errorRetry: {
    fontSize: 12,
    marginTop: 4,
  },
  packsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  packsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  packCard: {
    width: '48%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
  },
  packName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  packPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22c55e',
    marginBottom: 4,
  },
  packCoins: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  packDescription: {
    fontSize: 10,
  },
  securePayment: {
    fontSize: 10,
    textAlign: 'center',
  },
  packCardPurchasing: {
    opacity: 0.6,
  },
  packLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    zIndex: 10,
  },
  iapErrorBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  iapErrorText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
  },
  iapLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  iapLoadingText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  modalPackInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  modalPackCoins: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f59e0b',
  },
  modalPackName: {
    fontSize: 14,
    marginTop: 4,
  },
  modalPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#22c55e',
    marginBottom: 12,
  },
  modalDisclaimer: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    borderWidth: 1,
  },
  modalConfirmButton: {
    backgroundColor: '#22c55e',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Cashout button styles
  cashoutButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Cashout modal styles
  cashoutModalDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  cashoutModalNote: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  cashoutWebButton: {
    backgroundColor: '#3b82f6',
  },
  cashoutWebButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Transaction history styles
  transactionsSection: {
    marginBottom: 24,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  transactionsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  transactionsLoadingText: {
    fontSize: 12,
  },
  transactionsErrorBanner: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  transactionsErrorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  transactionsErrorLink: {
    fontSize: 12,
    marginTop: 8,
  },
  emptyTransactions: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyTransactionsText: {
    fontSize: 14,
  },
  transactionsList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  transactionIcon: {
    fontSize: 24,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 11,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
