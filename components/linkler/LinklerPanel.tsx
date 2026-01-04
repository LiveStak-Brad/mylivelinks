'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState, useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { Button, Badge, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { type LinklerPanelState, type CompanionEntry } from './useLinklerPanel';
import { postCompanionMessage, submitSupportTicket } from '@/lib/api/linkler';
import {
  buildLinklerEscalationContext,
  detectLinklerEmergency,
  type LinklerEscalationReason,
} from '@/shared/linkler/escalation';
import { useSmartScroll } from './useSmartScroll';
import { LinklerTicketsModal } from './LinklerTicketsModal';
import { createClient } from '@/lib/supabase';

const COMPOSER_MAX_HEIGHT = 96;
const COMPOSER_MIN_HEIGHT = 44;
const COOLDOWN_COPY = 'Hang on a sec...';
const COOLDOWN_HINT = 'Hang on a sec... Try again in a few seconds.';
const UNAVAILABLE_COPY = 'Linkler is temporarily unavailable.';
const LINKLER_AVATAR_SRC = '/linklerprofile.png';
const USER_FALLBACK_AVATAR = '/no-profile-pic.png';

type LinklerPanelProps = {
  state: LinklerPanelState;
  ticketsOpen: boolean;
  onCloseTickets: () => void;
};

