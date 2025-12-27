import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { Participant } from '../types/live';

interface GiftOverlayProps {
  visible: boolean;
  onClose: () => void;
  participants: Participant[];
  targetRecipientId: string | null;
  onSelectRecipientId: (recipientId: string) => void;
}

export const GiftOverlay: React.FC<GiftOverlayProps> = ({
  visible,
  onClose,
  participants,
  targetRecipientId,
  onSelectRecipientId,
}) => {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationX > 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (event.translationX > 100) {
        runOnJS(onClose)();
      }
      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const selectable = useMemo(() => {
    return participants.filter((p) => !p.isLocal);
  }, [participants]);

  if (!visible) return null;

  return (
    <>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <BlurView intensity={40} style={styles.blur}>
            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
              <View style={styles.header}>
                <Text style={styles.headerText}>Gifts</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.noteBox}>
                <Text style={styles.noteText}>Coming soon</Text>
                <Text style={styles.noteSubtext}>Recipient selection is wired. Purchase + send flow will be enabled later.</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select recipient</Text>

                {selectable.length === 0 ? (
                  <Text style={styles.emptyText}>No other participants to gift right now.</Text>
                ) : (
                  selectable.map((p) => {
                    const selected = targetRecipientId === p.identity;
                    return (
                      <TouchableOpacity
                        key={p.identity}
                        style={[styles.row, selected && styles.rowSelected]}
                        onPress={() => {
                          onSelectRecipientId(p.identity);
                          onClose();
                        }}
                      >
                        <Text style={styles.rowText}>{p.username || p.identity}</Text>
                        {selected && <Text style={styles.selectedTag}>Selected</Text>}
                      </TouchableOpacity>
                    );
                  })
                )}
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
    left: 0,
    bottom: 0,
    width: '75%',
    maxWidth: 350,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  blur: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  noteBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 6,
  },
  noteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  noteSubtext: {
    color: '#9aa0a6',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: '#ff6b9d',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyText: {
    color: '#9aa0a6',
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  rowSelected: {
    borderWidth: 1,
    borderColor: '#ff6b9d',
  },
  rowText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  selectedTag: {
    color: '#ff6b9d',
    fontSize: 12,
    fontWeight: '800',
  },
});
