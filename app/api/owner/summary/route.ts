import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireOwner } from '@/lib/rbac';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  OwnerSummaryResponseSchema,
  type AuditLogRow,
  type DashboardStats,
  type FeatureFlag,
  type LiveStreamRow,
  type OwnerPanelDataSource,
  type OwnerSummaryResponse,
  type ReportRow,
  type RevenueSummary,
  type SystemHealth,
} from '@/lib/ownerPanel/index';

const ENDPOINT = '/api/owner/summary';
const TIMEOUT_MS = 9000;

function nowIso() {
  return new Date().toISOString();
}

/**
 * Convert a database datetime value to ISO 8601 format with timezone.
 * Handles PostgreSQL formats like "2024-01-01 12:00:00" or "2024-01-01T12:00:00"
 * and ensures they have the required Z suffix for Zod datetime validation.
 */
function toIsoDateTime(value: unknown): string {
  if (!value) return nowIso();
  const str = String(value);
  // If already ends with Z or has timezone offset, return as-is
  if (/Z$|[+-]\d{2}:\d{2}$/.test(str)) {
    return str;
  }
  // Try parsing as a date and converting to ISO
  const parsed = new Date(str.replace(' ', 'T'));
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  // Fallback: append Z if it looks like an ISO date without timezone
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(str)) {
    return str.replace(' ', 'T') + 'Z';
  }
  return nowIso();
}

function logJson(level: 'info' | 'warn' | 'error', params: Record<string, unknown>) {
  try {
    console.log(JSON.stringify({ level, ...params }));
  } catch {
    console.log(String(params));
  }
}

