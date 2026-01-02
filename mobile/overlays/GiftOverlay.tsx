import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { Participant } from '../types/live';
import { useAuthContext } from '../contexts/AuthContext';
import { fetchAuthed } from '../lib/api';
import { generateSessionId } from '../lib/deviceId';

interface GiftOverlayProps {
  visible: boolean;
  onClose: () => void;
  participants: Participant[];
  targetRecipientId: string | null;
  onSelectRecipientId: (recipientId: string) => void;
  roomId?: string | null;
}

export const GiftOverlay: React.FC<GiftOverlayProps> = ({
  visible,
  onClose,
  participants,
  targetRecipientId,
  onSelectRecipientId,
  roomId,
}) => {
  const { user, getAccessToken } = useAuthContext();
  const [coinsAmount, setCoinsAmount] = useState<number>(50);
  const [sending, setSending] = useState(false);
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

  const parseProfileIdFromIdentity = useCallback((identityRaw: string | null): string | null => {
    const identity = typeof identityRaw === 'string' ? identityRaw : '';
    if (!identity) return null;
    if (identity.startsWith('u_')) {
      const rest = identity.slice('u_'.length);
      const profileId = rest.split(':')[0];
      return profileId || null;
    }
    // Backward compatibility: some environments may still provide UUID identity
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identity)) {
      return identity;
    }
    return null;
  }, []);

  const recipientProfileId = useMemo(() => {
    return parseProfileIdFromIdentity(targetRecipientId);
  }, [parseProfileIdFromIdentity, targetRecipientId]);

  const recipientLabel = useMemo(() => {
    if (!targetRecipientId) return null;
    const p = participants.find((x) => x.identity === targetRecipientId);
    return p?.username || targetRecipientId;
  }, [participants, targetRecipientId]);

  const handleSendGift = useCallback(async () => {
    if (sending) return;

    if (!user?.id) {
      Alert.alert('Login required', 'Please log in to send gifts.');
      return;
    }

    if (!recipientProfileId) {
      Alert.alert('Select a recipient', 'Choose someone in the room to send a gift to.');
      return;
    }

    if (recipientProfileId === user.id) {
      Alert.alert('Not allowed', 'You cannot send a gift to yourself.');
      return;
    }

    if (!coinsAmount || coinsAmount <= 0) {
      Alert.alert('Invalid amount', 'Choose a valid coin amount.');
      return;
    }

    setSending(true);
    try {
      const accessToken = await getAccessToken();
      const requestId = generateSessionId();

      const res = await fetchAuthed(
        '/api/gifts/send',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toUserId: recipientProfileId,
            coinsAmount,
            requestId,
            context: 'live_room',
            roomId: roomId || null,
          }),
        },
        accessToken
      );

      if (!res.ok) {
        const msg = res.status === 403 ? 'Gifting is temporarily disabled.' : (res.message || 'Failed to send gift');
        throw new Error(msg);
      }

      Alert.alert('Gift sent', `Sent ${coinsAmount} coins to ${recipientLabel || 'recipient'}.`);
      onClose();
    } catch (err: any) {
      Alert.alert('Gift failed', err?.message || 'Failed to send gift');
    } finally {
      setSending(false);
    }
  }, [coinsAmount, getAccessToken, onClose, recipientLabel, recipientProfileId, sending, user?.id]);

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
                <Text style={styles.noteText}>Send a gift</Text>
                <Text style={styles.noteSubtext}>Choose a recipient and a coin amount.</Text>
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
                          try {
                            onSelectRecipientId(p.identity);
                          } catch (err) {
                            console.error('[GiftOverlay] Selection error:', err);
                          }
                        }}
                      >
                        <Text style={styles.rowText}>{p.username || p.identity}</Text>
                        {selected && <Text style={styles.selectedTag}>Selected</Text>}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Amount</Text>
                <View style={styles.amountRow}>
                  {[10, 50, 100, 500].map((amt) => {
                    const active = coinsAmount === amt;
                    return (
                      <TouchableOpacity
                        key={amt}
                        style={[styles.amountPill, active && styles.amountPillActive]}
                        onPress={() => setCoinsAmount(amt)}
                        disabled={sending}
                      >
                        <Text style={[styles.amountText, active && styles.amountTextActive]}>{amt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.sendButton, (!recipientProfileId || sending) && styles.sendButtonDisabled]}
                onPress={handleSendGift}
                disabled={!recipientProfileId || sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.sendButtonText}>Send Gift</Text>
                )}
              </TouchableOpacity>
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
  amountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amountPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    minWidth: 56,
    alignItems: 'center',
  },
  amountPillActive: {
    borderColor: '#ff6b9d',
    backgroundColor: 'rgba(255, 107, 157, 0.14)',
  },
  amountText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  amountTextActive: {
    color: '#ff6b9d',
  },
  sendButton: {
    marginTop: 18,
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});