export function LinklerPanel({ state, ticketsOpen, onCloseTickets }: LinklerPanelProps) {
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportError, setSupportError] = useState<string | null>(null);
  const [supportSafetyNotice, setSupportSafetyNotice] = useState<string | null>(null);
  const [supportLinklerError, setSupportLinklerError] = useState<string | null>(null);
  const [supportEscalationReason, setSupportEscalationReason] = useState<LinklerEscalationReason | null>(null);
  const [supportFailureReason, setSupportFailureReason] = useState<LinklerEscalationReason | null>(null);
  const [supportAsking, setSupportAsking] = useState(false);
  const [supportEscalating, setSupportEscalating] = useState(false);
  const [viewerAvatar, setViewerAvatar] = useState<string | null>(null);

  const {
    containerRef: supportScrollContainer,
    endAnchorRef: supportScrollEndAnchor,
    onScroll: handleSupportScroll,
    scrollToBottom: scrollSupportToBottom,
    notifyContentChange: notifySupportContent,
    showNewMessages: supportHasNewMessages,
  } = useSmartScroll();

  const lastSupportAssistantMessage = useMemo(() => {
    for (let i = state.supportMessages.length - 1; i >= 0; i -= 1) {
      const entry = state.supportMessages[i];
      if (entry.role === 'assistant') return entry;
    }
    return null;
  }, [state.supportMessages]);

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setViewerAvatar(null);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) {
        setViewerAvatar(profile?.avatar_url ?? null);
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const lastSupportUserMessage = useMemo(() => {
    for (let i = state.supportMessages.length - 1; i >= 0; i -= 1) {
      const entry = state.supportMessages[i];
      if (entry.role === 'user') return entry;
    }
    return null;
  }, [state.supportMessages]);

  const handleAskLinklerSupport = useCallback(async () => {
    setSupportError(null);
    setSupportSafetyNotice(null);
    setSupportLinklerError(null);
    setSupportFailureReason(null);

    const trimmed = supportMessage.trim();
    if (!trimmed) {
      setSupportError('Please describe the issue.');
      return;
    }

    const userEntry: CompanionEntry = {
      id: newMessageId(),
      role: 'user',
      text: trimmed,
      createdAt: Date.now(),
    };

    state.appendSupportMessage(userEntry);
    setSupportMessage('');

    const emergency = detectLinklerEmergency(trimmed);
    if (emergency.isEmergency) {
      setSupportSafetyNotice("This sounds urgent. Let's alert the human support team right away.");
      setSupportEscalationReason('emergency');
      return;
    }

    setSupportAsking(true);
    try {
      const result = await postCompanionMessage({
        message: trimmed,
        sessionId: state.supportSessionId,
      });

      if (!result.ok || !result.data?.ok) {
        const retrySeconds = result.data?.retryAfterSeconds ?? 0;
        if (retrySeconds > 0) {
          state.setCooldownFromSeconds(retrySeconds);
          setSupportLinklerError(COOLDOWN_HINT);
          return;
        }

        const fallbackText = result.data?.reply?.trim() || UNAVAILABLE_COPY;
        const degradedEntry: CompanionEntry = {
          id: newMessageId(),
          role: 'assistant',
          text: fallbackText,
          createdAt: Date.now(),
          meta: { degraded: true },
        };
        state.appendSupportMessage(degradedEntry);
        setSupportLinklerError(UNAVAILABLE_COPY);
        setSupportFailureReason(result.status === 503 ? 'linkler_disabled' : 'ai_unavailable');
        return;
      }

      state.setSupportSessionId(result.data.sessionId);
      state.setCooldownFromSeconds(result.data.cooldownSeconds);

      const assistantEntry: CompanionEntry = {
        id: newMessageId(),
        role: 'assistant',
        text: result.data.reply,
        createdAt: Date.now(),
        meta: {
          exposureTips: result.data.exposureTips,
          featureIdeas: result.data.featureIdeas,
          suggestSendToHuman: result.data.suggestSendToHuman,
          recommendHuman: result.data.recommendHuman,
          degraded: result.data.degraded,
        },
      };
      state.appendSupportMessage(assistantEntry);

      if (result.data.recommendHuman) {
        setSupportEscalationReason('ai_recommended');
      }
    } finally {
      setSupportAsking(false);
    }
  }, [state, supportMessage]);

  const handleSupportEscalation = useCallback(async () => {
    setSupportError(null);

    let messageBody = supportMessage.trim();
    if (!messageBody) {
      messageBody = lastSupportUserMessage?.text?.trim() ?? '';
    }

    if (!messageBody) {
      setSupportError('Share a quick summary before contacting support.');
      return;
    }

    const reason = supportEscalationReason ?? supportFailureReason ?? 'user_requested';

    const contextPayload = buildLinklerEscalationContext({
      sessionId: state.supportSessionId,
      transcript: state.supportMessages,
      lastLinklerReply: lastSupportAssistantMessage?.text,
      reason,
      metadata: {
        channel: 'support-tab',
      },
    });

    setSupportEscalating(true);
    const result = await submitSupportTicket({ message: messageBody, context: contextPayload });
    setSupportEscalating(false);

    if (!result.ok || !result.data?.ok || !result.data.ticket) {
      toast({
        title: 'Escalation failed',
        description: result.data?.error || result.error || 'Please try again.',
        variant: 'error',
      });
      return;
    }

    state.setLastTicket({
      id: result.data.ticket.id,
      created_at: result.data.ticket.created_at,
    });
    state.resetSupportConversation();
    setSupportMessage('');
    setSupportSafetyNotice(null);
    setSupportLinklerError(null);
    setSupportEscalationReason(null);
    setSupportFailureReason(null);

    toast({
      title: 'Sent to human support',
      description: 'Our team will follow up via Linkler or Noties.',
    });
  }, [
    lastSupportAssistantMessage,
    lastSupportUserMessage,
    state,
    supportEscalationReason,
    supportFailureReason,
    supportMessage,
    toast,
  ]);

  const cooldownDisabled = state.cooldownRemaining > 0;
  const escalationKey = supportEscalationReason ?? supportFailureReason;
  const escalationHint = useMemo(() => {
    switch (escalationKey) {
      case 'emergency':
        return 'This sounds urgent. We will route this straight to human support.';
      case 'ai_recommended':
        return 'Linkler flagged this for a human follow-up.';
      case 'ai_unavailable':
      case 'timeout':
        return 'Linkler could not finish, so we can escalate it manually.';
      case 'linkler_disabled':
        return 'Linkler is offline, but our human team can still help.';
      default:
        return null;
    }
  }, [escalationKey]);

  const supportCountRef = useRef(state.supportMessages.length);
  useEffect(() => {
    if (state.supportMessages.length > supportCountRef.current) {
      notifySupportContent();
    }
    supportCountRef.current = state.supportMessages.length;
  }, [state.supportMessages.length, notifySupportContent]);

  return (
    <div className="flex h-full min-h-[420px] flex-col gap-4 sm:min-h-[520px] sm:h-[80vh] sm:max-h-[640px]">

      {state.lastTicket ? (
        <div className="rounded-lg border border-muted/80 bg-muted/10 p-3 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Ticket sent</Badge>
            <span className="text-xs text-muted-foreground">
              #{state.lastTicket.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <p className="mt-1 text-muted-foreground">
            Our human team is on it. Reply here if you have more info.
          </p>
        </div>
      ) : null}

      <div className="relative flex-1 overflow-hidden rounded-xl border border-muted/70 bg-muted/10">
        <div
          ref={supportScrollContainer}
          onScroll={handleSupportScroll}
          className="h-full space-y-3 overflow-y-auto overscroll-contain px-3 py-2 pr-2"
        >
          {state.supportMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tell Linkler what’s going on. If it needs a human, we’ll hand it off.
            </p>
          ) : (
            state.supportMessages.map((entry) => (
              <TranscriptBubble key={entry.id} entry={entry} userAvatar={viewerAvatar} />
            ))
          )}
          <div ref={supportScrollEndAnchor} />
        </div>
        {supportHasNewMessages && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border-muted/60 bg-background/95 px-3 py-1 text-xs font-semibold text-foreground shadow"
            onClick={() => scrollSupportToBottom()}
          >
            New messages
          </Button>
        )}
      </div>

      {supportSafetyNotice ? (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm text-primary">
          {supportSafetyNotice}
        </div>
      ) : null}

      {supportLinklerError ? (
        <div className="rounded-lg border border-muted/70 bg-muted/10 p-3 text-sm text-muted-foreground">
          {supportLinklerError}
        </div>
      ) : null}

      <div
        className="rounded-xl border border-muted/70 bg-background/70 p-3 shadow-sm"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
      >
        <div className="space-y-2">
          <ComposerInput
            value={supportMessage}
            onChange={setSupportMessage}
            placeholder="Describe the issue or question..."
            disabled={supportAsking || cooldownDisabled}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleAskLinklerSupport();
              }
            }}
          />
          {supportError ? <p className="text-sm text-destructive">{supportError}</p> : null}
          <div className="flex w-full gap-3">
            <Button
              type="button"
              className="basis-1/2"
              onClick={() => void handleAskLinklerSupport()}
              disabled={supportAsking || cooldownDisabled}
            >
              {supportAsking ? 'Sending...' : cooldownDisabled ? COOLDOWN_COPY : 'Send'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="basis-1/2"
              onClick={() => void handleSupportEscalation()}
              disabled={supportEscalating}
            >
              {supportEscalating ? 'Escalating...' : 'Contact Support'}
            </Button>
          </div>
          {cooldownDisabled && !supportLinklerError ? (
            <p className="text-xs text-muted-foreground">{COOLDOWN_HINT}</p>
          ) : null}
        </div>
        {escalationHint ? <p className="mt-4 text-xs text-muted-foreground">{escalationHint}</p> : null}
      </div>

      <LinklerTicketsModal open={ticketsOpen} onClose={onCloseTickets} />
    </div>
  );
}

