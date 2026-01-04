'use server';

import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/rbac';
import { pingOllama } from '@/lib/ai/ollama';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isLinklerEnabled } from '@/lib/linkler/flags';

type KillSwitchInfo = {
  disabled: boolean;
  updatedAt: string | null;
  source: 'env' | 'flag' | null;
  message: string | null;
};

type UsageInfo = {
  windowHours: number;
  supportRequests: number;
  companionMessages: number;
};

type LastErrorInfo =
  | {
      source: 'support' | 'companion';
      message: string;
      occurredAt: string;
    }
  | null;

const WINDOW_HOURS = 24;
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function sanitizeErrorMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  const MAX_LEN = 160;
  return normalized.length > MAX_LEN ? `${normalized.slice(0, MAX_LEN)}…` : normalized;
}

async function safeCount(query: any) {
  try {
    const { count, error } = await query;
    if (error) {
      console.warn('[Linkler][diagnostics] count failed', error.message);
      return 0;
    }
    return typeof count === 'number' ? count : 0;
  } catch (err) {
    console.warn('[Linkler][diagnostics] count exception', err);
    return 0;
  }
}

export async function GET(request: NextRequest) {
  const reqId = request.headers.get('x-request-id') || randomUUID();

  try {
    await requireOwner(request);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg === 'UNAUTHORIZED' ? 401 : 403;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }

  const admin = getSupabaseAdmin();
  const sinceIso = new Date(Date.now() - WINDOW_MS).toISOString();
  const checkedAt = nowIso();
  const envKillSwitchDisabled = !isLinklerEnabled();

  const healthPromise = (async () => {
    try {
      const result = await pingOllama();
      return {
        online: result.ok,
        label: result.ok ? 'online' : 'offline',
        latencyMs: result.ms,
        error: result.ok ? null : result.error ?? 'Unknown Ollama issue',
      };
    } catch (error) {
      return {
        online: false,
        label: 'offline' as const,
        latencyMs: 0,
        error: error instanceof Error ? error.message : 'Failed to reach Ollama',
      };
    }
  })();

  const killSwitchPromise = (async () => {
    const { data, error } = await admin
      .from('feature_flags')
      .select('enabled, updated_at')
      .eq('key', 'linkler_enabled')
      .maybeSingle();

    if (error) {
      console.warn('[Linkler][diagnostics] kill switch fetch failed', error.message);
    }

    return data ?? null;
  })();

  const supportCountPromise = safeCount(
    admin
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sinceIso)
  );

  const companionCountPromise = safeCount(
    admin
      .from('support_companion_messages')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sinceIso)
  );

  const supportErrorPromise = admin
    .from('support_tickets')
    .select('ai_error, updated_at')
    .not('ai_error', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const companionErrorPromise = admin
    .from('support_companion_messages')
    .select('metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  const [health, killSwitchRow, supportRequests, companionMessages, supportError, companionErrors] = await Promise.all([
    healthPromise,
    killSwitchPromise,
    supportCountPromise,
    companionCountPromise,
    supportErrorPromise,
    companionErrorPromise,
  ]);

  const lastErrors: LastErrorInfo[] = [];

  const supportErrorMessage = sanitizeErrorMessage(supportError.data?.ai_error);
  if (supportErrorMessage) {
    lastErrors.push({
      source: 'support',
      message: supportErrorMessage,
      occurredAt: supportError.data.updated_at ?? checkedAt,
    });
  }

  if (Array.isArray(companionErrors.data)) {
    const lastCompanionRow = companionErrors.data
      .map((row: any) => ({
        sanitized: sanitizeErrorMessage(row?.metadata?.error),
        created_at: row?.created_at,
      }))
      .find((entry) => !!entry.sanitized);

    if (lastCompanionRow?.sanitized) {
      lastErrors.push({
        source: 'companion',
        message: lastCompanionRow.sanitized,
        occurredAt: lastCompanionRow.created_at ?? checkedAt,
      });
    }
  }

  lastErrors.sort((a, b) => (a.occurredAt > b.occurredAt ? -1 : 1));
  const lastError = lastErrors[0] ?? null;

  const killSwitch: KillSwitchInfo = {
    disabled: envKillSwitchDisabled || (killSwitchRow ? killSwitchRow.enabled === false : false),
    source: envKillSwitchDisabled ? 'env' : killSwitchRow && killSwitchRow.enabled === false ? 'flag' : null,
    updatedAt: killSwitchRow?.updated_at ?? null,
    message: envKillSwitchDisabled
      ? 'Overridden by LINKLER_ENABLED environment variable'
      : killSwitchRow && killSwitchRow.enabled === false
        ? 'Disabled via feature_flags.linkler_enabled'
        : null,
  };

  const usage: UsageInfo = {
    windowHours: WINDOW_HOURS,
    supportRequests,
    companionMessages,
  };

  return NextResponse.json(
    {
      ok: true,
      reqId,
      checkedAt,
      status: health,
      killSwitch,
      usage,
      lastError,
    },
    { status: 200 }
  );
}
