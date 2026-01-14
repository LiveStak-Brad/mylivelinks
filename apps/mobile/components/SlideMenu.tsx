import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { darkPalette, lightPalette } from '../theme/colors';

export type SlideMenuItem = {
  key: string;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  pillText?: string;
  tone?: 'default' | 'danger';
  type?: 'item' | 'section';
  rightIconName?: React.ComponentProps<typeof Ionicons>['name'];
};

// Estimate width needed for text + pill/icon + padding
function estimateItemWidth(item: SlideMenuItem): number {
  const charWidth = 7.5; // approx width per character at fontSize 13
  const labelWidth = item.label.length * charWidth;
  const pillWidth = item.pillText ? item.pillText.length * 6 + 20 : 0;
  const iconWidth = item.rightIconName ? 24 : 0;
  const padding = 28; // horizontal padding
  const gap = (pillWidth || iconWidth) ? 12 : 0;
  return labelWidth + pillWidth + iconWidth + padding + gap;
}

export default function SlideMenu({
  side,
  visible,
  title,
  items,
  onRequestClose,
}: {
  side: 'left' | 'right';
  visible: boolean;
  title?: string;
  items: SlideMenuItem[];
  onRequestClose: () => void;
}) {
  const { mode, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const translate = useRef(new Animated.Value(0)).current;
  
  // Calculate minimum width needed based on longest item
  const panelWidth = useMemo(() => {
    const titleWidth = title ? title.length * 9 + 28 : 0;
    const maxItemWidth = items.reduce((max, item) => Math.max(max, estimateItemWidth(item)), 0);
    const contentWidth = Math.max(titleWidth, maxItemWidth);
    // Add safe area inset and clamp between 160 and 70% of screen
    const minWidth = 160;
    const maxWidth = screenWidth * 0.7;
    const safeInset = side === 'left' ? insets.left : insets.right;
    return Math.min(maxWidth, Math.max(minWidth, contentWidth + safeInset + 16));
  }, [items, title, screenWidth, side, insets.left, insets.right]);

  const closedX = useMemo(() => (side === 'left' ? -panelWidth : panelWidth), [side, panelWidth]);
  const pressedBg = mode === 'dark' ? darkPalette.slate800 : lightPalette.slate100;

  useEffect(() => {
    if (visible) translate.setValue(closedX);
    Animated.timing(translate, {
      toValue: visible ? 0 : closedX,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [closedX, translate, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          onPress={onRequestClose}
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        />

        <Animated.View
          style={[
            styles.panel,
            { backgroundColor: colors.surface, borderColor: colors.border },
            side === 'left' ? styles.panelLeft : styles.panelRight,
            { 
              width: panelWidth, 
              transform: [{ translateX: translate }],
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              paddingLeft: side === 'left' ? insets.left : 0,
              paddingRight: side === 'right' ? insets.right : 0,
            },
          ]}
        >
          <View style={styles.safeArea}>
            {title ? <Text style={[styles.title, { color: colors.text }]}>{title}</Text> : null}

            <View style={styles.list}>
              {items.map((item) => {
                const isDisabled = !!item.disabled;
                const isDanger = item.tone === 'danger';
                const isSection = item.type === 'section';

                if (isSection) {
                  return (
                    <View key={item.key} style={styles.sectionRow}>
                      <Text style={[styles.sectionLabel, { color: colors.mutedText }]}>{item.label}</Text>
                    </View>
                  );
                }

                return (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isDisabled }}
                    onPress={() => {
                      if (isDisabled) return;
                      item.onPress?.();
                    }}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && !isDisabled ? { backgroundColor: pressedBg } : null,
                      isDisabled ? styles.rowDisabled : null,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.label,
                        { color: isDanger ? colors.danger : colors.text },
                      ]}
                    >
                      {item.label}
                    </Text>

                    {item.pillText ? (
                      <View style={[styles.pill, { backgroundColor: colors.text }]}>
                        <Text style={[styles.pillText, { color: colors.bg }]}>{item.pillText}</Text>
                      </View>
                    ) : item.rightIconName ? (
                      <Ionicons name={item.rightIconName} size={18} color={colors.icon} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  panelLeft: {
    left: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  panelRight: {
    right: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  safeArea: {
    flex: 1,
  },
  title: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    fontSize: 15,
    fontWeight: '900',
  },
  sectionRow: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  list: {
    paddingTop: 4,
  },
  row: {
    minHeight: 40,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