function authErrorToResponse(err: unknown, reqId: string) {
  const msg = err instanceof Error ? err.message : '';
  const code = msg === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : msg === 'FORBIDDEN' ? 'FORBIDDEN' : 'FORBIDDEN';
  const http_status = msg === 'UNAUTHORIZED' ? 401 : 403;

  const payload: OwnerSummaryResponse = {
    ok: false,
    error: {
      code,
      message: code === 'UNAUTHORIZED' ? 'Unauthorized' : 'Forbidden',
      http_status,
      details: null,
    },
  };

  const parsed = OwnerSummaryResponseSchema.safeParse(payload);
  if (!parsed.success) {
    logJson('error', { reqId, endpoint: ENDPOINT, event: 'response_schema_invalid', issues: parsed.error.issues });
  }

  return NextResponse.json(payload, { status: http_status });
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

function emptyRevenueSummary(windowStartAt: string, windowEndAt: string): RevenueSummary {
  return {
    window_start_at: windowStartAt,
    window_end_at: windowEndAt,
    currency: 'USD',
    gross_usd_cents: 0,
    net_usd_cents: 0,
    platform_fee_usd_cents: 0,
    creator_payout_usd_cents: 0,
    coin_purchases_count: 0,
    cashouts_count: 0,
    diamond_conversions_count: 0,
  };
}

function emptySystemHealth(checkedAt: string): SystemHealth {
  return {
    status: 'degraded',
    checked_at: checkedAt,
    services: {
      database: { status: 'degraded', checked_at: checkedAt, latency_ms: null, error: 'not_wired' },
      storage: { status: 'degraded', checked_at: checkedAt, latency_ms: null, error: 'not_wired' },
      livekit: { status: 'degraded', checked_at: checkedAt, latency_ms: null, error: 'not_wired' },
      stripe: { status: 'degraded', checked_at: checkedAt, latency_ms: null, error: 'not_wired' },
    },
  };
}

async function buildSystemHealth(reqId: string): Promise<{ value: SystemHealth; dataSource: OwnerPanelDataSource }> {
  const checkedAt = nowIso();
  const admin = getSupabaseAdmin();

  let dataSource: OwnerPanelDataSource = 'empty_not_wired';

  const startedDb = Date.now();
  const db = await admin.from('profiles').select('id', { head: true, count: 'exact' });
  const dbLatency = Date.now() - startedDb;

  const dbOk = !db.error;
  if (dbOk) dataSource = 'supabase';

  const dbStatus: SystemHealth['services']['database']['status'] = dbOk
    ? 'ok'
    : isNotWiredError(db.error)
      ? 'degraded'
      : 'down';

  let storageOk = false;
  let storageLatency: number | null = null;
  let storageError: string | null = 'not_wired';

  let storageStatus: SystemHealth['services']['storage']['status'] = 'degraded';

  try {
    const startedStorage = Date.now();
    const buckets = await admin.storage.listBuckets();
    storageLatency = Date.now() - startedStorage;

    if (!buckets.error) {
      storageOk = true;
      storageError = null;
      dataSource = 'supabase';
      storageStatus = 'ok';
    } else if (!isNotWiredError(buckets.error)) {
      storageError = buckets.error.message;
      storageStatus = 'down';
    }
  } catch (e) {
    storageError = e instanceof Error ? e.message : String(e);
    storageStatus = 'down';
  }

  const services: SystemHealth['services'] = {
    database: {
      status: dbStatus,
      checked_at: checkedAt,
      latency_ms: dbOk ? dbLatency : null,
      error: dbOk ? null : db.error?.message ?? 'not_wired',
    },
    storage: {
      status: storageStatus,
      checked_at: checkedAt,
      latency_ms: storageOk ? storageLatency : null,
      error: storageOk ? null : storageError,
    },
    livekit: { status: 'degraded', checked_at: checkedAt, latency_ms: null, error: 'not_wired' },
    stripe: { status: 'degraded', checked_at: checkedAt, latency_ms: null, error: 'not_wired' },
  };

  const overall: SystemHealth['status'] =
    services.database.status === 'down' || services.storage.status === 'down' ? 'down' :
    services.database.status === 'degraded' || services.storage.status === 'degraded' || services.livekit.status === 'degraded' || services.stripe.status === 'degraded'
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

async function buildStats(reqId: string): Promise<{ value: DashboardStats; dataSource: OwnerPanelDataSource }> {
  const generatedAt = nowIso();
  const admin = getSupabaseAdmin();

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let dataSource: OwnerPanelDataSource = 'empty_not_wired';

  const safeCount = async (q: any): Promise<number | null> => {
    const { count, error } = await q;
    if (!error) {
      dataSource = 'supabase';
      return count ?? 0;
    }
    if (isNotWiredError(error)) return null;
    throw error;
  };

  const safeSumGiftCoinsToday = async (sinceIso: string): Promise<number | null> => {
    const { data, error } = await admin
      .from('ledger_entries')
      .select('delta_coins, created_at, entry_type')
      .gte('created_at', sinceIso)
      .eq('entry_type', 'coin_spend_gift')
      .limit(5000);

    if (!error) {
      dataSource = 'supabase';
      const rows = Array.isArray(data) ? data : [];
      let sum = 0;
      for (const r of rows as any[]) {
        const v = Math.abs(Number(r?.delta_coins ?? 0));
        if (Number.isFinite(v) && v > 0) sum += v;
      }
      return sum;
    }

    if (isNotWiredError(error)) return null;
    throw error;
  };

  const safeSumLedgerCents = async (sinceIso: string): Promise<number | null> => {
    const { data, error } = await admin
      .from('ledger_entries')
      .select('amount_usd_cents, created_at, entry_type')
      .gte('created_at', sinceIso)
      .eq('entry_type', 'coin_purchase')
      .limit(5000);

    if (!error) {
      dataSource = 'supabase';
      const rows = Array.isArray(data) ? data : [];
      let sum = 0;
      for (const r of rows as any[]) {
        const v = Number(r?.amount_usd_cents ?? 0);
        if (Number.isFinite(v) && v > 0) sum += v;
      }
      return sum;
    }

    if (isNotWiredError(error)) return null;
    throw error;
  };

  const startOfDay = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();

  const [usersTotal, usersNew24h, usersActive24h, usersActive7d, profilesTotal, streamsLive, giftsTodayCount, giftsTodayCoins, reportsPending, applicationsPending, revenueToday, revenue30d] =
    await Promise.all([
      safeCount(admin.from('profiles').select('id', { count: 'exact', head: true })),
      safeCount(admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since24h)),
      safeCount(admin.from('room_presence').select('profile_id', { count: 'exact', head: true }).gte('last_seen_at', since24h)),
      safeCount(admin.from('room_presence').select('profile_id', { count: 'exact', head: true }).gte('last_seen_at', since7d)),
      safeCount(admin.from('profiles').select('id', { count: 'exact', head: true })),
      safeCount(admin.from('live_streams').select('id', { count: 'exact', head: true }).eq('live_available', true)),
      safeCount(admin.from('ledger_entries').select('id', { count: 'exact', head: true }).gte('created_at', startOfDay).eq('entry_type', 'coin_spend_gift')),
      safeSumGiftCoinsToday(startOfDay),
      (async () => {
        const pendingStatuses = ['pending', 'open', 'under_review'];
        const c1 = await safeCount(
          admin.from('content_reports').select('id', { count: 'exact', head: true }).in('status', pendingStatuses)
        );
        if (c1 !== null) return c1;
        return safeCount(admin.from('reports').select('id', { count: 'exact', head: true }).in('status', pendingStatuses));
      })(),
      (async () => {
        const c1 = await safeCount(admin.from('room_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'));
        if (c1 !== null) return c1;
        return safeCount(admin.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'));
      })(),
      safeSumLedgerCents(startOfDay),
      safeSumLedgerCents(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]).catch((e) => {
      logJson('error', { reqId, endpoint: ENDPOINT, event: 'stats_query_failed', error: e instanceof Error ? e.message : String(e) });
      return [null, null, null, null, null, null, null, null, null, null, null, null] as const;
    });

  const stats: DashboardStats = {
    generated_at: generatedAt,
    users_total: usersTotal ?? 0,
    users_new_24h: usersNew24h ?? 0,
    users_active_24h: usersActive24h ?? 0,
    users_active_7d: usersActive7d ?? 0,
    profiles_total: profilesTotal ?? 0,
    streams_live: streamsLive ?? 0,
    gifts_today_count: giftsTodayCount ?? 0,
    gifts_today_coins: giftsTodayCoins ?? 0,
    reports_pending: reportsPending ?? 0,
    applications_pending: applicationsPending ?? 0,
    revenue_today_usd_cents: revenueToday ?? 0,
    revenue_30d_usd_cents: revenue30d ?? 0,
  };

  return { value: stats, dataSource };
}

function mapReportType(v: unknown): ReportRow['report_type'] {
  const t = String(v ?? '').toLowerCase();
  if (t === 'user') return 'user';
  if (t === 'post') return 'post';
  if (t === 'comment') return 'comment';
  if (t === 'message' || t === 'chat') return 'message';
  if (t === 'room' || t === 'stream') return 'room';
  return 'other';
}

function mapReportStatus(v: unknown): ReportRow['status'] {
  const s = String(v ?? '').toLowerCase();
  if (s === 'pending') return 'pending';
  if (s === 'reviewed' || s === 'reviewing') return 'reviewed';
  if (s === 'dismissed') return 'dismissed';
  if (s === 'resolved' || s === 'actioned') return 'actioned';
  return 'pending';
}

async function buildReports(reqId: string, limit: number, offset: number): Promise<{ items: ReportRow[]; dataSource: OwnerPanelDataSource }> {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from('content_reports')
    .select(
      'id, report_type, report_reason, report_details, status, created_at, reviewed_at, reviewed_by, admin_notes, reporter:profiles!content_reports_reporter_id_fkey(username, display_name, avatar_url), reported_user:profiles!content_reports_reported_user_id_fkey(id, username, display_name, avatar_url)'
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (!error) {
    const rows = Array.isArray(data) ? data : [];
    return {
      items: rows.map((r: any) => ({
        id: String(r?.id ?? ''),
        report_type: mapReportType(r?.report_type),
        report_reason: String(r?.report_reason ?? 'unknown'),
        report_details: r?.report_details ?? null,
        status: mapReportStatus(r?.status),
        created_at: toIsoDateTime(r?.created_at),
        reviewed_at: r?.reviewed_at ? toIsoDateTime(r.reviewed_at) : null,
        reviewed_by: r?.reviewed_by ?? null,
        admin_notes: r?.admin_notes ?? null,
        reporter: r?.reporter
          ? {
              username: r.reporter.username ?? null,
              display_name: r.reporter.display_name ?? null,
              avatar_url: r.reporter.avatar_url ?? null,
            }
          : null,
        reported_user: r?.reported_user
          ? {
              id: String(r.reported_user.id ?? ''),
              username: r.reported_user.username ?? null,
              display_name: r.reported_user.display_name ?? null,
              avatar_url: r.reported_user.avatar_url ?? null,
            }
          : null,
      })),
      dataSource: 'supabase',
    };
  }

  if (isNotWiredError(error)) {
    logJson('warn', { reqId, endpoint: ENDPOINT, event: 'reports_not_wired', code: error.code, message: error.message });
    return { items: [], dataSource: 'empty_not_wired' };
  }

  throw error;
}

async function buildFeatureFlags(reqId: string, limit: number, offset: number): Promise<{ items: FeatureFlag[]; dataSource: OwnerPanelDataSource }> {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from('feature_flags')
    .select('key, description, scope, enabled, value_json, updated_at')
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (!error) {
    const rows = Array.isArray(data) ? data : [];
    return {
      items: rows.map((r: any) => ({
        key: String(r?.key ?? ''),
        description: r?.description ?? null,
        scope: (['global', 'web', 'mobile', 'server'].includes(String(r?.scope)) ? String(r.scope) : 'global') as FeatureFlag['scope'],
        enabled: r?.enabled === true,
        value_json: r?.value_json ?? null,
        updated_at: toIsoDateTime(r?.updated_at),
      })),
      dataSource: 'supabase',
    };
  }

  if (isNotWiredError(error)) {
    return { items: [], dataSource: 'empty_not_wired' };
  }

  throw error;
}

async function buildLiveStreams(reqId: string, limit: number, offset: number): Promise<{ items: LiveStreamRow[]; dataSource: OwnerPanelDataSource }> {
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
          started_at: toIsoDateTime(r?.started_at),
          ended_at: r?.ended_at ? toIsoDateTime(r.ended_at) : null,
          host_profile_id: String(host?.id ?? r?.profile_id ?? ''),
          host_username: String(host?.username ?? 'unknown'),
          host_display_name: host?.display_name ?? null,
          host_avatar_url: host?.avatar_url ?? null,
          viewer_count: Number.isFinite(streamIdNum) ? viewerCounts.get(streamIdNum) || 0 : 0,
          peak_viewer_count: null,
          is_recording: false,
        };
      }),
      dataSource: 'supabase',
    };
  }

  if (isNotWiredError(error)) {
    logJson('warn', { reqId, endpoint: ENDPOINT, event: 'live_streams_not_wired', code: error.code, message: error.message });
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
    const statsPromise = buildStats(reqId);
    const healthPromise = buildSystemHealth(reqId);

    const ffLimit = 50;
    const ffOffset = 0;
    const liveLimit = 25;
    const liveOffset = 0;
    const reportsLimit = 25;
    const reportsOffset = 0;
    const auditLimit = 25;
    const auditOffset = 0;

    const [statsRes, healthRes, flagsRes, liveStreamsRes, reportsRes] = await Promise.all([
      statsPromise,
      healthPromise,
      buildFeatureFlags(reqId, ffLimit, ffOffset).catch((e) => {
        logJson('warn', { reqId, endpoint: ENDPOINT, event: 'feature_flags_fetch_failed', error: e instanceof Error ? e.message : String(e) });
        return { items: [] as FeatureFlag[], dataSource: 'empty_not_wired' as const };
      }),
      buildLiveStreams(reqId, liveLimit, liveOffset).catch((e) => {
        logJson('warn', { reqId, endpoint: ENDPOINT, event: 'live_streams_fetch_failed', error: e instanceof Error ? e.message : String(e) });
        return { items: [] as LiveStreamRow[], dataSource: 'empty_not_wired' as const };
      }),
      buildReports(reqId, reportsLimit, reportsOffset).catch((e) => {
        logJson('warn', { reqId, endpoint: ENDPOINT, event: 'reports_fetch_failed', error: e instanceof Error ? e.message : String(e) });
        return { items: [] as ReportRow[], dataSource: 'empty_not_wired' as const };
      }),
    ]);

    const windowEndAt = generatedAt;
    const windowStartAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const revenueSummary = emptyRevenueSummary(windowStartAt, windowEndAt);

    let dataSource: OwnerPanelDataSource = 'empty_not_wired';
    if (statsRes.dataSource === 'supabase' || healthRes.dataSource === 'supabase' || flagsRes.dataSource === 'supabase' || liveStreamsRes.dataSource === 'supabase' || reportsRes.dataSource === 'supabase') {
      dataSource = 'supabase';
    }

    const payload: OwnerSummaryResponse = {
      ok: true,
      dataSource,
      data: {
        generated_at: generatedAt,
        stats: statsRes.value,
        revenue_summary: revenueSummary,
        system_health: healthRes.value,
        feature_flags: paginated(flagsRes.items, ffLimit, ffOffset),
        live_streams: paginated(liveStreamsRes.items, liveLimit, liveOffset),
        reports: paginated(reportsRes.items, reportsLimit, reportsOffset),
        audit_logs: paginated([] as AuditLogRow[], auditLimit, auditOffset),
      },
    };

    const parsed = OwnerSummaryResponseSchema.safeParse(payload);
    if (!parsed.success) {
      logJson('error', { reqId, endpoint: ENDPOINT, event: 'response_schema_invalid', issues: parsed.error.issues });
      const emptyPayload: OwnerSummaryResponse = {
        ok: true,
        dataSource: 'empty_not_wired',
        data: {
          generated_at: generatedAt,
          stats: {
            generated_at: generatedAt,
            users_total: 0,
            users_new_24h: 0,
            users_active_24h: 0,
            users_active_7d: 0,
            profiles_total: 0,
            streams_live: 0,
            gifts_today_count: 0,
            gifts_today_coins: 0,
            reports_pending: 0,
            applications_pending: 0,
            revenue_today_usd_cents: 0,
            revenue_30d_usd_cents: 0,
          },
          revenue_summary: emptyRevenueSummary(windowStartAt, windowEndAt),
          system_health: emptySystemHealth(generatedAt),
          feature_flags: paginated([] as FeatureFlag[], ffLimit, ffOffset),
          live_streams: paginated([] as LiveStreamRow[], liveLimit, liveOffset),
          reports: paginated([] as ReportRow[], reportsLimit, reportsOffset),
          audit_logs: paginated([] as AuditLogRow[], auditLimit, auditOffset),
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
        const payload: OwnerSummaryResponse = {
          ok: true,
          dataSource: 'empty_not_wired',
          data: {
            generated_at: generatedAt,
            stats: {
              generated_at: generatedAt,
              users_total: 0,
              users_new_24h: 0,
              users_active_24h: 0,
              users_active_7d: 0,
              profiles_total: 0,
              streams_live: 0,
              gifts_today_count: 0,
              gifts_today_coins: 0,
              reports_pending: 0,
              applications_pending: 0,
              revenue_today_usd_cents: 0,
              revenue_30d_usd_cents: 0,
            },
            revenue_summary: emptyRevenueSummary(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), generatedAt),
            system_health: emptySystemHealth(generatedAt),
            feature_flags: paginated([] as FeatureFlag[], 50, 0),
            live_streams: paginated([] as LiveStreamRow[], 25, 0),
            reports: paginated([] as ReportRow[], 25, 0),
            audit_logs: paginated([] as AuditLogRow[], 25, 0),
          },
        };
        logJson('warn', { reqId, endpoint: ENDPOINT, event: 'timeout', timeout_ms: TIMEOUT_MS });
        resolve(NextResponse.json(payload, { status: 200 }));
      }, TIMEOUT_MS);
    });

    const res = await Promise.race([work, timeout]);
    logJson('info', {
      reqId,
      endpoint: ENDPOINT,
      event: 'complete',
      duration_ms: Date.now() - startedAt,
    });
    return res;
  } catch (err) {
    logJson('error', {
      reqId,
      endpoint: ENDPOINT,
      event: 'exception',
      duration_ms: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
    });

    const payload: OwnerSummaryResponse = {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        http_status: 500,
        details: null,
      },
    };

    return NextResponse.json(payload, { status: 500 });
  }
}
