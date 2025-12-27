import React, { useMemo } from 'react';
import { Modal as RNModal, Pressable, StyleSheet, View } from 'react-native';
import { useThemeMode, type ThemeDefinition } from '../../contexts/ThemeContext';

type ModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
};

export function Modal({ visible, onRequestClose, children }: ModalProps) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <Pressable style={styles.backdrop} onPress={onRequestClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

function createStyles(theme: ThemeDefinition) {
  const modalShadow = theme.elevations.modal;
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      padding: 20,
      justifyContent: 'center',
    },
    card: {
      borderRadius: 18,
      backgroundColor: theme.tokens.surfaceModal,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 18,
      shadowColor: modalShadow.color,
      shadowOpacity: modalShadow.opacity,
      shadowRadius: modalShadow.radius,
      shadowOffset: modalShadow.offset,
      elevation: modalShadow.elevation,
    },
  });
}
