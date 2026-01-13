import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

const API_BASE_URL = 'https://www.mylivelinks.com';

import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../theme/useTheme';
import { brand } from '../theme/colors';

type RouteParams = {
  otherProfileId: string;
  otherDisplayName?: string;
  otherAvatarUrl?: string | null;
};

type ImRow = {
  id: number | string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

type DecodedIm =
  | { type: 'text'; text: string }
  | { type: 'gift'; giftName?: string; giftCoins?: number; giftIcon?: string }
  | { type: 'image'; url?: string; width?: number; height?: number };

function decodeImContent(content: string): DecodedIm {
  if (typeof content !== 'string') return { type: 'text', text: '' };
  if (content.startsWith('__img__:')) {
    try {
      const raw = content.slice('__img__:'.length);
      const parsed = JSON.parse(raw);
      return {
        type: 'image',
        url: typeof parsed?.url === 'string' ? parsed.url : undefined,
        width: typeof parsed?.width === 'number' ? parsed.width : undefined,
        height: typeof parsed?.height === 'number' ? parsed.height : undefined,
      };
    } catch {
      return { type: 'text', text: 'Photo' };
    }
  }
  if (content.startsWith('__gift__:')) {
    try {
      const raw = content.slice('__gift__:'.length);
      const parsed = JSON.parse(raw);
      return {
        type: 'gift',
        giftName: typeof parsed?.giftName === 'string' ? parsed.giftName : undefined,
        giftCoins: typeof parsed?.giftCoins === 'number' ? parsed.giftCoins : undefined,
        giftIcon: typeof parsed?.giftIcon === 'string' ? parsed.giftIcon : undefined,
      };
    } catch {
      return { type: 'gift', giftName: 'Gift' };
    }
  }
  return { type: 'text', text: content };
}

export default function IMThreadScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { params } = useRoute<any>();
  const { otherProfileId, otherDisplayName, otherAvatarUrl } = (params ?? {}) as RouteParams;
  const { user } = useAuth();
  const { colors } = useTheme();
  const NO_PROFILE_PIC = require('../assets/no-profile-pic.png');

  const [messages, setMessages] = useState<ImRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerText, setComposerText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const listRef = useRef<FlatList>(null);

  const myId = user?.id ?? null;
  const title = useMemo(() => otherDisplayName || 'Message', [otherDisplayName]);

  const stylesVars = useMemo<StylesVars>(
    () => ({
      bg: colors.bg,
      border: colors.border,
      text: colors.text,
      mutedText: (colors as any).subtleText ?? colors.mutedText,
      mutedBg: colors.surface2,
      primary: (colors as any).focusRing ?? (brand as any).primary ?? brand.primary,
      onPrimary: '#FFFFFF',
      headerBg: colors.surface,
      danger: colors.danger,
    }),
    [colors]
  );

  const styles = useMemo(() => createStyles(stylesVars), [stylesVars]);

  const loadThread = useCallback(async () => {
    if (!myId || !otherProfileId) return;
    setLoading(true);
    setError(null);

    // Use the existing IM helper function (defined in repo SQL) to load last 50 (DESC), then reverse to ASC for display.
    const { data, error: rpcError } = await supabase.rpc('get_conversation', {
      p_user_id: myId,
      p_other_user_id: otherProfileId,
      p_limit: 50,
      p_offset: 0,
    });

    if (rpcError) {
      console.error('[im] get_conversation error:', rpcError.message);
      setMessages([]);
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    const rows = (((data as any) ?? []) as ImRow[]).slice().reverse();
    // Deduplicate by ID to prevent duplicate key warnings
    const uniqueRows = rows.filter((row, index, self) => 
      index === self.findIndex(r => String(r.id) === String(row.id))
    );
    setMessages(uniqueRows);
    setLoading(false);

    // Mark unread messages from the other user as read.
    const { error: markError } = await supabase.rpc('mark_messages_read', { p_user_id: myId, p_sender_id: otherProfileId });
    if (markError) {
      // Fallback to direct update (policy allows recipients to mark read_at).
      const readAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('instant_messages')
        .update({ read_at: readAt })
        .eq('recipient_id', myId)
        .eq('sender_id', otherProfileId)
        .is('read_at', null);
      if (updateError) console.warn('[im] mark read fallback error:', updateError.message);
    }
  }, [myId, otherProfileId]);

  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  // Realtime: subscribe to inserts and add to thread if it matches this pair.
  useEffect(() => {
    if (!myId || !otherProfileId) return;
    let cancelled = false;

    const channel = supabase
      .channel(`im-thread-${myId}-${otherProfileId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'instant_messages' },
        (payload) => {
          if (cancelled) return;
          const row = payload.new as any;
          const s = String(row.sender_id || '');
          const r = String(row.recipient_id || '');
          const isThisThread =
            (s === myId && r === otherProfileId) || (s === otherProfileId && r === myId);
          if (!isThisThread) return;

          setMessages((prev) => {
            // Deduplicate: check if message already exists
            const rowId = String((row as ImRow).id);
            if (prev.some(m => String(m.id) === rowId)) {
              return prev;
            }
            const next = [...prev, row as ImRow];
            next.sort((a, b) => Date.parse(String(a.created_at)) - Date.parse(String(b.created_at)));
            return next.slice(-200);
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      channel.unsubscribe();
    };
  }, [myId, otherProfileId]);

  const send = useCallback(async () => {
    if (!myId || !otherProfileId) return;
    const text = composerText.trim();
    if (!text) return;
    if (isSending) return;

    setComposerText('');
    setError(null);
    setIsSending(true);

    const tempId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const optimistic: ImRow = {
      id: tempId,
      sender_id: myId,
      recipient_id: otherProfileId,
      content: text,
      created_at: nowIso,
      read_at: null,
    };

    setMessages((prev) => [...prev, optimistic]);

    const { data, error: insertError } = await supabase
      .from('instant_messages')
      .insert({
        sender_id: myId,
        recipient_id: otherProfileId,
        content: text,
        created_at: nowIso,
      })
      .select('*')
      .single();

    setIsSending(false);

    if (insertError) {
      console.error('[im] send error:', insertError.message);
      setError(insertError.message);
      setMessages((prev) => prev.filter((m) => String(m.id) !== tempId));
      return;
    }

    setMessages((prev) => prev.map((m) => (String(m.id) === tempId ? ((data as any) as ImRow) : m)));
  }, [composerText, isSending, myId, otherProfileId]);

  const pickAndSendImage = useCallback(async () => {
    if (!myId || !otherProfileId) return;
    if (isSending) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to send images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: false,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.uri) return;

    setIsSending(true);
    setError(null);

    const tempId = `temp-img-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const optimistic: ImRow = {
      id: tempId,
      sender_id: myId,
      recipient_id: otherProfileId,
      content: `__img__:${JSON.stringify({ url: asset.uri })}`,
      created_at: nowIso,
      read_at: null,
    };

    setMessages((prev) => [...prev, optimistic]);

    try {
      const filename = asset.uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: filename,
        type,
      } as any);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const uploadRes = await fetch(`${API_BASE_URL}/api/messages/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ mimeType: type, otherProfileId }),
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData?.error || 'Failed to prepare upload');
      }

      const bucket = String(uploadData?.bucket || '');
      const path = String(uploadData?.path || '');
      const token = String(uploadData?.token || '');
      const publicUrl = String(uploadData?.publicUrl || '');

      if (!bucket || !path || !token || !publicUrl) {
        throw new Error('Upload response missing required fields');
      }

      const file = await fetch(asset.uri);
      const blob = await file.blob();

      const { error: uploadErr } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, blob, {
        contentType: type,
      });

      if (uploadErr) throw uploadErr;

      const content = `__img__:${JSON.stringify({
        url: publicUrl,
        mime: type,
        width: asset.width,
        height: asset.height,
      })}`;

      const { data, error: insertError } = await supabase
        .from('instant_messages')
        .insert({
          sender_id: myId,
          recipient_id: otherProfileId,
          content,
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      setMessages((prev) => prev.map((m) => (String(m.id) === tempId ? ((data as any) as ImRow) : m)));
    } catch (err: any) {
      console.error('[im] send image error:', err);
      setError(err?.message || 'Failed to send image');
      setMessages((prev) => prev.filter((m) => String(m.id) !== tempId));
    } finally {
      setIsSending(false);
    }
  }, [isSending, myId, otherProfileId]);

  const sendGift = useCallback(async (giftId: number, giftName: string, giftCoins: number, giftIcon?: string) => {
    if (!myId || !otherProfileId) return;
    if (isSending) return;

    setIsSending(true);
    setError(null);
    setShowGiftModal(false);

    const tempId = `temp-gift-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const requestId = `${myId}-${Date.now()}`;

    const optimistic: ImRow = {
      id: tempId,
      sender_id: myId,
      recipient_id: otherProfileId,
      content: `__gift__:${JSON.stringify({ giftId, giftName, giftCoins, giftIcon })}`,
      created_at: nowIso,
      read_at: null,
    };

    setMessages((prev) => [...prev, optimistic]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/api/gifts/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          toUserId: otherProfileId,
          coinsAmount: giftCoins,
          giftTypeId: giftId,
          context: 'dm',
          requestId,
        }),
      });

      const raw = await response.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        const errMsg =
          (data && typeof data?.error === 'string' && data.error.length ? data.error : null) ||
          (raw && raw.length ? raw : null) ||
          'Failed to send gift';
        throw new Error(errMsg);
      }

      const giftContent = `__gift__:${JSON.stringify({ giftId, giftName, giftCoins, giftIcon })}`;
      const { data: imRow, error: imErr } = await supabase
        .from('instant_messages')
        .insert({
          sender_id: myId,
          recipient_id: otherProfileId,
          content: giftContent,
        })
        .select('*')
        .single();

      if (imErr) throw imErr;

      setMessages((prev) => prev.map((m) => (String(m.id) === tempId ? ((imRow as any) as ImRow) : m)));
    } catch (err: any) {
      console.error('[im] send gift error:', err);
      setError(err?.message || 'Failed to send gift');
      setMessages((prev) => prev.filter((m) => String(m.id) !== tempId));
    } finally {
      setIsSending(false);
    }
  }, [isSending, myId, otherProfileId]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Image
            source={otherAvatarUrl ? { uri: otherAvatarUrl } : NO_PROFILE_PIC}
            style={styles.headerAvatar}
            resizeMode="cover"
          />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {loading ? <Text style={styles.headerSub}>Loading…</Text> : null}
        {error ? (
          <Text style={styles.headerError} numberOfLines={2}>
            {error}
          </Text>
        ) : null}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: 12 + insets.bottom }]}
          renderItem={({ item }) => {
            const mine = myId && String(item.sender_id) === myId;
            const decoded = decodeImContent(item.content);
            return (
              <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
                {decoded.type === 'image' && decoded.url ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open photo"
                    onPress={() => navigation.navigate('MediaViewer', { kind: 'image', url: decoded.url })}
                    style={[styles.imageBubble, mine ? styles.imageBubbleMine : styles.imageBubbleTheirs]}
                  >
                    <Image
                      source={{ uri: decoded.url }}
                      style={styles.imageBubbleImg}
                      resizeMode="cover"
                      accessibilityLabel="Message photo"
                    />
                    <View pointerEvents="none" style={styles.imageBubbleOverlay} />
                  </Pressable>
                ) : decoded.type === 'gift' ? (
                  <View style={[styles.giftBubble, mine ? styles.giftBubbleMine : styles.giftBubbleTheirs]}>
                    <View style={styles.giftContent}>
                      {decoded.giftIcon ? (
                        <Image
                          source={{ uri: decoded.giftIcon }}
                          style={styles.giftIcon}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={styles.giftEmoji}>{decoded.giftIcon || '🎁'}</Text>
                      )}
                      <View style={styles.giftTextWrap}>
                        <Text style={styles.giftTitle}>{mine ? 'You sent a gift!' : 'Sent you a gift!'}</Text>
                        <Text style={styles.giftDetails}>
                          {decoded.giftName || 'Gift'} • {decoded.giftCoins || 0} 💰{' '}
                          <Text style={styles.giftDiamonds}>(+{decoded.giftCoins || 0} 💎)</Text>
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
                      {decoded.text}
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
        />

        <View style={styles.composer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send gift"
            onPress={() => setShowGiftModal(true)}
            disabled={isSending}
            style={({ pressed }) => [styles.composerIconBtn, pressed && styles.composerIconBtnPressed, isSending && styles.composerIconBtnDisabled]}
          >
            <Feather name="gift" size={20} color={isSending ? stylesVars.mutedText : stylesVars.primary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send photo"
            onPress={pickAndSendImage}
            disabled={isSending}
            style={({ pressed }) => [styles.composerIconBtn, pressed && styles.composerIconBtnPressed, isSending && styles.composerIconBtnDisabled]}
          >
            <Feather name="image" size={20} color={isSending ? stylesVars.mutedText : stylesVars.primary} />
          </Pressable>
          <TextInput
            value={composerText}
            onChangeText={setComposerText}
            placeholder="Message…"
            placeholderTextColor={stylesVars.mutedText}
            style={styles.composerInput}
            multiline
            editable={!isSending}
          />
          <Pressable
            accessibilityRole="button"
            onPress={send}
            disabled={!composerText.trim() || isSending}
            style={({ pressed }) => [styles.sendBtn, pressed && styles.sendBtnPressed, (!composerText.trim() || isSending) && styles.sendBtnDisabled]}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="send" size={16} color="#FFFFFF" />
            )}
          </Pressable>
        </View>

        {showGiftModal && (
          <GiftModalMini
            visible={showGiftModal}
            onClose={() => setShowGiftModal(false)}
            onSendGift={sendGift}
            recipientName={title}
            stylesVars={stylesVars}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type StylesVars = {
  bg: string;
  border: string;
  text: string;
  mutedText: string;
  mutedBg: string;
  primary: string;
  onPrimary: string;
  headerBg: string;
  danger: string;
};

function createStyles(stylesVars: StylesVars) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: stylesVars.border,
    backgroundColor: stylesVars.headerBg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.mutedBg,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: stylesVars.text,
  },
  headerSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: stylesVars.mutedText,
  },
  headerError: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '800',
    color: stylesVars.danger,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
  },
  bubbleMine: {
    backgroundColor: stylesVars.primary,
    borderColor: stylesVars.primary,
    borderTopRightRadius: 6,
  },
  bubbleTheirs: {
    backgroundColor: stylesVars.mutedBg,
    borderColor: stylesVars.border,
    borderTopLeftRadius: 6,
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bubbleTextMine: {
    color: stylesVars.onPrimary,
  },
  bubbleTextTheirs: {
    color: stylesVars.text,
  },
  imageBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.mutedBg,
  },
  imageBubbleMine: {
    borderColor: stylesVars.primary,
  },
  imageBubbleTheirs: {
    borderColor: stylesVars.border,
  },
  imageBubbleImg: {
    width: 240,
    height: 240,
  },
  imageBubbleOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: stylesVars.border,
    backgroundColor: stylesVars.bg,
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.mutedBg,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    color: stylesVars.text,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: stylesVars.primary,
  },
  sendBtnPressed: {
    opacity: 0.92,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  composerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerIconBtnPressed: {
    opacity: 0.7,
  },
  composerIconBtnDisabled: {
    opacity: 0.4,
  },
  giftBubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  giftBubbleMine: {
    borderTopRightRadius: 6,
  },
  giftBubbleTheirs: {
    borderTopLeftRadius: 6,
  },
  giftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  giftIcon: {
    width: 40,
    height: 40,
  },
  giftEmoji: {
    fontSize: 32,
  },
  giftTextWrap: {
    flex: 1,
  },
  giftTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78350F',
    marginBottom: 2,
  },
  giftDetails: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  giftDiamonds: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  });
}

