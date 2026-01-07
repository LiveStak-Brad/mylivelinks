'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal as RNModal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modal, Button } from './ui';
import { useThemeMode } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';
import { linklerSupportIntake, linklerCompanionChat } from '../lib/api';
import {
  buildLinklerEscalationContext,
  detectLinklerEmergency,
  type LinklerEscalationReason,
} from '../../shared/linkler/escalation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, supabaseConfigured } from '../lib/supabase';

type CompanionEntry = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  createdAt: number;
  meta?: {
    ticketId?: string;
    recommendHuman?: boolean;
    suggestSendToHuman?: boolean;
    degraded?: boolean;
  };
};

type LinklerUsage = {
  usedToday: number;
  remainingToday: number;
  dailyLimit: number;
};

type TicketSummary = {
  id: string;
  status: string;
  updated_at: string;
  created_at: string;
  message: string | null;
};

const STORAGE_KEYS = {
  LAST_TICKET: 'linkler.mobile.lastTicket',
  COOLDOWN: 'linkler.mobile.cooldown',
  SUPPORT_SESSION: 'linkler.mobile.support.session',
  SUPPORT_MESSAGES: 'linkler.mobile.support.messages',
};

const COMPOSER_MIN_HEIGHT = 44;
const COMPOSER_MAX_HEIGHT = 96;
const NEAR_BOTTOM_THRESHOLD = 80;

