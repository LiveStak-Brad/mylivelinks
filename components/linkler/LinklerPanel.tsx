'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect, type KeyboardEvent } from 'react';
import { Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { type LinklerPanelState, type CompanionEntry } from './useLinklerPanel';
import { postCompanionMessage, submitSupportTicket } from '@/lib/api/linkler';
import {
  buildLinklerEscalationContext,
  detectLinklerEmergency,
  type LinklerEscalationReason,
} from '@/shared/linkler/escalation';
import { useSmartScroll } from './useSmartScroll';

export interface LinklerPanelProps {
  state: LinklerPanelState;
  onEscalateToSupport?: () => void;
}

const COMPOSER_MAX_HEIGHT = 96;
const COMPOSER_MIN_HEIGHT = 44;

export function LinklerPanel({ state, onEscalateToSupport }: LinklerPanelProps) {
  const { toast } = useToast();
  const [supportMessage, setSupportMessage] = useState('');
  const [supportContext, setSupportContext] = useState('');
  const [supportEscalating, setSupportEscalating] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [companionMessage, setCompanionMessage] = useState('');
  const [companionSending, setCompanionSending] = useState(false);
  const [supportAsking, setSupportAsking] = useState(false);
  const [supportSafetyNotice, setSupportSafetyNotice] = useState<string | null>(null);
  const [supportLinklerError, setSupportLinklerError] = useState<string | null>(null);
  const [supportEscalationReason, setSupportEscalationReason] = useState<LinklerEscalationReason | null>(null);
  const [supportFailureReason, setSupportFailureReason] = useState<LinklerEscalationReason | null>(null);
  const [companionNotice, setCompanionNotice] = useState<string | null>(null);

  const COOLDOWN_COPY = 'Hang on a sec...';
  const COOLDOWN_HINT = 'Hang on a sec... Try again in a few seconds.';
  const UNAVAILABLE_COPY = 'Linkler is temporarily unavailable.';

  const {
    containerRef: supportScrollContainer,
    endAnchorRef: supportScrollEndAnchor,
    onScroll: handleSupportScroll,
    scrollToBottom: scrollSupportToBottom,
    notifyContentChange: notifySupportContent,
    showNewMessages: supportHasNewMessages,
  } = useSmartScroll();

  const {
    containerRef: companionScrollContainer,
    endAnchorRef: companionScrollEndAnchor,
    onScroll: handleCompanionScroll,
    scrollToBottom: scrollCompanionToBottom,
    notifyContentChange: notifyCompanionContent,
    showNewMessages: companionHasNewMessages,
  } = useSmartScroll();

  const lastSupportAssistantMessage = useMemo(() => {
    for (let i = state.supportMessages.length - 1; i >= 0; i -= 1) {
      const entry = state.supportMessages[i];
      if (entry.role === 'assistant') return entry;
    }
    return null;
  }, [state.supportMessages]);

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

    let parsedContext: Record<string, unknown> | undefined;
    if (supportContext.trim()) {
      try {
        parsedContext = JSON.parse(supportContext);
      } catch (err: any) {
        setSupportError(`Context must be valid JSON (${err?.message ?? 'parse error'})`);
        return;
      }
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
      state.setSupportForceEscalate(true);
      setSupportEscalationReason('emergency');
      return;
    }

    setSupportAsking(true);
    try {
      const result = await postCompanionMessage({
        message: trimmed,
        sessionId: state.supportSessionId,
        context: parsedContext,
      });

      if (!result.ok || !result.data?.ok) {
        const retrySeconds = result.data?.retryAfterSeconds ?? 0;
        if (retrySeconds > 0) {
          state.setCooldownFromSeconds(retrySeconds);
          setSupportLinklerError(COOLDOWN_HINT);
          setSupportFailureReason(null);
          return;
        }

        const failureReason: LinklerEscalationReason =
          result.status === 503 ? 'linkler_disabled' : 'ai_unavailable';
        const fallbackText = result.data?.reply?.trim() || UNAVAILABLE_COPY;

        state.appendSupportMessage({
          id: newMessageId(),
          role: 'assistant',
          text: fallbackText,
          createdAt: Date.now(),
          meta: { degraded: true },
        });

        setSupportLinklerError(UNAVAILABLE_COPY);
        setSupportFailureReason(failureReason);
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

      setSupportLinklerError(null);
      setSupportFailureReason(null);

      if (result.data.recommendHuman) {
        state.setSupportForceEscalate(true);
        setSupportEscalationReason('ai_recommended');
      }
    } finally {
      setSupportAsking(false);
    }
  }, [state, supportContext, supportMessage]);

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

    let parsedContext: Record<string, unknown> | undefined;
    if (supportContext.trim()) {
      try {
        parsedContext = JSON.parse(supportContext);
      } catch (err: any) {
        setSupportError(`Context must be valid JSON (${err?.message ?? 'parse error'})`);
        return;
      }
    }

    const reason =
      supportEscalationReason ?? (state.supportForceEscalate ? supportFailureReason ?? 'user_requested' : undefined);

    const contextPayload = buildLinklerEscalationContext({
      sessionId: state.supportSessionId,
      transcript: state.supportMessages,
      lastLinklerReply: lastSupportAssistantMessage?.text,
      reason,
      metadata: {
        ...(parsedContext ? { userContext: parsedContext } : {}),
        channel: 'support-tab',
      },
    });

    setSupportEscalating(true);
    const result = await submitSupportTicket({
      message: messageBody,
      context: contextPayload,
    });
    setSupportEscalating(false);

    if (!result.ok || !result.data?.ok || !result.data?.ticket) {
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
    setSupportContext('');
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
    supportContext,
    supportEscalationReason,
    supportFailureReason,
    supportMessage,
    toast,
  ]);

  const cooldownDisabled = state.cooldownRemaining > 0;
  const derivedEscalationReason =
    supportEscalationReason ?? (state.supportForceEscalate ? supportFailureReason ?? 'user_requested' : null);
  const canEscalate = Boolean(derivedEscalationReason);
  const escalationHint = useMemo(() => {
    switch (derivedEscalationReason) {
      case 'emergency':
        return 'This sounds urgent. We will route this straight to human support.';
      case 'ai_unavailable':
      case 'timeout':
        return 'Linkler could not respond, so we can escalate it manually.';
      case 'ai_recommended':
        return 'Linkler flagged this for a human review.';
      case 'linkler_disabled':
        return 'Linkler is offline, but our human team can still help.';
      case 'user_requested':
        return 'Ready to loop in a human? Send the latest details below.';
      default:
        return 'Send the conversation and context to the human team.';
    }
  }, [derivedEscalationReason]);

  const handleRequestEscalation = useCallback(() => {
    state.setSupportForceEscalate(true);
    setSupportEscalationReason((prev) => prev ?? supportFailureReason ?? 'user_requested');
  }, [state, supportFailureReason]);

  const handleSendCompanion = useCallback(async () => {
    const trimmed = companionMessage.trim();
    if (!trimmed || companionSending || cooldownDisabled) return;

    setCompanionMessage('');
    setCompanionSending(true);
    setCompanionNotice(null);

    const userEntry: CompanionEntry = {
      id: newMessageId(),
      role: 'user',
      text: trimmed,
      createdAt: Date.now(),
    };

    state.appendMessage(userEntry);

    try {
      const result = await postCompanionMessage({
        message: trimmed,
        sessionId: state.sessionId,
      });

      if (!result.ok || !result.data?.ok) {
        const retrySeconds = result.data?.retryAfterSeconds ?? 0;
        if (retrySeconds > 0) {
          state.setCooldownFromSeconds(retrySeconds);
          setCompanionNotice(COOLDOWN_HINT);
          return;
        }

        const fallbackText = result.data?.reply?.trim() || UNAVAILABLE_COPY;

        state.appendMessage({
          id: newMessageId(),
          role: 'assistant',
          text: fallbackText,
          createdAt: Date.now(),
          meta: { degraded: true },
        });
        setCompanionNotice(UNAVAILABLE_COPY);
        return;
      }

      state.setSessionId(result.data.sessionId);
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

      state.appendMessage(assistantEntry);
      setCompanionNotice(null);
    } catch (error: any) {
      state.appendMessage({
        id: newMessageId(),
        role: 'assistant',
        text: UNAVAILABLE_COPY,
        createdAt: Date.now(),
        meta: { degraded: true },
      });
      setCompanionNotice(UNAVAILABLE_COPY);
    } finally {
      setCompanionSending(false);
    }
  }, [companionMessage, companionSending, cooldownDisabled, state]);

  const handleEscalateFromChat = useCallback(() => {
    const snippet = buildTranscriptSummary(state.messages);
    if (snippet) {
      setSupportMessage(snippet);
      state.setActiveTab('support');
      onEscalateToSupport?.();
    } else {
      state.setActiveTab('support');
    }
  }, [state, onEscalateToSupport]);

  useEffect(() => {
    notifySupportContent();
  }, [state.supportMessages, notifySupportContent]);

  useEffect(() => {
    notifyCompanionContent();
  }, [state.messages, notifyCompanionContent]);

  return (
    <div className="flex h-full min-h-[420px] flex-col gap-3 sm:min-h-[520px] sm:h-[80vh] sm:max-h-[640px]">
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">Linkler</p>
        <p className="text-sm text-muted-foreground">AI replies first. Humans are always on standby.</p>
      </div>
      <Tabs
        value={state.activeTab}
        onValueChange={(value) => state.setActiveTab(value as typeof state.activeTab)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <TabsList className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-muted/60 bg-muted/20 p-1">
          <TabsTrigger value="support" className="w-full">
            Report / Get Support
          </TabsTrigger>
          <TabsTrigger value="companion" className="w-full">
            Chat with Linkler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="support" className="mt-3 flex flex-1 flex-col gap-3 overflow-hidden">
          <div className="space-y-3">
            {state.lastTicket && (
              <div className="rounded-lg border border-muted p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Ticket sent</Badge>
                  <span className="text-muted-foreground text-xs">
                    #{state.lastTicket.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  Our human team is reviewing your latest request. Reply in Linkler if you have more info.
                </p>
              </div>
            )}

            <div className="rounded-lg border border-muted/70 p-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Ask Linkler first</p>
              <p className="mt-1">
                Linkler can answer most questions instantly. We will surface the human support option if it is
                sensitive, urgent, or you request it.
              </p>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden rounded-xl border border-muted/70 bg-muted/10">
            <div
              ref={supportScrollContainer}
              onScroll={handleSupportScroll}
              className="h-full space-y-3 overflow-y-auto overscroll-contain px-3 py-2 pr-2"
            >
              {state.supportMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Share what is going on, and Linkler will respond inside this tab.
                </p>
              ) : (
                state.supportMessages.map((entry) => <CompanionBubble key={entry.id} entry={entry} />)
              )}
              <div ref={supportScrollEndAnchor} />
            </div>
            {supportHasNewMessages && (
              <button
                type="button"
                className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-muted/60 bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow"
                onClick={() => scrollSupportToBottom()}
              >
                New messages
              </button>
            )}
          </div>

          {supportSafetyNotice && (
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm text-primary">
              {supportSafetyNotice}
            </div>
          )}

          {supportLinklerError && (
            <div className="rounded-lg border border-muted/60 bg-muted/20 p-3 text-sm text-muted-foreground">
              {supportLinklerError}
            </div>
          )}

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
              {supportError && <p className="text-sm text-destructive">{supportError}</p>}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={() => void handleAskLinklerSupport()}
                  disabled={supportAsking || cooldownDisabled}
                >
                  {supportAsking ? 'Asking Linkler...' : cooldownDisabled ? COOLDOWN_COPY : 'Ask Linkler'}
                </Button>
                {!canEscalate && (
                  <button
                    type="button"
                    onClick={handleRequestEscalation}
                    className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Need a human review?
                  </button>
                )}
              </div>
              {cooldownDisabled && !supportLinklerError && (
                <p className="text-xs text-muted-foreground">{COOLDOWN_HINT}</p>
              )}
            </div>

            <div className="mt-3 space-y-2">
              <button
                type="button"
                className="text-xs font-semibold text-primary"
                onClick={() => setContextOpen((prev) => !prev)}
              >
                {contextOpen ? 'Hide' : 'Add'} optional context (JSON)
              </button>
              {contextOpen && (
                <Textarea
                  value={supportContext}
                  onChange={(event) => setSupportContext(event.target.value)}
                  rows={3}
                  textareaSize="sm"
                  placeholder='e.g. {"screen":"profile","browser":"edge"}'
                />
              )}
            </div>
          </div>

          {canEscalate && (
            <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
              <p className="text-sm text-primary">{escalationHint}</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleSupportEscalation()}
                disabled={supportEscalating}
              >
                {supportEscalating ? 'Sending...' : 'Send to human support'}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="companion" className="mt-3 flex flex-1 flex-col gap-3 overflow-hidden">
          <div className="relative flex-1 overflow-hidden rounded-xl border border-muted/70 bg-muted/10">
            <div
              ref={companionScrollContainer}
              onScroll={handleCompanionScroll}
              className="h-full space-y-3 overflow-y-auto overscroll-contain px-3 py-2 pr-2"
            >
              {state.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ask Linkler for exposure tips, app guidance, or quick check-ins. Conversations are logged for safety.
                </p>
              ) : (
                state.messages.map((entry) => <CompanionBubble key={entry.id} entry={entry} />)
              )}
              <div ref={companionScrollEndAnchor} />
            </div>
            {companionHasNewMessages && (
              <button
                type="button"
                className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-muted/60 bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow"
                onClick={() => scrollCompanionToBottom()}
              >
                New messages
              </button>
            )}
          </div>

          {companionNotice && (
            <div className="rounded-lg border border-muted/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              {companionNotice}
            </div>
          )}

          <div
            className="rounded-xl border border-muted/70 bg-background/70 p-3 shadow-sm space-y-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
          >
            <ComposerInput
              value={companionMessage}
              onChange={setCompanionMessage}
              placeholder="Share what's going on..."
              disabled={companionSending || cooldownDisabled}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void handleSendCompanion();
                }
              }}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => void handleSendCompanion()}
                disabled={!companionMessage.trim() || companionSending || cooldownDisabled}
              >
                {companionSending ? 'Sending...' : 'Chat with Linkler'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleEscalateFromChat}
              >
                Send to human support
              </Button>
            </div>
            {cooldownDisabled && !companionNotice && (
              <p className="text-xs text-muted-foreground">{COOLDOWN_HINT}</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
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
    <textarea
      ref={textareaRef}
      rows={1}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className="min-h-[44px] max-h-24 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

function CompanionBubble({ entry }: { entry: CompanionEntry }) {
  const isAssistant = entry.role === 'assistant';
  const recommendHuman = entry.meta?.recommendHuman ?? entry.meta?.suggestSendToHuman;
  return (
    <div
      className={`rounded-2xl border p-3 text-sm ${
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

      {entry.meta?.exposureTips?.length ? (
        <div className="mt-3 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground/80">Exposure tips</p>
          <ul className="list-disc ml-4 space-y-0.5">
            {entry.meta.exposureTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {entry.meta?.featureIdeas?.length ? (
        <div className="mt-3 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground/80">Feature ideas</p>
          <div className="flex flex-wrap gap-2">
            {entry.meta.featureIdeas.map((idea) => (
              <Badge key={idea} variant="outline">
                {idea}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {recommendHuman && (
        <p className="mt-3 text-xs font-semibold text-primary">Linkler recommends escalating to human support.</p>
      )}
    </div>
  );
}

function buildTranscriptSummary(entries: CompanionEntry[]): string {
  if (!entries.length) return '';
  const recent = entries.slice(-4);
  const mapped = recent.map((entry) => `${entry.role === 'assistant' ? 'Linkler' : 'User'}: ${entry.text}`);
  return `Context from Linkler chat:\n${mapped.join('\n')}`;
}

function newMessageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `linkler-msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
