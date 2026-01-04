'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
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
    recommendHuman?: boolean;
    degraded?: boolean;
  };
};

const STORAGE_KEYS = {
  SESSION: 'linkler.mobile.session',
  MESSAGES: 'linkler.mobile.messages',
  LAST_TICKET: 'linkler.mobile.lastTicket',
  COOLDOWN: 'linkler.mobile.cooldown',
  SUPPORT_SESSION: 'linkler.mobile.support.session',
  SUPPORT_MESSAGES: 'linkler.mobile.support.messages',
};

const COMPOSER_MIN_HEIGHT = 44;
const COMPOSER_MAX_HEIGHT = 96;
const NEAR_BOTTOM_THRESHOLD = 80;
const MAX_COOLDOWN_MS = 15_000;

export function LinklerFab({ show = true }: { show?: boolean }) {
  const { theme } = useThemeMode();
  const { getAccessToken } = useAuthContext();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('support');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportContext, setSupportContext] = useState('');
  const [supportEscalating, setSupportEscalating] = useState(false);
  const [lastTicketId, setLastTicketId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(generateId());
  const [companionMessages, setCompanionMessages] = useState<CompanionEntry[]>([]);
  const [companionMessage, setCompanionMessage] = useState('');
  const [companionSending, setCompanionSending] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const [supportSessionId, setSupportSessionId] = useState<string>(generateId());
  const [supportMessages, setSupportMessages] = useState<CompanionEntry[]>([]);
  const [supportAsking, setSupportAsking] = useState(false);
  const [supportLinklerError, setSupportLinklerError] = useState<string | null>(null);
  const [supportSafetyNotice, setSupportSafetyNotice] = useState<string | null>(null);
  const [supportEscalationReason, setSupportEscalationReason] = useState<LinklerEscalationReason | null>(null);
  const [supportForceEscalate, setSupportForceEscalate] = useState(false);
  const [supportFailureReason, setSupportFailureReason] = useState<LinklerEscalationReason | null>(null);
  const [companionNotice, setCompanionNotice] = useState<string | null>(null);
  const [supportComposerHeight, setSupportComposerHeight] = useState(COMPOSER_MIN_HEIGHT);
  const [companionComposerHeight, setCompanionComposerHeight] = useState(COMPOSER_MIN_HEIGHT);

  const COOLDOWN_COPY = 'Hang on a sec...';
  const COOLDOWN_HINT = 'Hang on a sec... Try again in a few seconds.';
  const UNAVAILABLE_COPY = 'Linkler is temporarily unavailable.';

  const {
    scrollRef: supportScrollRef,
    handleScroll: handleSupportScroll,
    notifyContentChange: notifySupportScrollChange,
    scrollToBottom: scrollSupportToBottom,
    showNewMessages: supportShowNewMessages,
  } = useTranscriptScroll();

  const {
    scrollRef: companionScrollRef,
    handleScroll: handleCompanionScroll,
    notifyContentChange: notifyCompanionScrollChange,
    scrollToBottom: scrollCompanionToBottom,
    showNewMessages: companionShowNewMessages,
  } = useTranscriptScroll();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [session, transcript, ticket, cooldown, supportSession, supportTranscript] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.SESSION),
          AsyncStorage.getItem(STORAGE_KEYS.MESSAGES),
          AsyncStorage.getItem(STORAGE_KEYS.LAST_TICKET),
          AsyncStorage.getItem(STORAGE_KEYS.COOLDOWN),
          AsyncStorage.getItem(STORAGE_KEYS.SUPPORT_SESSION),
          AsyncStorage.getItem(STORAGE_KEYS.SUPPORT_MESSAGES),
        ]);
        if (cancelled) return;
        if (session) setSessionId(session);
        if (transcript) {
          try {
            setCompanionMessages(JSON.parse(transcript));
          } catch {
            // ignore
          }
        }
        if (ticket) setLastTicketId(ticket);
        if (cooldown) {
          const parsed = Number(cooldown);
          if (Number.isFinite(parsed)) {
            const remaining = parsed - Date.now();
            if (remaining > 0 && remaining <= MAX_COOLDOWN_MS) {
              setCooldownEndsAt(parsed);
            }
          }
        }
        if (supportSession) setSupportSessionId(supportSession);
        if (supportTranscript) {
          try {
            setSupportMessages(JSON.parse(supportTranscript));
          } catch {
            // ignore
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
    void AsyncStorage.setItem(STORAGE_KEYS.SESSION, sessionId);
  }, [sessionId, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) return;
    void AsyncStorage.setItem(STORAGE_KEYS.SUPPORT_SESSION, supportSessionId);
  }, [storageLoaded, supportSessionId]);

  useEffect(() => {
    if (!storageLoaded) return;
    void AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(companionMessages.slice(-40)));
  }, [companionMessages, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) return;
    void AsyncStorage.setItem(STORAGE_KEYS.SUPPORT_MESSAGES, JSON.stringify(supportMessages.slice(-40)));
  }, [storageLoaded, supportMessages]);

  useEffect(() => {
    if (!storageLoaded) return;
    notifySupportScrollChange();
  }, [storageLoaded, supportMessages, notifySupportScrollChange]);

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
    if (!cooldownEndsAt) return;
    if (cooldownEndsAt - Date.now() <= 0) {
      setCooldownEndsAt(null);
    }
  }, [cooldownEndsAt, tick]);

  useEffect(() => {
    if (!storageLoaded) return;
    notifyCompanionScrollChange();
  }, [storageLoaded, companionMessages, notifyCompanionScrollChange]);

  useEffect(() => {
    if (!supportMessage.trim()) {
      setSupportComposerHeight(COMPOSER_MIN_HEIGHT);
    }
  }, [supportMessage]);

  useEffect(() => {
    if (!companionMessage.trim()) {
      setCompanionComposerHeight(COMPOSER_MIN_HEIGHT);
    }
  }, [companionMessage]);

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

  const resetSupportConversation = useCallback(() => {
    setSupportMessages([]);
    setSupportSessionId(generateId());
    setSupportForceEscalate(false);
    setSupportEscalationReason(null);
    setSupportSafetyNotice(null);
    setSupportLinklerError(null);
    setSupportFailureReason(null);
  }, []);

  const handleAskLinklerSupport = useCallback(async () => {
    if (supportAsking || cooldownDisabled) return;

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
    setSupportMessages((prev) => [...prev.slice(-39), userEntry]);
    setSupportMessage('');
    setSupportSafetyNotice(null);
    setSupportLinklerError(null);
    setSupportFailureReason(null);

    const emergency = detectLinklerEmergency(trimmed);
    if (emergency.isEmergency) {
      setSupportSafetyNotice("This sounds urgent. We'll alert the human team right away.");
      setSupportForceEscalate(true);
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
        const clamped = Math.min(retrySeconds, MAX_COOLDOWN_MS / 1000);
        setCooldownEndsAt(Date.now() + clamped * 1000);
        setSupportLinklerError(COOLDOWN_HINT);
        setSupportFailureReason(null);
        return;
      }

      const failureReason: LinklerEscalationReason =
        res.status === 503 ? 'linkler_disabled' : 'ai_unavailable';
      const fallbackMessage = res.data?.reply?.trim() || UNAVAILABLE_COPY;
      setSupportMessages((prev) => [
        ...prev.slice(-39),
        {
          id: generateId(),
          role: 'assistant',
          text: fallbackMessage,
          createdAt: Date.now(),
          meta: { degraded: true },
        },
      ]);
      setSupportLinklerError(UNAVAILABLE_COPY);
      setSupportFailureReason(failureReason);
      return;
    }

    setSupportSessionId(res.data.sessionId);
    if (res.data.cooldownSeconds) {
      const clamped = Math.min(res.data.cooldownSeconds, MAX_COOLDOWN_MS / 1000);
      setCooldownEndsAt(Date.now() + clamped * 1000);
    } else {
      setCooldownEndsAt(null);
    }

    const assistantEntry: CompanionEntry = {
      id: generateId(),
      role: 'assistant',
      text: res.data.reply,
      createdAt: Date.now(),
      meta: {
        exposureTips: res.data.exposureTips || [],
        featureIdeas: res.data.featureIdeas || [],
        suggestSendToHuman: res.data.suggestSendToHuman,
        recommendHuman: res.data.recommendHuman,
        degraded: res.data.degraded,
      },
    };
    setSupportMessages((prev) => [...prev.slice(-39), assistantEntry]);

    setSupportFailureReason(null);
    setSupportLinklerError(null);

    if (res.data.recommendHuman) {
      setSupportForceEscalate(true);
      setSupportEscalationReason('ai_recommended');
    }
  }, [
    cooldownDisabled,
    getAccessToken,
    setCooldownEndsAt,
    supportAsking,
    supportContext,
    supportMessage,
    supportSessionId,
  ]);

  const derivedEscalationReason =
    supportEscalationReason || (supportForceEscalate ? supportFailureReason ?? 'user_requested' : null);

  const escalationHint = useMemo(() => {
    switch (derivedEscalationReason) {
      case 'emergency':
        return 'This sounds urgent. Sending it to our human team.';
      case 'ai_unavailable':
      case 'timeout':
        return 'Linkler could not respond, so we can escalate it manually.';
      case 'ai_recommended':
        return 'Linkler suggested a human take a closer look.';
      case 'linkler_disabled':
        return 'Linkler is offline. We will pass it to support directly.';
      case 'user_requested':
        return 'Ready to involve the human team? Send the latest details.';
      default:
        return 'Send this conversation to human support.';
    }
  }, [derivedEscalationReason]);

  const handleSupportEscalation = useCallback(async () => {
    if (supportEscalating) return;

    let messageBody = supportMessage.trim();
    if (!messageBody) {
      messageBody = lastSupportUser?.text?.trim() ?? '';
    }

    if (!messageBody) {
      Alert.alert('Linkler', 'Please add a quick summary before escalating.');
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

    const context = buildLinklerEscalationContext({
      sessionId: supportSessionId,
      transcript: supportMessages,
      lastLinklerReply: lastSupportAssistant?.text,
      reason: derivedEscalationReason ?? 'user_requested',
      metadata: {
        ...(contextPayload ? { userContext: contextPayload } : {}),
        channel: 'support-tab-mobile',
      },
    });

    setSupportEscalating(true);
    const res = await linklerSupportIntake({ message: messageBody, context }, token);
    setSupportEscalating(false);

    if (!res.ok || !res.data?.ok || !res.data.ticket) {
      Alert.alert('Linkler', res.data?.error || res.message || 'Support request failed.');
      return;
    }

    setLastTicketId(res.data.ticket.id);
    resetSupportConversation();
    setSupportMessage('');
    setSupportContext('');
    Alert.alert('Linkler', 'Sent to human support. A team member will follow up soon.');
  }, [
    derivedEscalationReason,
    getAccessToken,
    lastSupportAssistant,
    lastSupportUser,
    resetSupportConversation,
    supportContext,
    supportEscalating,
    supportMessage,
    supportMessages,
    supportSessionId,
  ]);

  const canEscalate = Boolean(derivedEscalationReason);

  const handleRequestEscalation = useCallback(() => {
    setSupportForceEscalate(true);
    setSupportEscalationReason((prev) => prev ?? supportFailureReason ?? 'user_requested');
  }, [supportFailureReason]);

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
    setCompanionNotice(null);

    const userEntry: CompanionEntry = {
      id: generateId(),
      role: 'user',
      text: trimmed,
      createdAt: Date.now(),
    };
    setCompanionMessages((prev) => [...prev.slice(-39), userEntry]);

    try {
      const res = await linklerCompanionChat({ message: trimmed, sessionId }, token);

      if (!res.ok || !res.data?.ok) {
        const retrySeconds = (res.data as any)?.retryAfterSeconds;
        if (retrySeconds) {
          const clamped = Math.min(retrySeconds, MAX_COOLDOWN_MS / 1000);
          setCooldownEndsAt(Date.now() + clamped * 1000);
          setCompanionNotice(COOLDOWN_HINT);
          return;
        }

        const fallbackReply = res.data?.reply?.trim() || UNAVAILABLE_COPY;
        setCompanionMessages((prev) => [
          ...prev.slice(-39),
          {
            id: generateId(),
            role: 'assistant',
            text: fallbackReply,
            createdAt: Date.now(),
            meta: { degraded: true },
          },
        ]);
        setCompanionNotice(UNAVAILABLE_COPY);
        return;
      }

      setSessionId(res.data.sessionId);
      if (res.data.cooldownSeconds) {
        const clamped = Math.min(res.data.cooldownSeconds, MAX_COOLDOWN_MS / 1000);
        setCooldownEndsAt(Date.now() + clamped * 1000);
      } else {
        setCooldownEndsAt(null);
      }

      const assistantEntry: CompanionEntry = {
        id: generateId(),
        role: 'assistant',
        text: res.data.reply,
        createdAt: Date.now(),
        meta: {
          exposureTips: res.data.exposureTips || [],
          featureIdeas: res.data.featureIdeas || [],
          suggestSendToHuman: res.data.suggestSendToHuman,
          recommendHuman: res.data.recommendHuman,
          degraded: res.data.degraded,
        },
      };
      setCompanionMessages((prev) => [...prev.slice(-39), assistantEntry]);
      setCompanionNotice(null);
    } catch (error: any) {
      setCompanionMessages((prev) => [
        ...prev.slice(-39),
        {
          id: generateId(),
          role: 'assistant',
          text: UNAVAILABLE_COPY,
          createdAt: Date.now(),
          meta: { degraded: true },
        },
      ]);
      setCompanionNotice(UNAVAILABLE_COPY);
    } finally {
      setCompanionSending(false);
    }
  }, [companionMessage, companionSending, cooldownDisabled, getAccessToken, sessionId]);

  const handleCompanionComposerSize = useCallback(
    (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const next = Math.min(
        Math.max(event.nativeEvent.contentSize.height, COMPOSER_MIN_HEIGHT),
        COMPOSER_MAX_HEIGHT
      );
      setCompanionComposerHeight(next);
    },
    []
  );

  const handleEscalateFromChat = useCallback(() => {
    const summary = buildTranscriptSummary(companionMessages);
    if (summary) {
      setSupportMessage(summary);
    }
    setSupportForceEscalate(true);
    setSupportEscalationReason((prev) => prev ?? 'user_requested');
    setActiveTab('support');
  }, [companionMessages]);

  const supportComposerPadding = Math.max(insets.bottom, 12);
  const companionComposerPadding = Math.max(insets.bottom, 12);
  const sheetPaddingBottom = Math.max(insets.bottom, 16);

  const renderSupportSection = () => (
    <View style={styles.chatSection}>
      {lastTicketId && (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Ticket sent</Text>
          <Text style={styles.noticeSubtitle}>#{lastTicketId.slice(0, 8).toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.supportHint}>
        <Text style={styles.supportHintTitle}>Ask Linkler first</Text>
        <Text style={styles.supportHintText}>
          Linkler replies here and shows the human option only when it is needed.
        </Text>
      </View>

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
              Share what is going on and Linkler will respond in this space.
            </Text>
          ) : (
            supportMessages.map((entry) => (
              <CompanionBubble key={entry.id} entry={entry} themeMode={theme.mode} />
            ))
          )}
        </ScrollView>
        {supportShowNewMessages && (
          <Pressable style={styles.newMessagesChip} onPress={scrollSupportToBottom}>
            <Text style={styles.newMessagesText}>New messages</Text>
          </Pressable>
        )}
      </View>

      {supportSafetyNotice ? <Text style={styles.supportNotice}>{supportSafetyNotice}</Text> : null}
      {supportLinklerError ? <Text style={styles.statusText}>{supportLinklerError}</Text> : null}

      <View style={[styles.composerCard, { paddingBottom: supportComposerPadding }]}>
        <TextInput
          multiline
          value={supportMessage}
          onChangeText={setSupportMessage}
          placeholder="Describe the issue... Linkler will try to help first."
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
          placeholder='Optional context (JSON). Example: {"screen":"home"}'
          style={[styles.input, styles.contextInput]}
          textAlignVertical="top"
        />
        <View style={styles.actionsRow}>
          <Button
            title={supportAsking ? 'Asking Linkler...' : cooldownDisabled ? COOLDOWN_COPY : 'Ask Linkler'}
            onPress={() => void handleAskLinklerSupport()}
            disabled={supportAsking || cooldownDisabled}
            style={styles.chatButton}
          />
          {!canEscalate && (
            <Pressable onPress={handleRequestEscalation} style={styles.escalateLink}>
              <Text style={styles.escalateLinkText}>Need a human review?</Text>
            </Pressable>
          )}
        </View>
        {cooldownDisabled && !supportLinklerError ? (
          <Text style={styles.statusText}>{COOLDOWN_HINT}</Text>
        ) : null}
      </View>

      {canEscalate && (
        <View style={styles.supportEscalateBox}>
          <Text style={styles.supportEscalateText}>{escalationHint}</Text>
          <Button
            title={supportEscalating ? 'Sending...' : 'Send to human support'}
            variant="secondary"
            onPress={() => void handleSupportEscalation()}
            disabled={supportEscalating}
          />
        </View>
      )}
    </View>
  );

  const renderCompanionSection = () => (
    <View style={styles.chatSection}>
      <View style={styles.scrollWrapper}>
        <ScrollView
          ref={companionScrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleCompanionScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          {companionMessages.length === 0 ? (
            <Text style={styles.chatPlaceholder}>
              Say hi! Linkler can share exposure tips, feature guidance, and knows when to loop in humans.
            </Text>
          ) : (
            companionMessages.map((entry) => (
              <CompanionBubble key={entry.id} entry={entry} themeMode={theme.mode} />
            ))
          )}
        </ScrollView>
        {companionShowNewMessages && (
          <Pressable style={styles.newMessagesChip} onPress={scrollCompanionToBottom}>
            <Text style={styles.newMessagesText}>New messages</Text>
          </Pressable>
        )}
      </View>

      {companionNotice ? <Text style={styles.statusText}>{companionNotice}</Text> : null}

      <View style={[styles.composerCard, { paddingBottom: companionComposerPadding }]}>
        <TextInput
          multiline
          value={companionMessage}
          onChangeText={setCompanionMessage}
          placeholder="Share what's going on..."
          style={[styles.input, { height: companionComposerHeight }]}
          textAlignVertical="top"
          editable={!companionSending && !cooldownDisabled}
          onContentSizeChange={handleCompanionComposerSize}
        />
        <View style={styles.actionsRow}>
          <Button
            title={companionSending ? 'Sending...' : 'Chat with Linkler'}
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
        {cooldownDisabled && !companionNotice ? (
          <Text style={styles.statusText}>{COOLDOWN_HINT}</Text>
        ) : null}
        {companionNotice ? <Text style={styles.statusText}>{companionNotice}</Text> : null}
      </View>
    </View>
  );

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
        <View style={[styles.sheet, { paddingBottom: sheetPaddingBottom }]}>
          <Text style={styles.sheetTitle}>Linkler</Text>
          <Text style={styles.sheetSubtitle}>AI replies first. Humans are on standby.</Text>

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

          {activeTab === 'support' ? renderSupportSection() : renderCompanionSection()}
        </View>
      </Modal>
    </>
  );
}

