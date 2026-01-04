import { setTimeout as delayTimeout } from 'timers/promises';

const DEFAULT_BASE_URL = (process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
const DEFAULT_ASSISTANT_MODEL = process.env.OLLAMA_ASSISTANT_MODEL ?? 'llama3.3:latest';
const DEFAULT_GUARD_MODEL = process.env.OLLAMA_GUARD_MODEL ?? 'llama-guard3:latest';
const DEFAULT_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? 20_000);

export type OllamaJSONResult<T> = {
  ok: boolean;
  model: string;
  ms: number;
  output?: T;
  raw?: string;
  error?: string;
};

type OllamaChatPayload = {
  model: string;
  system?: string;
  user: string;
  format?: 'json';
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
  signal?: AbortSignal;
  timeoutMs?: number;
  options?: Record<string, unknown>;
  traceLabel?: string;
  maxRetries?: number;
};

function logOllamaIssue(label: string | undefined, message: string) {
  if (!label) return;
  console.warn(`[Linkler][${label}] ${message}`);
}

async function postChat(payload: OllamaChatPayload): Promise<OllamaJSONResult<any>> {
  const retries = Math.max(0, Math.min(payload.maxRetries ?? 0, 2));
  let attempt = 0;
  let lastResult: OllamaJSONResult<any> | null = null;

  do {
    const hasExternalSignal = !!payload.signal;
    const controller = hasExternalSignal ? null : new AbortController();
    const timeout = payload.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const signal = hasExternalSignal ? payload.signal! : controller!.signal;
    const timeoutHandle = hasExternalSignal ? null : setTimeout(() => controller!.abort(), timeout);
    timeoutHandle?.unref?.();
    const started = Date.now();

    try {
      const response = await fetch(`${DEFAULT_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: payload.model,
          stream: false,
          format: payload.format,
          messages: [
            payload.system
              ? { role: 'system' as const, content: payload.system }
              : null,
            { role: 'user' as const, content: payload.user },
          ].filter(Boolean),
          options: {
            temperature: payload.temperature ?? 0.2,
            num_predict: payload.maxTokens ?? 512,
            stop: payload.stop,
            ...payload.options,
          },
        }),
        signal,
      });

      const elapsed = Date.now() - started;

      if (!response.ok) {
        lastResult = {
          ok: false,
          model: payload.model,
          ms: elapsed,
          error: `Ollama responded with ${response.status}`,
        };
      } else {
        const data = await response.json();
        const content = typeof data?.message?.content === 'string' ? data.message.content.trim() : '';
        return {
          ok: true,
          model: payload.model,
          ms: elapsed,
          raw: content,
        };
      }
    } catch (error: any) {
      const elapsed = Date.now() - started;
      const isAbort = error?.name === 'AbortError';
      lastResult = {
        ok: false,
        model: payload.model,
        ms: elapsed,
        error: isAbort ? 'Ollama request timed out' : String(error?.message ?? error),
      };
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }

    if (lastResult?.ok ?? false) {
      return lastResult!;
    }

    if (attempt < retries && lastResult) {
      logOllamaIssue(payload.traceLabel, `attempt ${attempt + 1} failed (${lastResult.error ?? 'unknown error'}), retrying`);
      try {
        await delayTimeout(Math.min(250 * (attempt + 1), 1000));
      } catch {
        // ignore
      }
    }

    attempt += 1;
  } while (attempt <= retries);

  if (lastResult && !lastResult.ok) {
    logOllamaIssue(payload.traceLabel, lastResult.error ?? 'unknown error');
    return lastResult;
  }

  return {
    ok: false,
    model: payload.model,
    ms: 0,
    error: 'Unknown Ollama failure',
  };
}

function safeParseJSON<T>(input?: string): { ok: true; value: T } | { ok: false; error: string } {
  if (!input) {
    return { ok: false, error: 'Empty Ollama response' };
  }

  try {
    return { ok: true, value: JSON.parse(input) as T };
  } catch (error: any) {
    return { ok: false, error: `Failed to parse JSON: ${error?.message ?? error}` };
  }
}

export async function callAssistantJSON<T = unknown>(params: {
  prompt: string;
  context?: Record<string, unknown>;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  model?: string;
  traceLabel?: string;
  maxRetries?: number;
}): Promise<OllamaJSONResult<T>> {
  const userContent = [
    params.prompt,
    params.context ? `\n\nContext:\n${JSON.stringify(params.context, null, 2)}` : '',
  ].join('');

  const chatResult = await postChat({
    model: params.model ?? DEFAULT_ASSISTANT_MODEL,
    system:
      params.systemPrompt ??
      'You are Linkler, the helpful AI assistant for MyLiveLinks. Always respond with valid JSON.',
    user: userContent,
    format: 'json',
    temperature: params.temperature ?? 0.2,
    maxTokens: params.maxTokens ?? 400,
    timeoutMs: params.timeoutMs,
    signal: params.signal,
    traceLabel: params.traceLabel ?? 'assistant',
    maxRetries: params.maxRetries,
  });

  if (!chatResult.ok) {
    return chatResult;
  }

  const parsed = safeParseJSON<T>(chatResult.raw);
  if (!parsed.ok) {
    return { ...chatResult, ok: false, error: parsed.error };
  }

  return { ...chatResult, output: parsed.value };
}

export async function callGuardJSON<T = unknown>(params: {
  text: string;
  context?: Record<string, unknown>;
  timeoutMs?: number;
  signal?: AbortSignal;
  model?: string;
  traceLabel?: string;
  maxRetries?: number;
}): Promise<OllamaJSONResult<T>> {
  const userPrompt = [
    'Analyze the following user-generated content for policy violations.',
    'Return JSON with { "labels": string[], "confidence": number (0-1), "notes": string }. Keep JSON compact.',
    `Content:\n"""${params.text.trim()}"""`,
    params.context ? `\nContext: ${JSON.stringify(params.context, null, 2)}` : '',
  ].join('\n\n');

  const chatResult = await postChat({
    model: params.model ?? DEFAULT_GUARD_MODEL,
    system: 'You are a policy classifier. Respond ONLY with JSON describing your labels.',
    user: userPrompt,
    format: 'json',
    maxTokens: 200,
    timeoutMs: params.timeoutMs,
    signal: params.signal,
    traceLabel: params.traceLabel ?? 'guard',
    maxRetries: params.maxRetries ?? 1,
  });

  if (!chatResult.ok) {
    return chatResult;
  }

  const parsed = safeParseJSON<T>(chatResult.raw);
  if (!parsed.ok) {
    return { ...chatResult, ok: false, error: parsed.error };
  }

  return { ...chatResult, output: parsed.value };
}

export async function pingOllama(model = DEFAULT_ASSISTANT_MODEL) {
  const prompt = 'Respond with {"pong":true}';
  return callAssistantJSON<{ pong: boolean }>({
    prompt,
    systemPrompt: 'You are a health check agent. Reply ONLY with {"pong":true}.',
    maxTokens: 20,
    timeoutMs: 10_000,
    model,
    traceLabel: 'healthcheck',
  });
}

/**
 * Gracefully waits before retrying Ollama calls when required.
 * Useful if callers want exponential backoff without duplicating logic elsewhere.
 */
export async function delay(ms: number) {
  await delayTimeout(ms);
}
