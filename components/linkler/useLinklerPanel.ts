'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export type CompanionEntry = {
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

export type LinklerPanelState = {
  cooldownEndsAt: number | null;
  setCooldownFromSeconds: (seconds: number) => void;
  cooldownRemaining: number;
  lastTicket: { id: string; created_at?: string } | null;
  setLastTicket: (ticket: { id: string; created_at?: string }) => void;
  supportSessionId: string;
  setSupportSessionId: (sessionId: string) => void;
  supportMessages: CompanionEntry[];
  appendSupportMessage: (entry: CompanionEntry) => void;
  resetSupportConversation: () => void;
};

const STORAGE_KEYS = {
  LAST_TICKET: 'linkler.lastTicket',
  COOLDOWN: 'linkler.cooldownEndsAt',
  SUPPORT_SESSION_ID: 'linkler.support.sessionId',
  SUPPORT_MESSAGES: 'linkler.support.transcript',
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

const MAX_COOLDOWN_MS = 15_000;

function generateSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `linkler-${Date.now()}`;
}

export function useLinklerPanel(): LinklerPanelState {
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
    if (!Number.isFinite(parsed)) return null;
    const remainingMs = parsed - Date.now();
    if (remainingMs <= 0 || remainingMs > MAX_COOLDOWN_MS) {
      return null;
    }
    return parsed;
  });
  const [heartbeat, setHeartbeat] = useState(Date.now());
  const [supportSessionId, setSupportSessionIdState] = useState(() => {
    if (!isBrowser()) return generateSessionId();
    const stored = window.localStorage.getItem(STORAGE_KEYS.SUPPORT_SESSION_ID);
    return stored || generateSessionId();
  });
  const [supportMessages, setSupportMessages] = useState<CompanionEntry[]>(() => {
    if (!isBrowser()) return [];
    return safeParseJSON<CompanionEntry[]>(window.localStorage.getItem(STORAGE_KEYS.SUPPORT_MESSAGES), []);
  });

  useEffect(() => {
    if (!isBrowser()) return;
    window.localStorage.setItem(STORAGE_KEYS.SUPPORT_SESSION_ID, supportSessionId);
  }, [supportSessionId]);

  useEffect(() => {
    if (!isBrowser()) return;
    window.localStorage.setItem(STORAGE_KEYS.SUPPORT_MESSAGES, JSON.stringify(supportMessages));
  }, [supportMessages]);

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

  useEffect(() => {
    if (!cooldownEndsAt) return;
    if (cooldownEndsAt - Date.now() <= 0) {
      setCooldownEndsAt(null);
    }
  }, [cooldownEndsAt, heartbeat]);

  const cooldownRemaining = useMemo(() => {
    if (!cooldownEndsAt) return 0;
    const diff = cooldownEndsAt - heartbeat;
    return diff <= 0 ? 0 : Math.ceil(diff / 1000);
  }, [cooldownEndsAt, heartbeat]);

  const appendSupportMessage = useCallback((entry: CompanionEntry) => {
    setSupportMessages((prev) => {
      const next = [...prev, entry].slice(-40);
      return next;
    });
  }, []);

  const resetSupportConversation = useCallback(() => {
    setSupportMessages([]);
    setSupportSessionIdState(generateSessionId());
  }, []);

  const setCooldownFromSeconds = useCallback((seconds: number) => {
    if (!seconds || seconds <= 0) {
      setCooldownEndsAt(null);
      return;
    }
    const clampedSeconds = Math.min(seconds, MAX_COOLDOWN_MS / 1000);
    setCooldownEndsAt(Date.now() + clampedSeconds * 1000);
  }, []);

  const setLastTicket = useCallback((ticket: { id: string; created_at?: string }) => {
    setLastTicketState(ticket);
  }, []);

  return {
    cooldownEndsAt,
    setCooldownFromSeconds,
    cooldownRemaining,
    lastTicket,
    setLastTicket,
    supportSessionId,
    setSupportSessionId: setSupportSessionIdState,
    supportMessages,
    appendSupportMessage,
    resetSupportConversation,
  };
}
