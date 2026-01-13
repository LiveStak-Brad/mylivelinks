import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireOwner } from '@/lib/rbac';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  OwnerHealthResponseSchema,
  type OwnerHealthResponse,
  type OwnerPanelDataSource,
  type SystemHealth,
} from '@/lib/ownerPanel/index';

const ENDPOINT = '/api/owner/health';
const TIMEOUT_MS = 9000;

function nowIso() {
  return new Date().toISOString();
}

function logJson(level: 'info' | 'warn' | 'error', params: Record<string, unknown>) {
  try {
    console.log(JSON.stringify({ level, ...params }));
  } catch {
    console.log(String(params));
  }
}

function isNotWiredError(err: any) {
  const code = typeof err?.code === 'string' ? err.code : '';
  const message = typeof err?.message === 'string' ? err.message : '';
  return (
    code === '42P01' ||
    code === '42883' ||
    code === '42703' ||
    /relation .* does not exist/i.test(message) ||
    /function .* does not exist/i.test(message) ||
    /column .* does not exist/i.test(message)
  );
}

function authErrorToResponse(err: unknown, reqId: string) {
  const msg = err instanceof Error ? err.message : '';
  const status = msg === 'UNAUTHORIZED' ? 401 : 403;

  const payload: OwnerHealthResponse = {
    ok: false,
    error: {
      code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
      message: status === 401 ? 'Unauthorized' : 'Forbidden',
      http_status: status,
      details: null,
    },
  };

  return NextResponse.json(payload, { status });
}

function emptySystemHealth(checkedAt: string): SystemHealth {
  return {
    status: 'degraded',
    checked_at: checkedAt,
    services: {
      database: { status: 'degraded', checked_at: checkedAt, latency_ms: null, error: 'not_wired' },
      storage: { status: 'degraded', checked_at: checkedAt, latency_ms: null, error: 'not_wired' },
      livekit: { status: 'degraded', checked_at: checkedAt, latency_ms: null, error: 'not_wired', token_success_rate: null, avg_join_time_ms: null, live_count: null },
      stripe: { status: 'degraded', checked_at: checkedAt, latency_ms: null, error: 'not_wired' },
    },
  };
}

async function buildSystemHealth(reqId: string): Promise<{ value: SystemHealth; dataSource: OwnerPanelDataSource }> {
  const checkedAt = nowIso();
  const admin = getSupabaseAdmin();

  const startedDb = Date.now();
  const db = await admin.from('profiles').select('id', { head: true, count: 'exact' });
  const dbLatency = Date.now() - startedDb;

  const dbOk = !db.error;
  let dataSource: OwnerPanelDataSource = dbOk ? 'supabase' : 'empty_not_wired';

  let storageOk = false;
  let storageLatency: number | null = null;
  let storageError: string | null = 'not_wired';

  try {
    const startedStorage = Date.now();
    const buckets = await admin.storage.listBuckets();
    storageLatency = Date.now() - startedStorage;

    if (!buckets.error) {
      storageOk = true;
      storageError = null;
      dataSource = 'supabase';
    } else if (!isNotWiredError(buckets.error)) {
      storageError = buckets.error.message;
    }
  } catch (e) {
    storageError = e instanceof Error ? e.message : String(e);
  }

  const services: SystemHealth['services'] = {
    database: {
      status: dbOk ? 'ok' : 'down',
      checked_at: checkedAt,
      latency_ms: dbOk ? dbLatency : null,
      error: dbOk ? null : db.error?.message ?? 'not_wired',
    },
    storage: {
      status: storageOk ? 'ok' : 'degraded',
      checked_at: checkedAt,
      latency_ms: storageOk ? storageLatency : null,
      error: storageOk ? null : storageError,
    },
    livekit: { status: 'degraded', checked_at: checkedAt, latency_ms: null, error: 'not_wired', token_success_rate: null, avg_join_time_ms: null, live_count: null },
    stripe: { status: 'degraded', checked_at: checkedAt, latency_ms: null, error: 'not_wired' },
  };

  const overall: SystemHealth['status'] =
    services.database.status === 'down' ? 'down' :
    services.storage.status === 'degraded' || services.livekit.status === 'degraded' || services.stripe.status === 'degraded'
      ? 'degraded'
      : 'ok';

  if (!dbOk && isNotWiredError(db.error)) {
    logJson('warn', { reqId, endpoint: ENDPOINT, event: 'db_not_wired', code: db.error?.code, message: db.error?.message });
  }

  return {
    value: {
      status: overall,
      checked_at: checkedAt,
      services,
    },
    dataSource,
  };
}

export async function GET(request: NextRequest) {
  const reqId = request.headers.get('x-request-id') || randomUUID();
  const startedAt = Date.now();

  try {
    await requireOwner(request);
  } catch (err) {
    logJson('warn', { reqId, endpoint: ENDPOINT, event: 'auth_failed', error: err instanceof Error ? err.message : String(err) });
    return authErrorToResponse(err, reqId);
  }

  const work = (async () => {
    const generatedAt = nowIso();

    const res = await buildSystemHealth(reqId).catch((err) => {
      if (isNotWiredError(err)) return { value: emptySystemHealth(generatedAt), dataSource: 'empty_not_wired' as const };
      logJson('error', { reqId, endpoint: ENDPOINT, event: 'health_failed', error: err instanceof Error ? err.message : String(err) });
      return { value: emptySystemHealth(generatedAt), dataSource: 'empty_not_wired' as const };
    });

    const payload: OwnerHealthResponse = {
      ok: true,
      dataSource: res.dataSource,
      data: {
        generated_at: generatedAt,
        system_health: res.value,
      },
    };

    const parsed = OwnerHealthResponseSchema.safeParse(payload);
    if (!parsed.success) {
      logJson('error', { reqId, endpoint: ENDPOINT, event: 'response_schema_invalid', issues: parsed.error.issues });
      const emptyPayload: OwnerHealthResponse = {
        ok: true,
        dataSource: 'empty_not_wired',
        data: {
          generated_at: generatedAt,
          system_health: emptySystemHealth(generatedAt),
        },
      };
      return NextResponse.json(emptyPayload, { status: 200 });
    }

    return NextResponse.json(payload, { status: 200 });
  })();

  try {
    const timeout = new Promise<NextResponse>((resolve) => {
      setTimeout(() => {
        const generatedAt = nowIso();
        const payload: OwnerHealthResponse = {
          ok: true,
          dataSource: 'empty_not_wired',
          data: {
            generated_at: generatedAt,
            system_health: emptySystemHealth(generatedAt),
          },
        };
        logJson('warn', { reqId, endpoint: ENDPOINT, event: 'timeout', timeout_ms: TIMEOUT_MS });
        resolve(NextResponse.json(payload, { status: 200 }));
      }, TIMEOUT_MS);
    });

    const res = await Promise.race([work, timeout]);
    logJson('info', { reqId, endpoint: ENDPOINT, event: 'complete', duration_ms: Date.now() - startedAt });
    return res;
  } catch (err) {
    logJson('error', { reqId, endpoint: ENDPOINT, event: 'exception', duration_ms: Date.now() - startedAt, error: err instanceof Error ? err.message : String(err) });
    const generatedAt = nowIso();
    const payload: OwnerHealthResponse = {
      ok: true,
      dataSource: 'empty_not_wired',
      data: {
        generated_at: generatedAt,
        system_health: emptySystemHealth(generatedAt),
      },
    };
    return NextResponse.json(payload, { status: 200 });
  }
}
