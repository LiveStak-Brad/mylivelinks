import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireOwner } from '@/lib/rbac';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  OwnerLiveResponseSchema,
  type LiveStreamRow,
  type OwnerLiveResponse,
  type OwnerPanelDataSource,
} from '@/lib/ownerPanel/index';

const ENDPOINT = '/api/owner/live';
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

function paginated<T>(items: T[], limit: number, offset: number) {
  const hasMore = items.length === limit ? true : null;
  const nextOffset = items.length === limit ? offset + limit : null;
  return {
    items,
    page: {
      limit,
      offset,
      total: null,
      has_more: hasMore,
      next_offset: nextOffset,
    },
  };
}

function authErrorToResponse(err: unknown, reqId: string) {
  const msg = err instanceof Error ? err.message : '';
  const status = msg === 'UNAUTHORIZED' ? 401 : 403;

  const payload: OwnerLiveResponse = {
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

async function detectSupabaseWired(): Promise<OwnerPanelDataSource> {
  const admin = getSupabaseAdmin();
  const attempt = await admin.from('live_streams').select('id', { head: true, count: 'exact' });
  if (!attempt.error) return 'supabase';
  if (isNotWiredError(attempt.error)) return 'empty_not_wired';
  return 'supabase';
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

    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

    const dataSource = await detectSupabaseWired().catch(() => 'empty_not_wired' as const);

    const payload: OwnerLiveResponse = {
      ok: true,
      dataSource,
      data: {
        generated_at: generatedAt,
        live_streams: paginated([] as LiveStreamRow[], limit, offset),
      },
    };

    const parsed = OwnerLiveResponseSchema.safeParse(payload);
    if (!parsed.success) {
      logJson('error', { reqId, endpoint: ENDPOINT, event: 'response_schema_invalid', issues: parsed.error.issues });
      const emptyPayload: OwnerLiveResponse = {
        ok: true,
        dataSource: 'empty_not_wired',
        data: {
          generated_at: generatedAt,
          live_streams: paginated([] as LiveStreamRow[], limit, offset),
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
        const payload: OwnerLiveResponse = {
          ok: true,
          dataSource: 'empty_not_wired',
          data: {
            generated_at: generatedAt,
            live_streams: paginated([] as LiveStreamRow[], 50, 0),
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
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
