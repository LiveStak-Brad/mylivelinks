'use client';

import { FormEvent, useCallback, useMemo, useState } from 'react';
import { Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { type LinklerPanelState, type CompanionEntry } from './useLinklerPanel';
import { postCompanionMessage, submitSupportTicket } from '@/lib/api/linkler';

export interface LinklerPanelProps {
  state: LinklerPanelState;
  onEscalateToSupport?: () => void;
}

export function LinklerPanel({ state, onEscalateToSupport }: LinklerPanelProps) {
  const { toast } = useToast();
  const [supportMessage, setSupportMessage] = useState('');
  const [supportContext, setSupportContext] = useState('');
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [companionMessage, setCompanionMessage] = useState('');
  const [companionSending, setCompanionSending] = useState(false);

  const handleSupportSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSupportError(null);

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

      setSupportSubmitting(true);
      const result = await submitSupportTicket({
        message: trimmed,
        context: parsedContext,
      });
      setSupportSubmitting(false);

      if (!result.ok || !result.data?.ok || !result.data?.ticket) {
        toast({
          title: 'Support request failed',
          description: result.data?.error || result.error || 'Please try again.',
          variant: 'destructive',
        });
        return;
      }

      state.setLastTicket({
        id: result.data.ticket.id,
        created_at: result.data.ticket.created_at,
      });

      setSupportMessage('');
      setSupportContext('');
      toast({
        title: 'Ticket sent',
        description: 'A human will follow up via Linkler or Noties.',
      });
    },
    [supportContext, supportMessage, state, toast]
  );

  const cooldownDisabled = state.cooldownRemaining > 0;

  const handleSendCompanion = useCallback(async () => {
    const trimmed = companionMessage.trim();
    if (!trimmed || companionSending || cooldownDisabled) return;

    setCompanionMessage('');
    setCompanionSending(true);

    const userEntry: CompanionEntry = {
      id: newMessageId(),
      role: 'user',
      text: trimmed,
      createdAt: Date.now(),
    };

    state.appendMessage(userEntry);

    const result = await postCompanionMessage({
      message: trimmed,
      sessionId: state.sessionId,
    });

    setCompanionSending(false);

    if (!result.ok || !result.data?.ok) {
      const retrySeconds = result.data?.retryAfterSeconds ?? 0;
      if (retrySeconds > 0) {
        state.setCooldownFromSeconds(retrySeconds);
      }

      toast({
        title: 'Linkler is busy',
        description: result.data?.error || result.error || 'Please try again in a moment.',
        variant: 'destructive',
      });
      return;
    }

    state.setSessionId(result.data.sessionId);
    state.setCooldownFromSeconds(result.data.cooldownSeconds);
    state.setUsage(result.data.usage);

    const assistantEntry: CompanionEntry = {
      id: newMessageId(),
      role: 'assistant',
      text: result.data.reply,
      createdAt: Date.now(),
      meta: {
        exposureTips: result.data.exposureTips,
        featureIdeas: result.data.featureIdeas,
        suggestSendToHuman: result.data.suggestSendToHuman,
      },
    };

    state.appendMessage(assistantEntry);
  }, [companionMessage, companionSending, cooldownDisabled, state, toast]);

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

  return (
    <div className="space-y-4">
      <Tabs value={state.activeTab} onValueChange={(value) => state.setActiveTab(value as typeof state.activeTab)}>
        <TabsList className="w-full">
          <TabsTrigger value="support" className="flex-1">
            Report / Get Support
          </TabsTrigger>
          <TabsTrigger value="companion" className="flex-1">
            Chat with Linkler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="support" className="mt-4 space-y-4">
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

          <form onSubmit={handleSupportSubmit} className="space-y-4">
            <Textarea
              value={supportMessage}
              onChange={(event) => setSupportMessage(event.target.value)}
              rows={5}
              placeholder="Describe the issue or question…"
              required
            />

            <div className="space-y-2">
              <button
                type="button"
                className="text-xs text-primary font-semibold"
                onClick={() => setContextOpen((prev) => !prev)}
              >
                {contextOpen ? 'Hide' : 'Add'} optional context (JSON)
              </button>
              {contextOpen && (
                <Textarea
                  value={supportContext}
                  onChange={(event) => setSupportContext(event.target.value)}
                  rows={4}
                  placeholder='e.g. {"screen":"profile","browser":"edge"}'
                />
              )}
            </div>

            {supportError && <p className="text-sm text-destructive">{supportError}</p>}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={supportSubmitting}>
                {supportSubmitting ? 'Sending…' : 'Send to human support'}
              </Button>
              <p className="text-xs text-muted-foreground">Linkler always routes sensitive issues to humans.</p>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="companion" className="mt-4 space-y-4">
          <div className="rounded-lg border border-muted/60 p-3 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Daily usage</p>
              <p className="text-xs text-muted-foreground">
                {state.usage
                  ? `${state.usage.usedToday}/${state.usage.dailyLimit} messages`
                  : 'Limited to keep Linkler fair for everyone.'}
              </p>
            </div>
            {cooldownDisabled && (
              <Badge variant="secondary">Recharging {state.cooldownRemaining}s</Badge>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto pr-1 space-y-3">
            {state.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ask Linkler for exposure tips, app guidance, or quick check-ins. Conversations are logged for safety.
              </p>
            ) : (
              state.messages.map((entry) => <CompanionBubble key={entry.id} entry={entry} />)
            )}
          </div>

          <div className="space-y-3">
            <Textarea
              value={companionMessage}
              onChange={(event) => setCompanionMessage(event.target.value)}
              rows={3}
              placeholder="Share what’s going on…"
              disabled={companionSending || cooldownDisabled}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => void handleSendCompanion()}
                disabled={!companionMessage.trim() || companionSending || cooldownDisabled}
              >
                {companionSending ? 'Sending…' : 'Chat with Linkler'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleEscalateFromChat}
              >
                Send to human support
              </Button>
            </div>
            {cooldownDisabled && (
              <p className="text-xs text-muted-foreground">
                Linkler is recharging for {state.cooldownRemaining}s to prevent spam.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CompanionBubble({ entry }: { entry: CompanionEntry }) {
  const isAssistant = entry.role === 'assistant';
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

      {entry.meta?.suggestSendToHuman && (
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
