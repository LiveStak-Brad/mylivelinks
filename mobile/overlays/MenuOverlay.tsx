/**
 * Menu Overlay - Swipe RIGHT to open, LEFT to close
 * Side sheet with purchase/convert options and wallet
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface MenuOverlayProps {
  visible: boolean;
  onClose: () => void;
  coinBalance?: number;
  diamondBalance?: number;
}

export const MenuOverlay: React.FC<MenuOverlayProps> = ({
  visible,
  onClose,
  coinBalance = 0,
  diamondBalance = 0,
}) => {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow leftward swipes (to close)
      if (event.translationX < 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (event.translationX < -100) {
        // Swipe left threshold reached - close overlay
        runOnJS(onClose)();
      }
      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!visible) return null;

  const handlePurchaseCoins = () => {
    // TODO: Navigate to purchase screen
    console.log('[PLACEHOLDER] Navigate to Purchase Coins');
  };

  const handleConvertCoins = () => {
    // TODO: Navigate to convert screen
    console.log('[PLACEHOLDER] Navigate to Convert Coins');
  };

  const handleWallet = () => {
    // TODO: Navigate to wallet screen
    console.log('[PLACEHOLDER] Navigate to Wallet');
  };

  const handleSettings = () => {
    // TODO: Navigate to settings screen
    console.log('[PLACEHOLDER] Navigate to Settings');
  };

  return (
    <>
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <BlurView intensity={40} style={styles.blur}>
            <ScrollView style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerText}>Menu</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Balance display */}
              <View style={styles.balanceContainer}>
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>Coins</Text>
                  <Text style={styles.balanceValue}>🪙 {coinBalance}</Text>
                </View>
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>Diamonds</Text>
                  <Text style={styles.balanceValue}>💎 {diamondBalance}</Text>
                </View>
              </View>

              {/* Menu items */}
              <View style={styles.menuItems}>
                <TouchableOpacity style={styles.menuItem} onPress={handlePurchaseCoins}>
                  <Text style={styles.menuIcon}>💳</Text>
                  <Text style={styles.menuItemText}>Purchase Coins</Text>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleConvertCoins}>
                  <Text style={styles.menuIcon}>🔄</Text>
                  <Text style={styles.menuItemText}>Convert Coins</Text>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleWallet}>
                  <Text style={styles.menuIcon}>👛</Text>
                  <Text style={styles.menuItemText}>Wallet</Text>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
                  <Text style={styles.menuIcon}>⚙️</Text>
                  <Text style={styles.menuItemText}>Settings</Text>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </BlurView>
        </Animated.View>
      </GestureDetector>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '75%',
    maxWidth: 350,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    overflow: 'hidden',
  },
  blur: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
  },
  balanceContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  balanceItem: {
    flex: 1,
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4a9eff',
  },
  balanceLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuItems: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  menuIcon: {
    fontSize: 24,
  },
  menuItemText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  menuArrow: {
    color: '#888',
    fontSize: 24,
  },
});