export function LinklerFab({ show = true }: { show?: boolean }) {
  const { theme } = useThemeMode();
  const { user, getAccessToken } = useAuthContext();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const [visible, setVisible] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportContext, setSupportContext] = useState('');
  const [supportEscalating, setSupportEscalating] = useState(false);
  const [supportMessages, setSupportMessages] = useState<CompanionEntry[]>([]);
  const [supportSessionId, setSupportSessionId] = useState<string>(generateId());
  const [supportAsking, setSupportAsking] = useState(false);
  const [supportEscalationReason, setSupportEscalationReason] = useState<LinklerEscalationReason | null>(null);
  const [supportComposerHeight, setSupportComposerHeight] = useState(COMPOSER_MIN_HEIGHT);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [lastTicketId, setLastTicketId] = useState<string | null>(null);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [tick, setTick] = useState(Date.now());
  const [usage, setUsage] = useState<LinklerUsage | null>(null);
  const [ticketsVisible, setTicketsVisible] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [supportError, setSupportError] = useState<string | null>(null);

  const COOLDOWN_COPY = 'Hang on a sec...';
  const UNAVAILABLE_COPY = 'Linkler is temporarily unavailable.';

  const {
    scrollRef: supportScrollRef,
    handleScroll: handleSupportScroll,
    notifyContentChange: notifySupportScrollChange,
    scrollToBottom: scrollSupportToBottom,
    showNewMessages: supportShowNewMessages,
  } = useTranscriptScroll();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [ticket, cooldown, supportSession, supportTranscript] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.LAST_TICKET),
          AsyncStorage.getItem(STORAGE_KEYS.COOLDOWN),
          AsyncStorage.getItem(STORAGE_KEYS.SUPPORT_SESSION),
          AsyncStorage.getItem(STORAGE_KEYS.SUPPORT_MESSAGES),
        ]);
        if (cancelled) return;
        if (ticket) setLastTicketId(ticket);
        if (cooldown) {
          const parsed = Number(cooldown);
          if (Number.isFinite(parsed)) setCooldownEndsAt(parsed);
        }
        if (supportSession) setSupportSessionId(supportSession);
        if (supportTranscript) {
          try {
            setSupportMessages(JSON.parse(supportTranscript));
          } catch {
            // ignore corrupted transcript
          }
        }
      } finally {
        if (!cancelled) setStorageLoaded(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;
    void AsyncStorage.setItem(STORAGE_KEYS.SUPPORT_SESSION, supportSessionId);
  }, [storageLoaded, supportSessionId]);

  useEffect(() => {
    if (!storageLoaded) return;
    void AsyncStorage.setItem(STORAGE_KEYS.SUPPORT_MESSAGES, JSON.stringify(supportMessages.slice(-60)));
  }, [storageLoaded, supportMessages]);

  useEffect(() => {
    if (!storageLoaded) return;
    if (!lastTicketId) {
      void AsyncStorage.removeItem(STORAGE_KEYS.LAST_TICKET);
    } else {
      void AsyncStorage.setItem(STORAGE_KEYS.LAST_TICKET, lastTicketId);
    }
  }, [lastTicketId, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) return;
    if (!cooldownEndsAt) {
      void AsyncStorage.removeItem(STORAGE_KEYS.COOLDOWN);
    } else {
      void AsyncStorage.setItem(STORAGE_KEYS.COOLDOWN, String(cooldownEndsAt));
    }
  }, [cooldownEndsAt, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) return;
    notifySupportScrollChange();
  }, [storageLoaded, supportMessages, notifySupportScrollChange]);

  const cooldownRemaining = useMemo(() => {
    if (!cooldownEndsAt) return 0;
    const diff = cooldownEndsAt - tick;
    return diff <= 0 ? 0 : Math.ceil(diff / 1000);
  }, [cooldownEndsAt, tick]);

  const cooldownDisabled = cooldownRemaining > 0;

  const lastSupportAssistant = useMemo(() => {
    for (let i = supportMessages.length - 1; i >= 0; i -= 1) {
      if (supportMessages[i].role === 'assistant') return supportMessages[i];
    }
    return null;
  }, [supportMessages]);

  const lastSupportUser = useMemo(() => {
    for (let i = supportMessages.length - 1; i >= 0; i -= 1) {
      if (supportMessages[i].role === 'user') return supportMessages[i];
    }
    return null;
  }, [supportMessages]);

  const appendSystemMessage = useCallback((text: string, meta?: CompanionEntry['meta']) => {
    setSupportMessages((prev) => [
      ...prev.slice(-59),
      {
        id: generateId(),
        role: 'system',
        text,
        createdAt: Date.now(),
        meta,
      },
    ]);
  }, []);

  const resetSupportConversation = useCallback(() => {
    setSupportMessages([]);
    setSupportSessionId(generateId());
    setSupportEscalationReason(null);
  }, []);

  const handleSupportComposerSize = useCallback(
    (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const next = Math.min(
        Math.max(event.nativeEvent.contentSize.height, COMPOSER_MIN_HEIGHT),
        COMPOSER_MAX_HEIGHT
      );
      setSupportComposerHeight(next);
    },
    []
  );

  const handleAskLinklerSupport = useCallback(async () => {
    if (supportAsking || cooldownDisabled) return;

    const trimmed = supportMessage.trim();
    if (!trimmed) {
      setSupportError('Share what is going on before sending.');
      return;
    }
    setSupportError(null);

    let contextPayload: Record<string, unknown> | undefined;
    if (supportContext.trim()) {
      try {
        contextPayload = JSON.parse(supportContext);
      } catch (err: any) {
        Alert.alert('Linkler', `Context must be valid JSON (${err?.message || 'parse error'})`);
        return;
      }
    }

    const token = await getAccessToken();
    if (!token) {
      Alert.alert('Linkler', 'Please sign in again to chat with Linkler.');
      return;
    }

    const userEntry: CompanionEntry = {
      id: generateId(),
      role: 'user',
      text: trimmed,
      createdAt: Date.now(),
    };
    setSupportMessages((prev) => [...prev.slice(-59), userEntry]);
    setSupportMessage('');
    setSupportError(null);

    const emergency = detectLinklerEmergency(trimmed);
    if (emergency.isEmergency) {
      appendSystemMessage('This sounds urgent. Looping in the human team.');
      setSupportEscalationReason('emergency');
      return;
    }

    setSupportAsking(true);
    const res = await linklerCompanionChat(
      { message: trimmed, sessionId: supportSessionId, context: contextPayload },
      token
    );
    setSupportAsking(false);

    if (!res.ok || !res.data?.ok) {
      const retrySeconds = (res.data as any)?.retryAfterSeconds;
      if (retrySeconds) {
        setCooldownEndsAt(Date.now() + retrySeconds * 1000);
        return;
      }

      appendSystemMessage(UNAVAILABLE_COPY);
      setSupportEscalationReason(res.status === 503 ? 'linkler_disabled' : 'ai_unavailable');
      return;
    }

    setSupportSessionId(res.data.sessionId);
    if (res.data.cooldownSeconds) {
      setCooldownEndsAt(Date.now() + res.data.cooldownSeconds * 1000);
    } else {
      setCooldownEndsAt(null);
    }
    setUsage(res.data.usage ?? null);

    const assistantEntry: CompanionEntry = {
      id: generateId(),
      role: 'assistant',
      text: res.data.reply,
      createdAt: Date.now(),
      meta: {
        recommendHuman: res.data.recommendHuman,
        suggestSendToHuman: res.data.suggestSendToHuman,
        degraded: res.data.degraded,
      },
    };
    setSupportMessages((prev) => [...prev.slice(-59), assistantEntry]);

    if (res.data.recommendHuman) {
      setSupportEscalationReason('ai_recommended');
    }
  }, [
    appendSystemMessage,
    cooldownDisabled,
    getAccessToken,
    setCooldownEndsAt,
    supportAsking,
    supportContext,
    supportMessage,
    supportSessionId,
  ]);

  const refreshTickets = useCallback(async () => {
    if (!supabaseConfigured || !user) {
      setTicketsError('Sign in to view tickets.');
      setTickets([]);
      return;
    }
    setTicketsLoading(true);
    setTicketsError(null);
    const { data, error } = await supabase
      .from('support_tickets')
      .select('id,status,updated_at,created_at,message')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) {
      setTicketsError(error.message);
      setTickets([]);
    } else {
      setTickets(data ?? []);
    }
    setTicketsLoading(false);
  }, [user]);

  const handleSupportEscalation = useCallback(
    async (overrideReason?: LinklerEscalationReason) => {
      if (supportEscalating) return;

      let messageBody = supportMessage.trim();
      if (!messageBody) {
        messageBody = lastSupportUser?.text?.trim() ?? '';
      }

      if (!messageBody) {
        setSupportError('Add a quick summary before escalating.');
        return;
      }

      let contextPayload: Record<string, unknown> | undefined;
      if (supportContext.trim()) {
        try {
          contextPayload = JSON.parse(supportContext);
        } catch (err: any) {
          Alert.alert('Linkler', `Context must be valid JSON (${err?.message || 'parse error'})`);
          return;
        }
      }

      const token = await getAccessToken();
      if (!token) {
        Alert.alert('Linkler', 'Please sign in again to contact support.');
        return;
      }

      const reasonToSend = overrideReason ?? supportEscalationReason ?? 'user_requested';
      const context = buildLinklerEscalationContext({
        sessionId: supportSessionId,
        transcript: supportMessages,
        lastLinklerReply: lastSupportAssistant?.text,
        reason: reasonToSend,
        metadata: {
          ...(contextPayload ? { userContext: contextPayload } : {}),
          channel: 'support-chat-mobile',
        },
      });

      setSupportEscalating(true);
      const res = await linklerSupportIntake({ message: messageBody, context }, token);
      setSupportEscalating(false);

      if (!res.ok || !res.data?.ok || !res.data.ticket) {
        Alert.alert('Linkler', res.data?.error || res.message || 'Support request failed.');
        return;
      }

      const ticketId = res.data.ticket.id;
      setLastTicketId(ticketId);
      resetSupportConversation();
      setSupportContext('');
      setSupportMessage('');
      setSupportError(null);
      appendSystemMessage(
        `Ticket created: #${ticketId.slice(0, 8).toUpperCase()} (View in Tickets)`,
        { ticketId }
      );
      if (ticketsVisible) {
        void refreshTickets();
      }
    },
    [
      appendSystemMessage,
      getAccessToken,
      lastSupportAssistant,
      lastSupportUser,
      refreshTickets,
      resetSupportConversation,
      supportContext,
      supportEscalating,
      supportEscalationReason,
      supportMessage,
      supportMessages,
      supportSessionId,
      ticketsVisible,
    ]
  );

  const handleOpenTickets = useCallback(() => {
    setTicketsVisible(true);
    void refreshTickets();
  }, [refreshTickets]);

  const cooldownText =
    cooldownDisabled && `${COOLDOWN_COPY} Linkler will reply in about ${cooldownRemaining}s.`;

  const escalationHint = useMemo(() => {
    switch (supportEscalationReason) {
      case 'ai_recommended':
        return 'Linkler suggested looping in a human.';
      case 'linkler_disabled':
        return 'Linkler is offline. Humans can still help.';
      case 'ai_unavailable':
        return 'Linkler could not finish this request.';
      case 'emergency':
        return 'This sounds urgent. Escalate to a human.';
      default:
        return 'Escalate when you prefer a human review.';
    }
  }, [supportEscalationReason]);

  if (!show) {
    return null;
  }

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Open Linkler support panel"
      >
        {/* P0: Avoid hard-requiring an image outside Metro watch roots (monorepo root),
            which can prevent the app from bundling/booting. */}
        <View style={styles.fabFallback}>
          <Text style={styles.fabFallbackText}>L</Text>
        </View>
      </Pressable>

      <Modal visible={visible} onRequestClose={() => setVisible(false)}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sheetTitle}>Linkler Support</Text>
              <Text style={styles.sheetSubtitle}>
                {usage
                  ? `${usage.remainingToday} messages remaining today`
                  : 'AI triage with human backup'}
              </Text>
            </View>
            <Pressable style={styles.ticketsButton} onPress={handleOpenTickets}>
              <Text style={styles.ticketsButtonText}>Tickets</Text>
            </Pressable>
          </View>

          <View style={styles.chatSection}>
            <View style={styles.scrollWrapper}>
              <ScrollView
                ref={supportScrollRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                onScroll={handleSupportScroll}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
              >
                {supportMessages.length === 0 ? (
                  <Text style={styles.chatPlaceholder}>
                    Ask Linkler anything about your account. We will escalate when it needs a human.
                  </Text>
                ) : (
                  supportMessages.map((entry) => (
                    <CompanionBubble
                      key={entry.id}
                      entry={entry}
                      themeMode={theme.mode}
                      onViewTickets={handleOpenTickets}
                    />
                  ))
                )}
              </ScrollView>
              {supportShowNewMessages && (
                <Pressable style={styles.newMessagesChip} onPress={scrollSupportToBottom}>
                  <Text style={styles.newMessagesText}>New messages</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={[styles.composerCard, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TextInput
              multiline
              value={supportMessage}
              onChangeText={setSupportMessage}
              placeholder="Describe what is going on..."
              style={[styles.input, { height: supportComposerHeight }]}
              textAlignVertical="top"
              editable={!supportAsking && !cooldownDisabled}
              onContentSizeChange={handleSupportComposerSize}
            />
            {supportError ? <Text style={styles.errorText}>{supportError}</Text> : null}

            <TextInput
              multiline
              value={supportContext}
              onChangeText={setSupportContext}
              placeholder='Optional context (JSON). Example: {"screen":"profile"}'
              style={[styles.input, styles.contextInput]}
              textAlignVertical="top"
            />

            <Button
              title={
                supportAsking
                  ? 'Sending...'
                  : cooldownDisabled
                    ? `${COOLDOWN_COPY} (${cooldownRemaining}s)`
                    : 'Ask Linkler'
              }
              onPress={() => void handleAskLinklerSupport()}
              disabled={supportAsking || cooldownDisabled}
            />
            {cooldownText ? <Text style={styles.statusText}>{cooldownText}</Text> : null}

            <View style={styles.escalationStack}>
              {escalationHint ? <Text style={styles.supportEscalateText}>{escalationHint}</Text> : null}
              <Button
                title={supportEscalating ? 'Escalating...' : 'Escalate to human support'}
                variant="secondary"
                onPress={() => void handleSupportEscalation()}
                disabled={supportEscalating}
              />
            </View>
          </View>
        </View>
      </Modal>

      <TicketsModal
        visible={ticketsVisible}
        tickets={tickets}
        loading={ticketsLoading}
        error={ticketsError}
        onRequestClose={() => setTicketsVisible(false)}
        onRefresh={refreshTickets}
      />
    </>
  );
}

type CompanionBubbleProps = {
  entry: CompanionEntry;
  themeMode: 'light' | 'dark';
  onViewTickets: () => void;
};

function CompanionBubble({ entry, themeMode, onViewTickets }: CompanionBubbleProps) {
  const isAssistant = entry.role === 'assistant';
  const isSystem = entry.role === 'system';
  const containerStyles = [
    stylesBubble.container,
    isAssistant && stylesBubble.assistant,
    entry.role === 'user' && stylesBubble.user,
    isSystem && stylesBubble.system,
    {
      borderColor: themeMode === 'light' ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.15)',
    },
  ];

  return (
    <View style={containerStyles}>
      <View style={stylesBubble.headerRow}>
        <Text style={stylesBubble.author}>
          {isSystem ? 'System' : isAssistant ? 'Linkler' : 'You'}
        </Text>
        <Text style={stylesBubble.time}>
          {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <Text style={stylesBubble.text}>{entry.text}</Text>

      {entry.meta?.ticketId && (
        <Pressable
          style={stylesBubble.ticketLink}
          onPress={onViewTickets}
          accessibilityRole="button"
        >
          <Text style={stylesBubble.ticketLinkText}>View in Tickets</Text>
        </Pressable>
      )}
    </View>
  );
}

type TicketsModalProps = {
  visible: boolean;
  tickets: TicketSummary[];
  loading: boolean;
  error: string | null;
  onRequestClose: () => void;
  onRefresh: () => void;
};

function TicketsModal({ visible, tickets, loading, error, onRequestClose, onRefresh }: TicketsModalProps) {
  return (
    <RNModal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onRequestClose}
    >
      <Pressable style={stylesTickets.overlay} onPress={onRequestClose}>
        <Pressable style={stylesTickets.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={stylesTickets.header}>
            <Text style={stylesTickets.title}>Tickets</Text>
            <Pressable onPress={onRequestClose} style={stylesTickets.closeButton}>
              <Text style={stylesTickets.closeText}>Close</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={stylesTickets.state}>
              <ActivityIndicator />
              <Text style={stylesTickets.stateText}>Loading tickets...</Text>
            </View>
          ) : error ? (
            <View style={stylesTickets.state}>
              <Text style={stylesTickets.stateText}>{error}</Text>
              <Button title="Retry" onPress={onRefresh} />
            </View>
          ) : tickets.length === 0 ? (
            <View style={stylesTickets.state}>
              <Text style={stylesTickets.stateText}>No tickets yet.</Text>
            </View>
          ) : (
            <FlatList
              data={tickets}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <TicketRow item={item} />}
              contentContainerStyle={stylesTickets.listContent}
            />
          )}

          <Pressable
            style={stylesTickets.webLink}
            onPress={() => Linking.openURL('https://www.mylivelinks.com/tickets')}
          >
            <Text style={stylesTickets.webLinkText}>Open full tickets page</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

function TicketRow({ item }: { item: TicketSummary }) {
  return (
    <View style={stylesTickets.row}>
      <View style={stylesTickets.rowHeader}>
        <Text style={stylesTickets.rowId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
        <Text style={[stylesTickets.statusPill, getStatusStyle(item.status)]}>{item.status}</Text>
      </View>
      <Text style={stylesTickets.rowMeta}>
        Updated {new Date(item.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </Text>
      {item.message ? (
        <Text
          style={stylesTickets.rowPreview}
          numberOfLines={2}
        >
          {item.message}
        </Text>
      ) : null}
    </View>
  );
}

function getStatusStyle(status: string) {
  switch (status.toLowerCase()) {
    case 'open':
      return stylesTickets.statusOpen;
    case 'resolved':
      return stylesTickets.statusResolved;
    default:
      return stylesTickets.statusDefault;
  }
}

function createStyles(theme: any) {
  return StyleSheet.create({
    fab: {
    position: 'absolute',
    right: 18,
    bottom: 32,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#6c63ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabImage: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  fabFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabFallbackText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  sheet: {
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  ticketsButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    backgroundColor: '#f4f4f5',
  },
  ticketsButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  chatSection: {
    flex: 1,
  },
  scrollWrapper: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  chatPlaceholder: {
    fontSize: 13,
    color: '#6b7280',
  },
  newMessagesChip: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  newMessagesText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  composerCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 12,
    gap: 12,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  contextInput: {
    minHeight: 64,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  statusText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '600',
  },
  escalationStack: {
    gap: 8,
    marginTop: 4,
    },
    supportEscalateText: {
    fontSize: 12,
    color: '#475569',
  },
  });
}

const stylesBubble = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
  },
  assistant: {
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  user: {
    backgroundColor: 'rgba(56,189,248,0.08)',
  },
  system: {
    backgroundColor: 'rgba(148,163,184,0.15)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  author: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  time: {
    fontSize: 11,
    color: '#94a3b8',
  },
  text: {
    fontSize: 13,
    color: '#0f172a',
  },
  ticketLink: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.12)',
  },
  ticketLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4c1d95',
  },
});