function CompanionBubble({ entry, themeMode }: { entry: CompanionEntry; themeMode: string }) {
  const isAssistant = entry.role === 'assistant';
  const recommendHuman = entry.meta?.recommendHuman ?? entry.meta?.suggestSendToHuman;
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

      {recommendHuman && (
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
      width: '100%',
      maxWidth: 420,
      maxHeight: '90%',
      minHeight: 420,
      alignSelf: 'stretch',
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
    chatSection: {
      flex: 1,
      gap: 12,
      width: '100%',
    },
    notice: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 10,
      backgroundColor: theme.tokens.surfaceCard,
      gap: 4,
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
    supportHint: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
      backgroundColor: theme.tokens.surfaceCard,
      gap: 4,
    },
    supportHintTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    supportHintText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    scrollWrapper: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.tokens.surfaceCard,
      overflow: 'hidden',
      position: 'relative',
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
      color: theme.colors.textSecondary,
    },
    newMessagesChip: {
      position: 'absolute',
      bottom: 12,
      alignSelf: 'center',
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.surfaceCard,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    newMessagesText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    supportNotice: {
      fontSize: 12,
      color: theme.colors.accent,
      fontWeight: '700',
    },
    statusText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '700',
    },
    composerCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.tokens.surfaceCard,
      padding: 12,
      gap: 12,
    },
    input: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: theme.colors.textPrimary,
      backgroundColor: theme.tokens.surfaceCard,
      fontSize: 14,
    },
    contextInput: {
      minHeight: 70,
    },
    errorText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.error,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    chatButton: {
      flex: 1,
    },
    escalateLink: {
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    escalateLinkText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.accent,
    },
    supportEscalateBox: {
      gap: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      padding: 12,
      backgroundColor: theme.mode === 'light' ? 'rgba(94,155,255,0.08)' : 'rgba(94,155,255,0.18)',
    },
    supportEscalateText: {
      fontSize: 12,
      color: theme.colors.accent,
      fontWeight: '700',
    },
  });
}

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
