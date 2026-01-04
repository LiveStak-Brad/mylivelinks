'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export type LinklerPanelTab = 'support' | 'companion';

export type CompanionEntry = {
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

export type LinklerUsage = {
  usedToday: number;
  remainingToday: number;
  dailyLimit: number;
};

export type LinklerPanelState = {
  activeTab: LinklerPanelTab;
  setActiveTab: (tab: LinklerPanelTab) => void;
  sessionId: string;
  setSessionId: (sessionId: string) => void;
  messages: CompanionEntry[];
  appendMessage: (entry: CompanionEntry) => void;
  resetConversation: () => void;
  cooldownEndsAt: number | null;
  setCooldownFromSeconds: (seconds: number) => void;
  cooldownRemaining: number;
  lastTicket: { id: string; created_at?: string } | null;
  setLastTicket: (ticket: { id: string; created_at?: string }) => void;
  usage: LinklerUsage | null;
  setUsage: (usage: LinklerUsage | null) => void;
};

const STORAGE_KEYS = {
  SESSION_ID: 'linkler.sessionId',
  MESSAGES: 'linkler.transcript',
  LAST_TICKET: 'linkler.lastTicket',
  COOLDOWN: 'linkler.cooldownEndsAt',
};

function isBrowser() {
  return typeof window !== 'undefined';
}

function safeParseJSON<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function generateSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `linkler-${Date.now()}`;
}

export function useLinklerPanel(): LinklerPanelState {
  const [activeTab, setActiveTab] = useState<LinklerPanelTab>('support');
  const [sessionId, setSessionIdState] = useState(() => {
    if (!isBrowser()) return generateSessionId();
    const stored = window.localStorage.getItem(STORAGE_KEYS.SESSION_ID);
    return stored || generateSessionId();
  });
  const [messages, setMessages] = useState<CompanionEntry[]>(() => {
    if (!isBrowser()) return [];
    return safeParseJSON<CompanionEntry[]>(window.localStorage.getItem(STORAGE_KEYS.MESSAGES), []);
  });
  const [lastTicket, setLastTicketState] = useState<{ id: string; created_at?: string } | null>(() => {
    if (!isBrowser()) return null;
    return safeParseJSON<{ id: string; created_at?: string } | null>(
      window.localStorage.getItem(STORAGE_KEYS.LAST_TICKET),
      null
    );
  });
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(() => {
    if (!isBrowser()) return null;
    const value = window.localStorage.getItem(STORAGE_KEYS.COOLDOWN);
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });
  const [usage, setUsage] = useState<LinklerUsage | null>(null);
  const [heartbeat, setHeartbeat] = useState(Date.now());

  useEffect(() => {
    if (!isBrowser()) return;
    window.localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (!isBrowser()) return;
    window.localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (!isBrowser()) return;
    if (!lastTicket) {
      window.localStorage.removeItem(STORAGE_KEYS.LAST_TICKET);
      return;
    }
    window.localStorage.setItem(STORAGE_KEYS.LAST_TICKET, JSON.stringify(lastTicket));
  }, [lastTicket]);

  useEffect(() => {
    if (!isBrowser()) return;
    if (!cooldownEndsAt) {
      window.localStorage.removeItem(STORAGE_KEYS.COOLDOWN);
    } else {
      window.localStorage.setItem(STORAGE_KEYS.COOLDOWN, String(cooldownEndsAt));
    }
  }, [cooldownEndsAt]);

  useEffect(() => {
    const interval = setInterval(() => setHeartbeat(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const cooldownRemaining = useMemo(() => {
    if (!cooldownEndsAt) return 0;
    const diff = cooldownEndsAt - heartbeat;
    return diff <= 0 ? 0 : Math.ceil(diff / 1000);
  }, [cooldownEndsAt, heartbeat]);

  const setSessionId = useCallback((nextId: string) => {
    setSessionIdState(nextId);
  }, []);

  const appendMessage = useCallback((entry: CompanionEntry) => {
    setMessages((prev) => {
      const next = [...prev, entry].slice(-40);
      return next;
    });
  }, []);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setSessionIdState(generateSessionId());
    setCooldownEndsAt(null);
    setUsage(null);
  }, []);

  const setCooldownFromSeconds = useCallback((seconds: number) => {
    if (!seconds || seconds <= 0) {
      setCooldownEndsAt(null);
      return;
    }
    setCooldownEndsAt(Date.now() + seconds * 1000);
  }, []);

  const setLastTicket = useCallback((ticket: { id: string; created_at?: string }) => {
    setLastTicketState(ticket);
  }, []);

  return {
    activeTab,
    setActiveTab,
    sessionId,
    setSessionId,
    messages,
    appendMessage,
    resetConversation,
    cooldownEndsAt,
    setCooldownFromSeconds,
    cooldownRemaining,
    lastTicket,
    setLastTicket,
    usage,
    setUsage,
  };
}