const stylesTickets = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '90%',
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f4f4f5',
  },
  closeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  state: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  stateText: {
    fontSize: 13,
    color: '#4b5563',
  },
  listContent: {
    gap: 12,
    paddingBottom: 16,
  },
  row: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  rowMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  rowPreview: {
    fontSize: 13,
    color: '#0f172a',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  statusOpen: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    color: '#1d4ed8',
  },
  statusResolved: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    color: '#047857',
  },
  statusDefault: {
    backgroundColor: 'rgba(148,163,184,0.2)',
    color: '#475569',
  },
  webLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  webLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4c1d95',
  },
});

function useTranscriptScroll() {
  const scrollRef = useRef<ScrollView | null>(null);
  const distanceRef = useRef(0);
  const [showNewMessages, setShowNewMessages] = useState(false);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distance = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    distanceRef.current = distance;
    if (distance <= NEAR_BOTTOM_THRESHOLD) {
      setShowNewMessages(false);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
      distanceRef.current = 0;
      setShowNewMessages(false);
    });
  }, []);

  const notifyContentChange = useCallback(() => {
    if (distanceRef.current <= NEAR_BOTTOM_THRESHOLD) {
      scrollToBottom();
    } else {
      setShowNewMessages(true);
    }
  }, [scrollToBottom]);

  return {
    scrollRef,
    handleScroll,
    notifyContentChange,
    scrollToBottom,
    showNewMessages,
  };
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `linkler-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

