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

async function fetchLiveStreams(limit: number, offset: number): Promise<{ items: LiveStreamRow[]; dataSource: OwnerPanelDataSource }> {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from('live_streams')
    .select(
      `
        id,
        profile_id,
        room_name,
        started_at,
        ended_at,
        status,
        live_available,
        profile:profiles!live_streams_profile_id_fkey(id, username, display_name, avatar_url)
      `
    )
    .eq('live_available', true)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (!error) {
    const rows = Array.isArray(data) ? data : [];
    const streamIds = rows.map((r: any) => Number(r?.id)).filter((v: any) => Number.isFinite(v));

    const viewerCounts = new Map<number, number>();
    if (streamIds.length > 0) {
      const { data: viewers, error: viewersError } = await admin
        .from('active_viewers')
        .select('live_stream_id')
        .in('live_stream_id', streamIds);

      if (!viewersError && Array.isArray(viewers)) {
        for (const row of viewers as any[]) {
          const key = Number((row as any)?.live_stream_id);
          if (!Number.isFinite(key)) continue;
          viewerCounts.set(key, (viewerCounts.get(key) || 0) + 1);
        }
      }
    }

    return {
      dataSource: 'supabase',
      items: rows.map((r: any) => {
        const streamIdNum = Number(r?.id);
        const host = r?.profile;
        const mappedStatus: LiveStreamRow['status'] = 'live';

        return {
          stream_id: String(r?.id ?? ''),
          room_id: null,
          room_slug: null,
          title: r?.room_name ?? null,
          status: mappedStatus,
          started_at: r?.started_at ?? nowIso(),
          ended_at: r?.ended_at ?? null,
          host_profile_id: String(host?.id ?? r?.profile_id ?? ''),
          host_username: String(host?.username ?? 'unknown'),
          host_display_name: host?.display_name ?? null,
          host_avatar_url: host?.avatar_url ?? null,
          viewer_count: Number.isFinite(streamIdNum) ? viewerCounts.get(streamIdNum) || 0 : 0,
          peak_viewer_count: null,
          is_recording: false,
        };
      }),
    };
  }

  if (isNotWiredError(error)) {
    return { items: [], dataSource: 'empty_not_wired' };
  }

  throw error;
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

    const live = await fetchLiveStreams(limit, offset).catch((err) => {
      if (isNotWiredError(err)) return { items: [] as LiveStreamRow[], dataSource: 'empty_not_wired' as const };
      logJson('warn', { reqId, endpoint: ENDPOINT, event: 'fetch_failed', error: err instanceof Error ? err.message : String(err) });
      return { items: [] as LiveStreamRow[], dataSource: 'empty_not_wired' as const };
    });

    const payload: OwnerLiveResponse = {
      ok: true,
      dataSource: live.dataSource === 'supabase' ? 'supabase' : dataSource,
      data: {
        generated_at: generatedAt,
        live_streams: paginated(live.items, limit, offset),
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
