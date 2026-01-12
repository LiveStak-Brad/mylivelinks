import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

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
  | { type: 'gift'; label: string }
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
  if (content.startsWith('__gift__:')) return { type: 'gift', label: 'Gift' };
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
    setMessages(rows);
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

    setComposerText('');
    setError(null);

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

    if (insertError) {
      console.error('[im] send error:', insertError.message);
      setError(insertError.message);
      setMessages((prev) => prev.filter((m) => String(m.id) !== tempId));
      return;
    }

    setMessages((prev) => prev.map((m) => (String(m.id) === tempId ? ((data as any) as ImRow) : m)));
  }, [composerText, myId, otherProfileId]);

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
                ) : (
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
                      {decoded.type === 'text' ? decoded.text : decoded.label}
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
        />

        <View style={styles.composer}>
          <TextInput
            value={composerText}
            onChangeText={setComposerText}
            placeholder="Message…"
            placeholderTextColor={stylesVars.mutedText}
            style={styles.composerInput}
            multiline
          />
          <Pressable accessibilityRole="button" onPress={send} style={({ pressed }) => [styles.sendBtn, pressed && styles.sendBtnPressed]}>
            <Feather name="send" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
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
  });
}

