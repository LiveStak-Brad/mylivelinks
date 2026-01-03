import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
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
import { generateSessionId } from '../lib/deviceId';
import { fetchWithWebSession } from '../lib/webSession';
import { supabase } from '../lib/supabase';

interface GiftOverlayProps {
  visible: boolean;
  onClose: () => void;
  participants: Participant[];
  targetRecipientId: string | null;
  onSelectRecipientId: (recipientId: string) => void;
  roomId?: string | null;
  liveStreamId?: number | null;
}

interface GiftType {
  id: number;
  name: string;
  coin_cost: number;
  icon_url?: string;
  emoji?: string;
  tier: number;
}

export const GiftOverlay: React.FC<GiftOverlayProps> = ({
  visible,
  onClose,
  participants,
  targetRecipientId,
  onSelectRecipientId,
  roomId,
  liveStreamId,
}) => {
  const { user, getAccessToken } = useAuthContext();
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([]);
  const [selectedGift, setSelectedGift] = useState<GiftType | null>(null);
  const [userCoinBalance, setUserCoinBalance] = useState(0);
  const [loadingGifts, setLoadingGifts] = useState(false);
  const [giftError, setGiftError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!visible || !user?.id) return;
    let cancelled = false;

    const loadGifts = async () => {
      setLoadingGifts(true);
      setGiftError(null);
      try {
        const [{ data: giftData, error: giftDataError }, { data: profileData }] = await Promise.all([
          supabase
            .from('gift_types')
            .select('*')
            .eq('is_active', true)
            .order('display_order'),
          supabase
            .from('profiles')
            .select('coin_balance')
            .eq('id', user.id)
            .maybeSingle(),
        ]);

        if (giftDataError) throw giftDataError;
        if (cancelled) return;

        setGiftTypes(giftData || []);
        setSelectedGift((giftData && giftData.length > 0 ? giftData[0] : null) as GiftType | null);
        setUserCoinBalance((profileData as any)?.coin_balance ?? 0);
      } catch (error: any) {
        if (!cancelled) {
          setGiftTypes([]);
          setSelectedGift(null);
          setGiftError(error?.message || 'Failed to load gifts');
        }
      } finally {
        if (!cancelled) {
          setLoadingGifts(false);
        }
      }
    };

    loadGifts();

    return () => {
      cancelled = true;
    };
  }, [user?.id, visible]);

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

    if (!selectedGift) {
      Alert.alert('Select a gift', 'Choose a gift from the catalog.');
      return;
    }

    if (userCoinBalance < selectedGift.coin_cost) {
      Alert.alert('Insufficient coins', 'Top up your balance to send this gift.');
      return;
    }

    setSending(true);
    try {
      await getAccessToken(); // ensure session exists even though request uses cookie
      const requestId = generateSessionId();
      const response = await fetchWithWebSession(
        '/api/gifts/send',
        {
          method: 'POST',
          body: JSON.stringify({
            toUserId: recipientProfileId,
            coinsAmount: selectedGift.coin_cost,
            giftTypeId: selectedGift.id,
            requestId,
            streamId: liveStreamId ?? null,
            roomSlug: roomId || null,
          }),
        },
        { contentTypeJson: true }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const msg =
          response.status === 403
            ? 'Gifting is temporarily disabled.'
            : data?.error || 'Failed to send gift';
        throw new Error(msg);
      }

      Alert.alert('Gift sent', `Sent ${selectedGift.coin_cost} coins to ${recipientLabel || 'recipient'}.`);
      setUserCoinBalance((prev) => Math.max(0, prev - selectedGift.coin_cost));
      onClose();
    } catch (err: any) {
      Alert.alert('Gift failed', err?.message || 'Failed to send gift');
    } finally {
      setSending(false);
    }
  }, [
    getAccessToken,
    liveStreamId,
    onClose,
    recipientLabel,
    recipientProfileId,
    roomId,
    selectedGift,
    sending,
    user?.id,
    userCoinBalance,
  ]);

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
                <Text style={styles.noteSubtext}>Choose a recipient and a gift from the catalog.</Text>
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

              <View style={styles.balanceBox}>
                <Text style={styles.balanceLabel}>Your balance</Text>
                <Text style={styles.balanceValue}>{userCoinBalance.toLocaleString()} coins</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Gift catalog</Text>
                {giftError ? (
                  <Text style={styles.emptyText}>{giftError}</Text>
                ) : loadingGifts ? (
                  <View style={styles.loadingGifts}>
                    <ActivityIndicator color="#a855f7" />
                  </View>
                ) : (
                  <View style={styles.giftGrid}>
                    {giftTypes.map((gift) => {
                      const active = selectedGift?.id === gift.id;
                      return (
                        <TouchableOpacity
                          key={gift.id}
                          style={[styles.giftCard, active && styles.giftCardActive]}
                          onPress={() => setSelectedGift(gift)}
                          disabled={sending}
                        >
                          {gift.icon_url ? (
                            <Image source={{ uri: gift.icon_url }} style={styles.giftIcon} />
                          ) : (
                            <Text style={styles.giftEmoji}>{gift.emoji || '🎁'}</Text>
                          )}
                          <Text style={styles.giftName} numberOfLines={1}>{gift.name}</Text>
                          <Text style={styles.giftCost}>{gift.coin_cost.toLocaleString()} coins</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!recipientProfileId || !selectedGift || sending || loadingGifts) && styles.sendButtonDisabled,
                ]}
                onPress={handleSendGift}
                disabled={!recipientProfileId || !selectedGift || sending || loadingGifts}
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
  balanceBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#9aa0a6',
    fontSize: 13,
    fontWeight: '600',
  },
  balanceValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  giftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  giftCard: {
    width: '30%',
    minWidth: 90,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    gap: 6,
  },
  giftCardActive: {
    borderColor: '#ff6b9d',
    backgroundColor: 'rgba(255,107,157,0.12)',
  },
  giftEmoji: {
    fontSize: 28,
  },
  giftIcon: {
    width: 32,
    height: 32,
  },
  giftName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  giftCost: {
    color: '#ff6b9d',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingGifts: {
    paddingVertical: 16,
    alignItems: 'center',
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