type TranscriptBubbleProps = {
  entry: CompanionEntry;
  userAvatar: string | null;
};

function TranscriptBubble({ entry, userAvatar }: TranscriptBubbleProps) {
  const isAssistant = entry.role === 'assistant';
  const avatarSrc = isAssistant ? LINKLER_AVATAR_SRC : userAvatar || USER_FALLBACK_AVATAR;

  return (
    <div className="flex gap-3">
      <div className="relative h-9 w-9 flex-shrink-0 rounded-full border border-border overflow-hidden bg-muted">
        <Image
          src={avatarSrc}
          alt={isAssistant ? 'Linkler avatar' : 'Your avatar'}
          fill
          className="object-cover scale-125"
        />
      </div>
      <div
        className={`flex-1 rounded-2xl border p-3 text-sm ${
          isAssistant ? 'bg-muted/60 border-muted/80' : 'bg-primary/10 border-primary/20'
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="font-semibold">{isAssistant ? 'Linkler' : 'You'}</p>
          <span className="text-xs text-muted-foreground">
            {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="mt-2 whitespace-pre-line text-foreground">{entry.text}</p>
        {entry.meta?.recommendHuman ? (
          <p className="mt-2 text-xs font-semibold text-primary">Linkler suggests looping in human support.</p>
        ) : null}
      </div>
    </div>
  );
}

type ComposerInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

function ComposerInput({ value, onChange, placeholder, disabled, onKeyDown }: ComposerInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(Math.max(el.scrollHeight, COMPOSER_MIN_HEIGHT), COMPOSER_MAX_HEIGHT);
    el.style.height = `${nextHeight}px`;
  }, [value]);

  return (
    <Textarea
      ref={textareaRef}
      rows={1}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      textareaSize="sm"
      className="min-h-[44px] max-h-24 resize-none text-sm text-foreground placeholder:text-muted-foreground"
    />
  );
}

function newMessageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `linkler-msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
