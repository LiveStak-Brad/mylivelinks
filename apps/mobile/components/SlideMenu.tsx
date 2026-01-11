import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type SlideMenuItem = {
  key: string;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  pillText?: string;
  tone?: 'default' | 'danger';
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
  const translate = useRef(new Animated.Value(0)).current;
  const panelWidth = 300;

  const closedX = useMemo(() => (side === 'left' ? -panelWidth : panelWidth), [side]);

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
          style={styles.backdrop}
        />

        <Animated.View
          style={[
            styles.panel,
            side === 'left' ? styles.panelLeft : styles.panelRight,
            { width: panelWidth, transform: [{ translateX: translate }] },
          ]}
        >
          <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
            {title ? <Text style={styles.title}>{title}</Text> : null}

            <View style={styles.list}>
              {items.map((item) => {
                const isDisabled = !!item.disabled;
                const isDanger = item.tone === 'danger';
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
                      pressed && !isDisabled ? styles.rowPressed : null,
                      isDisabled ? styles.rowDisabled : null,
                    ]}
                  >
                    <Text style={[styles.label, isDanger ? styles.labelDanger : null]}>
                      {item.label}
                    </Text>

                    {item.pillText ? (
                      <View style={styles.pill}>
                        <Text style={styles.pillText}>{item.pillText}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </SafeAreaView>
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
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
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
    paddingTop: 10,
  },
  title: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
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
    borderBottomColor: '#E5E7EB',
  },
  rowPressed: {
    backgroundColor: '#F1F5F9',
  },
  rowDisabled: {
    opacity: 0.55,
  },
  label: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  labelDanger: {
    color: '#DC2626',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#111827',
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});

