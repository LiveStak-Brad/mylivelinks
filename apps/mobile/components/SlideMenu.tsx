import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const translate = useRef(new Animated.Value(0)).current;
  const panelWidth = 300;

  const closedX = useMemo(() => (side === 'left' ? -panelWidth : panelWidth), [side]);
  const pressedBg = mode === 'dark' ? darkPalette.slate800 : lightPalette.slate100;

  useEffect(() => {
    if (visible) translate.setValue(closedX);
    Animated.timing(translate, {
      toValue: visible ? 0 : closedX,
      duration: 220,
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    fontSize: 16,
    fontWeight: '900',
  },
  sectionRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  list: {
    paddingTop: 8,
  },
  row: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});

