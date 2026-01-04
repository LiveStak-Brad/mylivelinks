'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modal, Button } from './ui';
import { useThemeMode } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';
import { linklerSupportIntake, linklerCompanionChat } from '../lib/api';

const LINKLER_IMAGE = require('../../linkler.png');

type Tab = 'support' | 'companion';

type CompanionEntry = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
  meta?: {
    exposureTips?: string[];
    featureIdeas?: string[];
    suggestSendToHuman?: boolean;
  };
};

type LinklerUsage = {
  usedToday: number;
  remainingToday: number;
  dailyLimit: number;
};

const STORAGE_KEYS = {
  SESSION: 'linkler.mobile.session',
  MESSAGES: 'linkler.mobile.messages',
  LAST_TICKET: 'linkler.mobile.lastTicket',
  COOLDOWN: 'linkler.mobile.cooldown',
};

export function LinklerFab({ show = true }: { show?: boolean }) {
  const { theme } = useThemeMode();
  const { getAccessToken } = useAuthContext();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('support');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportContext, setSupportContext] = useState('');
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [lastTicketId, setLastTicketId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(generateId());
  const [messages, setMessages] = useState<CompanionEntry[]>([]);
  const [companionMessage, setCompanionMessage] = useState('');
  const [companionSending, setCompanionSending] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [usage, setUsage] = useState<LinklerUsage | null>(null);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [session, transcript, ticket, cooldown] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.SESSION),
          AsyncStorage.getItem(STORAGE_KEYS.MESSAGES),
          AsyncStorage.getItem(STORAGE_KEYS.LAST_TICKET),
          AsyncStorage.getItem(STORAGE_KEYS.COOLDOWN),
        ]);
        if (cancelled) return;
        if (session) setSessionId(session);
        if (transcript) {
          try {
            setMessages(JSON.parse(transcript));
          } catch {
            // ignore
          }
        }
        if (ticket) setLastTicketId(ticket);
        if (cooldown) {
          const parsed = Number(cooldown);
          if (Number.isFinite(parsed)) setCooldownEndsAt(parsed);
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
    void AsyncStorage.setItem(STORAGE_KEYS.SESSION, sessionId);
  }, [sessionId, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) return;
    void AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages.slice(-40)));
  }, [messages, storageLoaded]);

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

  const cooldownRemaining = useMemo(() => {
    if (!cooldownEndsAt) return 0;
    const diff = cooldownEndsAt - tick;
    return diff <= 0 ? 0 : Math.ceil(diff / 1000);
  }, [cooldownEndsAt, tick]);

  const cooldownDisabled = cooldownRemaining > 0;

  const handleSupportSubmit = useCallback(async () => {
    if (supportSubmitting) return;
    const trimmed = supportMessage.trim();
    if (!trimmed) {
      Alert.alert('Linkler', 'Please describe the issue before sending.');
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

    setSupportSubmitting(true);
    const token = await getAccessToken();
    if (!token) {
      setSupportSubmitting(false);
      Alert.alert('Linkler', 'Please sign in again to contact support.');
      return;
    }

    const res = await linklerSupportIntake({ message: trimmed, context: contextPayload }, token);
    setSupportSubmitting(false);

    if (!res.ok || !res.data?.ok || !res.data.ticket) {
      Alert.alert('Linkler', res.data?.error || res.message || 'Support request failed.');
      return;
    }

    setLastTicketId(res.data.ticket.id);
    setSupportMessage('');
    setSupportContext('');
    setActiveTab('companion');
    Alert.alert('Linkler', 'Ticket sent. A human will follow up soon.');
  }, [getAccessToken, supportContext, supportMessage, supportSubmitting]);

  const handleCompanionSend = useCallback(async () => {
    if (companionSending || cooldownDisabled) return;
    const trimmed = companionMessage.trim();
    if (!trimmed) return;

    const token = await getAccessToken();
    if (!token) {
      Alert.alert('Linkler', 'Please sign in to chat with Linkler.');
      return;
    }

    setCompanionMessage('');
    setCompanionSending(true);

    const userEntry: CompanionEntry = {
      id: generateId(),
      role: 'user',
      text: trimmed,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev.slice(-39), userEntry]);

    const res = await linklerCompanionChat({ message: trimmed, sessionId }, token);

    setCompanionSending(false);

    if (!res.ok || !res.data?.ok) {
      const retrySeconds = (res.data as any)?.retryAfterSeconds;
      if (retrySeconds) {
        setCooldownEndsAt(Date.now() + retrySeconds * 1000);
      }
      Alert.alert('Linkler', res.data?.error || res.message || 'Linkler is busy, try again soon.');
      return;
    }

    setSessionId(res.data.sessionId);
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
        exposureTips: res.data.exposureTips || [],
        featureIdeas: res.data.featureIdeas || [],
        suggestSendToHuman: res.data.suggestSendToHuman,
      },
    };
    setMessages((prev) => [...prev.slice(-39), assistantEntry]);
  }, [companionMessage, companionSending, cooldownDisabled, getAccessToken, sessionId]);

  const handleEscalateFromChat = useCallback(() => {
    const summary = buildTranscriptSummary(messages);
    if (summary) {
      setSupportMessage(summary);
    }
    setActiveTab('support');
  }, [messages]);

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
        <Image source={LINKLER_IMAGE} style={styles.fabImage} />
      </Pressable>

      <Modal visible={visible} onRequestClose={() => setVisible(false)}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Linkler</Text>
          <Text style={styles.sheetSubtitle}>AI-assisted, human reviewed.</Text>

          <View style={styles.tabs}>
            <Pressable
              onPress={() => setActiveTab('support')}
              style={[styles.tabButton, activeTab === 'support' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabLabel, activeTab === 'support' && styles.tabLabelActive]}>Support</Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('companion')}
              style={[styles.tabButton, activeTab === 'companion' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabLabel, activeTab === 'companion' && styles.tabLabelActive]}>Companion</Text>
            </Pressable>
          </View>

          {activeTab === 'support' ? (
            <View style={styles.section}>
              {lastTicketId && (
                <View style={styles.notice}>
                  <Text style={styles.noticeTitle}>Ticket sent</Text>
                  <Text style={styles.noticeSubtitle}>#{lastTicketId.slice(0, 8).toUpperCase()}</Text>
                </View>
              )}

              <TextInput
                multiline
                value={supportMessage}
                onChangeText={setSupportMessage}
                placeholder="Describe the issue…"
                style={styles.input}
                textAlignVertical="top"
              />

              <TextInput
                multiline
                value={supportContext}
                onChangeText={setSupportContext}
                placeholder='Optional context (JSON). Example: {"screen":"home"}'
                style={[styles.input, styles.contextInput]}
                textAlignVertical="top"
              />

              <Button
                title={supportSubmitting ? 'Sending…' : 'Send to human support'}
                onPress={() => void handleSupportSubmit()}
                disabled={supportSubmitting}
              />
            </View>
          ) : (
            <View style={styles.section}>
              <View style={styles.usageRow}>
                <Text style={styles.usageLabel}>
                  {usage ? `Daily limit: ${usage.usedToday}/${usage.dailyLimit}` : 'Daily chat limit applies'}
                </Text>
                {cooldownDisabled && (
                  <Text style={styles.cooldownLabel}>Recharging {cooldownRemaining}s</Text>
                )}
              </View>

              <ScrollView style={styles.chatLog} contentContainerStyle={{ gap: 12 }}>
                {messages.length === 0 ? (
                  <Text style={styles.chatPlaceholder}>
                    Say hi! Linkler can share exposure tips, feature guidance, and knows when to loop in humans.
                  </Text>
                ) : (
                  messages.map((entry) => (
                    <CompanionBubble key={entry.id} entry={entry} themeMode={theme.mode} />
                  ))
                )}
              </ScrollView>

              <TextInput
                multiline
                value={companionMessage}
                onChangeText={setCompanionMessage}
                placeholder="Share what's going on…"
                style={styles.input}
                textAlignVertical="top"
                editable={!companionSending && !cooldownDisabled}
              />

              <View style={styles.actionsRow}>
                <Button
                  title={companionSending ? 'Sending…' : 'Chat with Linkler'}
                  onPress={() => void handleCompanionSend()}
                  disabled={!companionMessage.trim() || companionSending || cooldownDisabled}
                  style={styles.chatButton}
                />
                <Button
                  title="Send to support"
                  variant="secondary"
                  onPress={handleEscalateFromChat}
                  style={styles.chatButton}
                />
              </View>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

function CompanionBubble({ entry, themeMode }: { entry: CompanionEntry; themeMode: string }) {
  const isAssistant = entry.role === 'assistant';
  return (
    <View
      style={[
        stylesBubble.container,
        isAssistant ? stylesBubble.assistant : stylesBubble.user,
        { borderColor: themeMode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' },
      ]}
    >
      <Text style={stylesBubble.author}>{isAssistant ? 'Linkler' : 'You'}</Text>
      <Text style={stylesBubble.text}>{entry.text}</Text>

      {entry.meta?.exposureTips?.length ? (
        <View style={stylesBubble.metaBlock}>
          <Text style={stylesBubble.metaTitle}>Exposure tips</Text>
          {entry.meta.exposureTips.map((tip) => (
            <Text key={tip} style={stylesBubble.metaText}>
              • {tip}
            </Text>
          ))}
        </View>
      ) : null}

      {entry.meta?.featureIdeas?.length ? (
        <View style={stylesBubble.metaBlock}>
          <Text style={stylesBubble.metaTitle}>Feature ideas</Text>
          {entry.meta.featureIdeas.map((idea) => (
            <Text key={idea} style={stylesBubble.metaText}>
              #{idea}
            </Text>
          ))}
        </View>
      ) : null}

      {entry.meta?.suggestSendToHuman && (
        <Text style={stylesBubble.metaTitle}>Linkler recommends sending this to human support.</Text>
      )}
    </View>
  );
}

function buildTranscriptSummary(entries: CompanionEntry[]) {
  if (!entries.length) return '';
  const recent = entries.slice(-4).map((entry) => `${entry.role === 'assistant' ? 'Linkler' : 'User'}: ${entry.text}`);
  return `Context from Linkler chat:\n${recent.join('\n')}`;
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `linkler-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
      backgroundColor: theme.colors.accent,
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
    sheet: {
      gap: 12,
    },
    sheetTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    sheetSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    tabs: {
      flexDirection: 'row',
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceCard,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabButtonActive: {
      backgroundColor: theme.colors.accent,
    },
    tabLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    tabLabelActive: {
      color: '#fff',
    },
    section: {
      gap: 12,
    },
    input: {
      minHeight: 90,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
      color: theme.colors.textPrimary,
      backgroundColor: theme.tokens.surfaceCard,
      fontSize: 14,
    },
    contextInput: {
      minHeight: 70,
    },
    notice: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 10,
      backgroundColor: theme.tokens.surfaceCard,
    },
    noticeTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    noticeSubtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    usageRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    usageLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    cooldownLabel: {
      fontSize: 12,
      color: theme.colors.accent,
      fontWeight: '700',
    },
    chatLog: {
      maxHeight: 220,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
      backgroundColor: theme.tokens.surfaceCard,
    },
    chatPlaceholder: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    chatButton: {
      flex: 1,
    },
  });
}

const stylesBubble = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  user: {
    backgroundColor: 'rgba(94,155,255,0.12)',
  },
  assistant: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  author: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  text: {
    fontSize: 13,
    color: '#f1f5f9',
  },
  metaBlock: {
    marginTop: 4,
    gap: 2,
  },
  metaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5f5',
  },
  metaText: {
    fontSize: 12,
    color: '#dbeafe',
  },
});
