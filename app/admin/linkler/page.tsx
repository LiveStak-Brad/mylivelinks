'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCcw, Save } from 'lucide-react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Input, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';

type PromptRecord = {
  key: string;
  content: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

type ModelSettings = {
  key: string;
  assistantModel: string;
  guardModel: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

type ApiResponse = {
  ok: boolean;
  prompt?: PromptRecord;
  settings?: ModelSettings;
  error?: string;
};

type AccessState = 'checking' | 'unauthenticated' | 'forbidden' | 'ready';

export default function LinklerPromptAdminPage() {
  const { toast } = useToast();
  const [accessState, setAccessState] = useState<AccessState>('checking');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingModels, setSavingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [serverPrompt, setServerPrompt] = useState<PromptRecord | null>(null);
  const [serverSettings, setServerSettings] = useState<ModelSettings | null>(null);
  const [assistantModel, setAssistantModel] = useState('');
  const [guardModel, setGuardModel] = useState('');

  const loadPrompt = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError(null);
      setModelError(null);
      try {
        const url = refresh ? '/api/admin/system-prompts/linkler?refresh=true' : '/api/admin/system-prompts/linkler';
        const res = await fetch(url, { credentials: 'include' });
        if (res.status === 401) {
          setAccessState('unauthenticated');
          setServerPrompt(null);
          setPrompt('');
          return;
        }
        if (res.status === 403) {
          setAccessState('forbidden');
          setServerPrompt(null);
          setPrompt('');
          return;
        }
        const body: ApiResponse = await res.json();
        if (!res.ok || !body.ok || !body.prompt) {
          throw new Error(body.error || 'Failed to load prompt');
        }
        setAccessState('ready');
        setServerPrompt(body.prompt);
        setPrompt(body.prompt.content);
        if (body.settings) {
          setServerSettings(body.settings);
          setAssistantModel(body.settings.assistantModel);
          setGuardModel(body.settings.guardModel);
        }
      } catch (err: any) {
        console.error('[Admin Linkler Prompt] Failed to load prompt', err);
        setError(err?.message || 'Failed to load prompt');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadPrompt();
  }, [loadPrompt]);

  const handleSave = useCallback(
    async (content: string) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/system-prompts/linkler', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        if (res.status === 401) {
          setAccessState('unauthenticated');
          throw new Error('Please sign in again');
        }
        if (res.status === 403) {
          setAccessState('forbidden');
          throw new Error('You do not have permission to edit this prompt.');
        }
        const body: ApiResponse = await res.json();
        if (!res.ok || !body.ok || !body.prompt) {
          throw new Error(body.error || 'Failed to save prompt');
        }
        setServerPrompt(body.prompt);
        setPrompt(body.prompt.content);
        toast({
          title: 'Prompt updated',
          description: 'New instructions will be used immediately.',
        });
      } catch (err: any) {
        console.error('[Admin Linkler Prompt] Failed to save prompt', err);
        setError(err?.message || 'Failed to save prompt');
      } finally {
        setSaving(false);
      }
    },
    [toast]
  );

  const handleSaveModels = useCallback(async () => {
    if (!serverSettings) return;
    setSavingModels(true);
    setModelError(null);
    try {
      const res = await fetch('/api/admin/system-prompts/linkler/models', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantModel, guardModel }),
      });

      if (res.status === 401) {
        setAccessState('unauthenticated');
        throw new Error('Please sign in again');
      }
      if (res.status === 403) {
        setAccessState('forbidden');
        throw new Error('You do not have permission to edit these settings.');
      }

      const body: ApiResponse = await res.json();
      if (!res.ok || !body.ok || !body.settings) {
        throw new Error(body.error || 'Failed to save settings');
      }

      setServerSettings(body.settings);
      setAssistantModel(body.settings.assistantModel);
      setGuardModel(body.settings.guardModel);
      toast({
        title: 'Models updated',
        description: 'New models will be used for the next Linkler responses.',
      });
    } catch (err: any) {
      console.error('[Admin Linkler Prompt] Failed to save models', err);
      setModelError(err?.message || 'Failed to save models');
    } finally {
      setSavingModels(false);
    }
  }, [assistantModel, guardModel, serverSettings, toast]);

  const isDirty = useMemo(() => serverPrompt?.content !== prompt, [serverPrompt, prompt]);
  const modelsDirty = useMemo(() => {
    if (!serverSettings) return false;
    return (
      serverSettings.assistantModel !== assistantModel || serverSettings.guardModel !== guardModel
    );
  }, [serverSettings, assistantModel, guardModel]);
  const charCount = prompt.length;

  const renderAccessState = () => {
    if (accessState === 'checking' || loading) {
      return (
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading prompt…</p>
        </div>
      );
    }

    if (accessState === 'unauthenticated') {
      return (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-lg font-semibold text-foreground">Sign in required</p>
          <p className="text-muted-foreground max-w-md">
            You must be signed in with an admin account to edit the Linkler system prompt.
          </p>
          <Button asChild>
            <Link href="/login">Go to login</Link>
          </Button>
        </div>
      );
    }

    if (accessState === 'forbidden') {
      return (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-lg font-semibold text-foreground">Access denied</p>
          <p className="text-muted-foreground max-w-md">
            This tool is restricted to platform admins. Ask an owner to grant admin permissions if you believe this is an
            error.
          </p>
          <Button asChild variant="secondary">
            <Link href="/admin">Back to Admin Home</Link>
          </Button>
        </div>
      );
    }

    if (!serverPrompt) {
      return (
        <div className="flex flex-col items-center gap-4 py-16">
          <p className="text-muted-foreground">Prompt data is unavailable right now.</p>
          <Button onClick={() => void loadPrompt(true)} variant="secondary">
            Retry
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="gap-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">Linkler System Prompt</CardTitle>
              <Badge variant="secondary">{serverPrompt.key}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Edits take effect immediately for all new Linkler replies. Save carefully—there is no draft mode.
            </p>
            <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
              <span>
                Last updated:{' '}
                {serverPrompt.updatedAt ? new Date(serverPrompt.updatedAt).toLocaleString() : 'Not recorded'}
              </span>
              <span>Updated by: {serverPrompt.updatedBy ?? 'Unknown'}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={24}
              textareaSize="lg"
              className="font-mono text-sm leading-relaxed"
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{charCount.toLocaleString()} characters</span>
              <span>Changes apply immediately to new Linkler messages.</span>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => void handleSave(prompt)}
                disabled={!isDirty || saving}
                className="flex items-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Prompt
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!isDirty || saving}
                onClick={() => setPrompt(serverPrompt.content)}
                className="flex items-center gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => void loadPrompt(true)}
                className="flex items-center gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Reload from database
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">Model Settings</CardTitle>
              <Badge variant="secondary">Guardrails</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              These models are fetched on every server request. Use owner-only models with injection firewalls baked in.
            </p>
            <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
              <span>
                Last updated:{' '}
                {serverSettings?.updatedAt ? new Date(serverSettings.updatedAt).toLocaleString() : 'Not recorded'}
              </span>
              <span>Updated by: {serverSettings?.updatedBy ?? 'Unknown'}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="assistant-model">
                  Assistant model
                </label>
                <Input
                  id="assistant-model"
                  value={assistantModel}
                  onChange={(event) => setAssistantModel(event.target.value)}
                  placeholder="llama3.3:latest"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="guard-model">
                  Guard model
                </label>
                <Input
                  id="guard-model"
                  value={guardModel}
                  onChange={(event) => setGuardModel(event.target.value)}
                  placeholder="llama-guard3:latest"
                />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Models update instantly; the service role enforces owner-only writes regardless of client state.
            </div>

            {modelError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {modelError}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => void handleSaveModels()}
                disabled={!modelsDirty || savingModels}
                className="flex items-center gap-2"
              >
                {savingModels ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Models
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!modelsDirty || savingModels}
                onClick={() => {
                  if (serverSettings) {
                    setAssistantModel(serverSettings.assistantModel);
                    setGuardModel(serverSettings.guardModel);
                  }
                }}
                className="flex items-center gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <main className="min-h-[calc(100vh-7rem)] bg-background pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                <Link href="/admin" className="text-primary hover:underline">
                  ← Back to Admin
                </Link>
              </p>
              <h1 className="text-3xl font-bold text-foreground">Linkler Prompt Editor</h1>
              <p className="text-muted-foreground">
                Update the runtime system prompt without redeploys or server restarts.
              </p>
            </div>
          </div>
        </div>
        {renderAccessState()}
      </div>
    </main>
  );
}
