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
  onOpenWallet: () => void;
}

export const MenuOverlay: React.FC<MenuOverlayProps> = ({
  visible,
  onClose,
  onOpenWallet,
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
    // noop
  };

  const handleConvertCoins = () => {
    // noop
  };

  const handleWallet = () => {
    onOpenWallet();
    onClose();
  };

  const handleSettings = () => {
    // noop
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

              <View style={styles.balanceContainer}>
                <Text style={styles.balanceNote}>Wallet balances available in Wallet screen</Text>
              </View>

              {/* Menu items */}
              <View style={styles.menuItems}>
                <TouchableOpacity style={styles.menuItem} onPress={handlePurchaseCoins} disabled>
                  <Text style={styles.menuIcon}>💳</Text>
                  <Text style={styles.menuItemText}>Purchase Coins (Coming Soon)</Text>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleConvertCoins} disabled>
                  <Text style={styles.menuIcon}>🔄</Text>
                  <Text style={styles.menuItemText}>Convert Coins (Coming Soon)</Text>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleWallet}>
                  <Text style={styles.menuIcon}>👛</Text>
                  <Text style={styles.menuItemText}>Wallet</Text>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleSettings} disabled>
                  <Text style={styles.menuIcon}>⚙️</Text>
                  <Text style={styles.menuItemText}>Settings (Coming Soon)</Text>
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  balanceNote: {
    color: '#9aa0a6',
    fontSize: 13,
    fontWeight: '600',
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