type GiftModalMiniProps = {
  visible: boolean;
  onClose: () => void;
  onSendGift: (giftId: number, giftName: string, giftCoins: number, giftIcon?: string) => void;
  recipientName: string;
  stylesVars: StylesVars;
};

type GiftType = {
  id: number;
  name: string;
  coin_cost: number;
  emoji?: string;
  icon_url?: string;
};

function GiftModalMini({ visible, onClose, onSendGift, recipientName, stylesVars }: GiftModalMiniProps) {
  const [gifts, setGifts] = React.useState<GiftType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [coinBalance, setCoinBalance] = React.useState(0);

  React.useEffect(() => {
    if (visible) {
      loadGifts();
    }
  }, [visible]);

  const loadGifts = async () => {
    setLoading(true);
    try {
      const { data: giftTypes } = await supabase
        .from('gift_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (giftTypes) {
        setGifts(giftTypes);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('coin_balance')
          .eq('id', user.id)
          .single();

        if (profile) {
          setCoinBalance(profile.coin_balance || 0);
        }
      }
    } catch (err) {
      console.error('[GiftModal] Error loading gifts:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const modalStyles = StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: stylesVars.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 20,
      paddingBottom: 20,
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: stylesVars.text,
    },
    subtitle: {
      fontSize: 13,
      color: stylesVars.mutedText,
      marginTop: 2,
    },
    balance: {
      fontSize: 11,
      fontWeight: '700',
      color: '#F59E0B',
      marginRight: 8,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: stylesVars.mutedBg,
    },
    emptyText: {
      textAlign: 'center',
      color: stylesVars.mutedText,
      fontSize: 13,
      padding: 20,
    },
    grid: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    scrollContent: {
      maxHeight: 400,
    },
    giftCard: {
      flexDirection: 'column',
      alignItems: 'center',
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: stylesVars.border,
      backgroundColor: stylesVars.mutedBg,
      gap: 8,
      width: '23%',
      marginBottom: 12,
    },
    giftCardPressed: {
      opacity: 0.7,
    },
    giftCardDisabled: {
      opacity: 0.4,
    },
    giftCardImage: {
      width: 48,
      height: 48,
      borderRadius: 8,
    },
    giftCardEmoji: {
      fontSize: 40,
    },
    giftCardInfo: {
      alignItems: 'center',
      width: '100%',
    },
    giftCardName: {
      fontSize: 11,
      fontWeight: '700',
      color: stylesVars.text,
      textAlign: 'center',
    },
    giftCardCoins: {
      fontSize: 10,
      fontWeight: '600',
      color: stylesVars.primary,
      marginTop: 2,
    },
    purchaseCoinsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 16,
      borderRadius: 12,
      backgroundColor: '#F59E0B',
    },
    purchaseCoinsBtnPressed: {
      opacity: 0.8,
    },
    purchaseCoinsText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });

  return (
    <Pressable style={modalStyles.overlay} onPress={onClose}>
      <Pressable style={modalStyles.modal} onPress={(e) => e.stopPropagation()}>
        <View style={modalStyles.header}>
          <View style={{ flex: 1 }}>
            <Text style={modalStyles.title}>Send a Gift</Text>
            <Text style={modalStyles.subtitle}>to {recipientName}</Text>
          </View>
          <Text style={modalStyles.balance}>{coinBalance.toLocaleString()} 💰</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={modalStyles.closeBtn}>
            <Feather name="x" size={18} color={stylesVars.text} />
          </Pressable>
        </View>
        <View style={[modalStyles.grid, modalStyles.scrollContent]}>
          {loading ? (
            <ActivityIndicator size="large" color={stylesVars.primary} style={{ padding: 20 }} />
          ) : gifts.length === 0 ? (
            <Text style={modalStyles.emptyText}>No gifts available</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {gifts.map((gift) => {
                const canAfford = coinBalance >= gift.coin_cost;
                return (
                  <Pressable
                    key={gift.id}
                    accessibilityRole="button"
                    onPress={() => canAfford && onSendGift(gift.id, gift.name, gift.coin_cost, gift.icon_url || gift.emoji)}
                    disabled={!canAfford}
                    style={({ pressed }) => [
                      modalStyles.giftCard,
                      pressed && modalStyles.giftCardPressed,
                      !canAfford && modalStyles.giftCardDisabled,
                    ]}
                  >
                    {gift.icon_url ? (
                      <Image
                        source={{ uri: gift.icon_url }}
                        style={modalStyles.giftCardImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={modalStyles.giftCardEmoji}>{gift.emoji || '🎁'}</Text>
                    )}
                    <View style={modalStyles.giftCardInfo}>
                      <Text style={modalStyles.giftCardName} numberOfLines={1}>{gift.name}</Text>
                      <Text style={modalStyles.giftCardCoins}>{gift.coin_cost} 💰</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onClose();
            Alert.alert(
              'Purchase Coins',
              'Coin packs will be available soon via iOS/Android in-app purchases!',
              [{ text: 'OK' }]
            );
          }}
          style={({ pressed }) => [
            modalStyles.purchaseCoinsBtn,
            pressed && modalStyles.purchaseCoinsBtnPressed,
          ]}
        >
          <Feather name="shopping-cart" size={18} color="#FFFFFF" />
          <Text style={modalStyles.purchaseCoinsText}>Purchase More Coins</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}

