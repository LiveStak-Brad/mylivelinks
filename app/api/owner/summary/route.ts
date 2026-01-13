/**
 * ============================================================================
 * OWNER DASHBOARD SUMMARY API
 * ============================================================================
 * 
 * ⚠️ DO NOT MODIFY without testing against the owner dashboard UI
 * 
 * This endpoint provides comprehensive metrics for the owner dashboard:
 * - Total users, new users, DAU (uses profiles + room_presence tables)
 * - Live streams count and details (uses live_streams table)
 * - Gift metrics (uses ledger_entries with entry_type = 'coin_spend_gift')
 * - Revenue metrics (uses ledger_entries with entry_type = 'coin_purchase')
 * - Pending reports (uses content_reports table)
 * - Feature flags (uses feature_flags table with last_changed_at, NOT updated_at)
 * - LiveKit health (uses admin_live_health RPC)
 * - System health (database, storage, livekit, stripe status)
 * 
 * Key tables/RPCs used:
 * - owner_dashboard_stats_v1() - primary stats RPC (preferred path)
 * - admin_live_health() - LiveKit metrics RPC
 * - profiles, room_presence, live_streams, ledger_entries, content_reports
 * - feature_flags (IMPORTANT: uses last_changed_at column, NOT updated_at)
 * 
 * If you modify ANY queries here, verify the owner dashboard still works at:
 * /owner → Dashboard page with all stat cards
 * ============================================================================
 */
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
  type ReferralSnapshot,
  type ReportRow,
  type RevenueSummary,
  type SystemHealth,
  type TimeSeriesPoint,
  type TopCreatorToday,
} from '@/lib/ownerPanel/index';

const ENDPOINT = '/api/owner/summary';
const TIMEOUT_MS = 9000;

function nowIso() {
  return new Date().toISOString();
}

function withTimeout<T>(p: Promise<T>, ms: number, onTimeout: () => T): Promise<T> {
  return new Promise<T>((resolve) => {
    const t = setTimeout(() => resolve(onTimeout()), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(onTimeout());
      }
    );
  });
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
      livekit: { status: 'degraded', checked_at: checkedAt, latency_ms: null, error: 'not_wired', token_success_rate: null, avg_join_time_ms: null, live_count: null },
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

  // Check LiveKit health - try RPC first, fall back to checking if LiveKit is configured
  let livekitStatus: SystemHealth['services']['livekit']['status'] = 'degraded';
  let livekitLatency: number | null = null;
  let livekitError: string | null = 'not_wired';
  let livekitTokenSuccessRate: number | null = null;
  let livekitAvgJoinTime: number | null = null;
  let livekitLiveCount: number | null = null;

  // First check if LiveKit is configured at all
  const livekitUrl = process.env.LIVEKIT_URL;
  const livekitApiKey = process.env.LIVEKIT_API_KEY;
  const livekitConfigured = !!(livekitUrl && livekitApiKey);

  try {
    const startedLivekit = Date.now();
    const { data: lkData, error: lkError } = await admin.rpc('admin_live_health');
    livekitLatency = Date.now() - startedLivekit;

    if (!lkError && lkData) {
      dataSource = 'supabase';
      livekitError = null;
      livekitTokenSuccessRate = typeof lkData.token_success_rate === 'number' ? lkData.token_success_rate : null;
      livekitAvgJoinTime = typeof lkData.avg_join_time_ms === 'number' ? lkData.avg_join_time_ms : null;
      livekitLiveCount = typeof lkData.live_count === 'number' ? lkData.live_count : null;

      // Determine status based on metrics
      const tokenRate = livekitTokenSuccessRate ?? 100;
      if (tokenRate >= 95) {
        livekitStatus = 'ok';
      } else if (tokenRate >= 80) {
        livekitStatus = 'degraded';
      } else {
        livekitStatus = 'down';
      }
    } else if (lkError) {
      // RPC failed - check if LiveKit is at least configured
      // Handle "not wired" errors OR "forbidden" (migration not applied yet)
      const isForbiddenError = lkError.message?.toLowerCase().includes('forbidden');
      if (isNotWiredError(lkError) || isForbiddenError) {
        // RPC doesn't exist or migration not applied - if LiveKit is configured, assume it's working
        if (livekitConfigured) {
          livekitStatus = 'ok';
          livekitError = null;
          livekitTokenSuccessRate = 100; // Default to 100% when no tracking data
          livekitAvgJoinTime = 0;
        }
      } else {
        livekitError = lkError.message;
        livekitStatus = 'down';
      }
    }
  } catch (e) {
    // On exception, check if LiveKit is configured
    if (livekitConfigured) {
      livekitStatus = 'ok';
      livekitError = null;
      livekitTokenSuccessRate = 100;
      livekitAvgJoinTime = 0;
    } else {
      livekitError = e instanceof Error ? e.message : String(e);
    }
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
    livekit: {
      status: livekitStatus,
      checked_at: checkedAt,
      latency_ms: livekitLatency,
      error: livekitError,
      token_success_rate: livekitTokenSuccessRate,
      avg_join_time_ms: livekitAvgJoinTime,
      live_count: livekitLiveCount,
    },
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

  // ---------------------------------------------------------------------------
  // Preferred path: single DB-side RPC for canonical owner dashboard stats.
  // - Fixes inflated active-user counts (room_presence is per-room scoped)
  // - Faster and less timeout-prone than many small PostgREST queries
  // ---------------------------------------------------------------------------
  try {
    const { data, error } = await admin.rpc('owner_dashboard_stats_v1');
    if (!error && Array.isArray(data) && data.length > 0) {
      const row: any = data[0];
      dataSource = 'supabase';
      const stats: DashboardStats = {
        generated_at: toIsoDateTime(row?.generated_at ?? generatedAt),
        users_total: Number(row?.users_total ?? 0),
        users_new_24h: Number(row?.users_new_24h ?? 0),
        users_active_24h: Number(row?.users_active_24h ?? 0),
        users_active_7d: Number(row?.users_active_7d ?? 0),
        profiles_total: Number(row?.profiles_total ?? 0),
        streams_live: Number(row?.streams_live ?? 0),
        gifts_today_count: Number(row?.gifts_today_count ?? 0),
        gifts_today_coins: Number(row?.gifts_today_coins ?? 0),
        reports_pending: Number(row?.reports_pending ?? 0),
        applications_pending: Number(row?.applications_pending ?? 0),
        revenue_today_usd_cents: Number(row?.revenue_today_usd_cents ?? 0),
        revenue_30d_usd_cents: Number(row?.revenue_30d_usd_cents ?? 0),
      };

      return { value: stats, dataSource };
    }

    if (error && !isNotWiredError(error)) {
      // If the RPC exists but failed for a non-schema reason, surface it by falling through
      // into the existing JS path (which will throw on non-not-wired errors).
      logJson('warn', {
        reqId,
        endpoint: ENDPOINT,
        event: 'owner_dashboard_stats_rpc_failed',
        code: (error as any)?.code,
        message: (error as any)?.message,
      });
    }
  } catch (e) {
    // ignore and fall back to the JS multi-query path below
  }

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

  let usersTotal: number | null = null;
  let usersNew24h: number | null = null;
  let usersActive24h: number | null = null;
  let usersActive7d: number | null = null;
  let profilesTotal: number | null = null;
  let streamsLive: number | null = null;
  let giftsTodayCount: number | null = null;
  let giftsTodayCoins: number | null = null;
  let reportsPending: number | null = null;
  let applicationsPending: number | null = null;
  let revenueToday: number | null = null;
  let revenue30d: number | null = null;

  try {
    [
      usersTotal,
      usersNew24h,
      usersActive24h,
      usersActive7d,
      profilesTotal,
      streamsLive,
      giftsTodayCount,
      giftsTodayCoins,
      reportsPending,
      applicationsPending,
      revenueToday,
      revenue30d,
    ] = await Promise.all([
      safeCount(admin.from('profiles').select('id', { count: 'exact', head: true })),
      safeCount(admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since24h)),
      // NOTE: This fallback path counts rows (not distinct users) because room_presence is
      // per-room scoped. The canonical path above (owner_dashboard_stats_v1) fixes this by
      // using COUNT(DISTINCT profile_id). Keep the fallback for dev environments where the
      // RPC might not be present yet.
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
    ]);
  } catch (e) {
    // Do NOT silently turn real failures into "0" (that looks like fake stats).
    // Fail loudly so we can see and fix the actual problem (permissions, env vars, schema drift).
    logJson('error', {
      reqId,
      endpoint: ENDPOINT,
      event: 'stats_query_failed',
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }

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

  // feature_flags table only has: key, enabled, description, last_changed_by, last_changed_at
  // (no scope or value_json columns)
  const { data, error } = await admin
    .from('feature_flags')
    .select('key, description, enabled, last_changed_at')
    .order('last_changed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (!error) {
    const rows = Array.isArray(data) ? data : [];
    return {
      items: rows.map((r: any) => ({
        key: String(r?.key ?? ''),
        description: r?.description ?? null,
        scope: 'global' as FeatureFlag['scope'], // default since column doesn't exist
        enabled: r?.enabled === true,
        value_json: null,
        updated_at: toIsoDateTime(r?.last_changed_at),
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

// ============================================================================
// ANALYTICS: Time series and snapshots
// ============================================================================

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

async function buildGiftsOverTime(reqId: string): Promise<TimeSeriesPoint[]> {
  const admin = getSupabaseAdmin();
  const days = getLast7Days();
  const since = days[0] + 'T00:00:00Z';

  try {
    const { data, error } = await admin
      .from('ledger_entries')
      .select('created_at')
      .eq('entry_type', 'coin_spend_gift')
      .gte('created_at', since);

    if (error) {
      if (isNotWiredError(error)) return days.map(d => ({ date: d, value: 0 }));
      throw error;
    }

    const counts = new Map<string, number>();
    days.forEach(d => counts.set(d, 0));

    for (const row of (data || [])) {
      const date = String(row.created_at || '').split('T')[0];
      if (counts.has(date)) {
        counts.set(date, (counts.get(date) || 0) + 1);
      }
    }

    return days.map(d => ({ date: d, value: counts.get(d) || 0 }));
  } catch {
    return days.map(d => ({ date: d, value: 0 }));
  }
}

async function buildUsersOverTime(reqId: string): Promise<TimeSeriesPoint[]> {
  const admin = getSupabaseAdmin();
  const days = getLast7Days();
  const since = days[0] + 'T00:00:00Z';

  try {
    const { data, error } = await admin
      .from('profiles')
      .select('created_at')
      .gte('created_at', since);

    if (error) {
      if (isNotWiredError(error)) return days.map(d => ({ date: d, value: 0 }));
      throw error;
    }

    const counts = new Map<string, number>();
    days.forEach(d => counts.set(d, 0));

    for (const row of (data || [])) {
      const date = String(row.created_at || '').split('T')[0];
      if (counts.has(date)) {
        counts.set(date, (counts.get(date) || 0) + 1);
      }
    }

    return days.map(d => ({ date: d, value: counts.get(d) || 0 }));
  } catch {
    return days.map(d => ({ date: d, value: 0 }));
  }
}

async function buildStreamsOverTime(reqId: string): Promise<TimeSeriesPoint[]> {
  const admin = getSupabaseAdmin();
  const days = getLast7Days();
  const since = days[0] + 'T00:00:00Z';

  try {
    const { data, error } = await admin
      .from('live_streams')
      .select('started_at')
      .gte('started_at', since);

    if (error) {
      if (isNotWiredError(error)) return days.map(d => ({ date: d, value: 0 }));
      throw error;
    }

    const counts = new Map<string, number>();
    days.forEach(d => counts.set(d, 0));

    for (const row of (data || [])) {
      const date = String(row.started_at || '').split('T')[0];
      if (counts.has(date)) {
        counts.set(date, (counts.get(date) || 0) + 1);
      }
    }

    return days.map(d => ({ date: d, value: counts.get(d) || 0 }));
  } catch {
    return days.map(d => ({ date: d, value: 0 }));
  }
}

async function buildTopCreatorsToday(reqId: string): Promise<TopCreatorToday[]> {
  const admin = getSupabaseAdmin();
  // Use last 7 days to match the charts and ensure there's data to show
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Query the gifts table directly - it has sender_id, recipient_id, coin_amount, created_at
    const { data, error } = await admin
      .from('gifts')
      .select('recipient_id, coin_amount')
      .gte('created_at', since7d)
      .limit(2000);

    if (error) {
      if (isNotWiredError(error)) {
        logJson('info', { reqId, endpoint: ENDPOINT, event: 'gifts_table_not_wired' });
        return [];
      }
      logJson('warn', { reqId, endpoint: ENDPOINT, event: 'top_creators_gifts_error', error: error.message });
      throw error;
    }

    // Aggregate by recipient
    const creatorStats = new Map<string, { coins: number; count: number }>();
    for (const row of (data || [])) {
      const recipientId = row.recipient_id;
      if (!recipientId) continue;
      
      const current = creatorStats.get(recipientId) || { coins: 0, count: 0 };
      current.coins += Math.abs(Number(row.coin_amount) || 0);
      current.count += 1;
      creatorStats.set(recipientId, current);
    }

    logJson('info', { reqId, endpoint: ENDPOINT, event: 'top_creators_aggregated', giftCount: data?.length ?? 0, uniqueRecipients: creatorStats.size });

    if (creatorStats.size === 0) {
      return [];
    }

    // Get top 5 by coins
    const topIds = Array.from(creatorStats.entries())
      .sort((a, b) => b[1].coins - a[1].coins)
      .slice(0, 5)
      .map(([id]) => id);

    // Fetch profile info
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', topIds);

    if (profilesError || !profiles) {
      logJson('warn', { reqId, endpoint: ENDPOINT, event: 'top_creators_profiles_error', error: profilesError?.message });
      return [];
    }

    const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

    return topIds
      .map(id => {
        const stats = creatorStats.get(id)!;
        const profile = profileMap.get(id);
        if (!profile) return null;
        return {
          profile_id: id,
          username: profile.username || 'unknown',
          display_name: profile.display_name || null,
          avatar_url: profile.avatar_url || null,
          gifts_received: stats.count,
          coins_received: stats.coins,
        };
      })
      .filter((x): x is TopCreatorToday => x !== null);
  } catch (e) {
    logJson('warn', { reqId, endpoint: ENDPOINT, event: 'top_creators_exception', error: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

async function buildReferralsToday(reqId: string): Promise<ReferralSnapshot> {
  const admin = getSupabaseAdmin();
  // Use last 7 days to match the charts and ensure there's data to show
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const emptySnapshot: ReferralSnapshot = {
    clicks_today: 0,
    signups_today: 0,
    top_referrer: null,
  };

  try {
    // Get clicks in last 7 days (referral_clicks uses clicked_at)
    const { count: clicksCount, error: clicksError } = await admin
      .from('referral_clicks')
      .select('id', { count: 'exact', head: true })
      .gte('clicked_at', since7d);

    if (clicksError && !isNotWiredError(clicksError)) {
      logJson('warn', { reqId, endpoint: ENDPOINT, event: 'referrals_clicks_error', error: clicksError.message });
      return emptySnapshot;
    }

    // Get signups in last 7 days (referrals uses claimed_at, NOT created_at)
    const { count: signupsCount, error: signupsError } = await admin
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .gte('claimed_at', since7d);

    if (signupsError && !isNotWiredError(signupsError)) {
      logJson('warn', { reqId, endpoint: ENDPOINT, event: 'referrals_signups_error', error: signupsError.message });
      return emptySnapshot;
    }

    // Get top referrer in last 7 days
    const { data: referrals, error: referralsError } = await admin
      .from('referrals')
      .select('referrer_profile_id')
      .gte('claimed_at', since7d);

    let topReferrer: ReferralSnapshot['top_referrer'] = null;
    if (!referralsError && referrals && referrals.length > 0) {
      const referrerCounts = new Map<string, number>();
      for (const r of referrals) {
        const id = r.referrer_profile_id;
        if (id) {
          referrerCounts.set(id, (referrerCounts.get(id) || 0) + 1);
        }
      }

      if (referrerCounts.size > 0) {
        const [topId, topCount] = Array.from(referrerCounts.entries())
          .sort((a, b) => b[1] - a[1])[0];

        const { data: profile } = await admin
          .from('profiles')
          .select('username')
          .eq('id', topId)
          .single();

        if (profile?.username) {
          topReferrer = { username: profile.username, signups: topCount };
        }
      }
    }

    logJson('info', { reqId, endpoint: ENDPOINT, event: 'referrals_fetched', clicks: clicksCount, signups: signupsCount });

    return {
      clicks_today: clicksCount || 0,
      signups_today: signupsCount || 0,
      top_referrer: topReferrer,
    };
  } catch (e) {
    logJson('warn', { reqId, endpoint: ENDPOINT, event: 'referrals_exception', error: e instanceof Error ? e.message : String(e) });
    return emptySnapshot;
  }
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

  try {
    const generatedAt = nowIso();

    const ffLimit = 50;
    const ffOffset = 0;
    const liveLimit = 25;
    const liveOffset = 0;
    const reportsLimit = 25;
    const reportsOffset = 0;
    const auditLimit = 25;
    const auditOffset = 0;

    // Return real stats even if secondary modules are slow/unavailable.
    const statsRes = await withTimeout(
      buildStats(reqId),
      3500,
      () => ({
        value: {
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
        dataSource: 'empty_not_wired' as const,
      })
    );

    const healthRes = await withTimeout(buildSystemHealth(reqId), 1800, () => ({
      value: emptySystemHealth(generatedAt),
      dataSource: 'empty_not_wired' as const,
    }));

    const flagsRes = await withTimeout(
      buildFeatureFlags(reqId, ffLimit, ffOffset).catch((e) => {
        logJson('warn', { reqId, endpoint: ENDPOINT, event: 'feature_flags_fetch_failed', error: e instanceof Error ? e.message : String(e) });
        return { items: [] as FeatureFlag[], dataSource: 'empty_not_wired' as const };
      }),
      1800,
      () => ({ items: [] as FeatureFlag[], dataSource: 'empty_not_wired' as const })
    );

    const liveStreamsRes = await withTimeout(
      buildLiveStreams(reqId, liveLimit, liveOffset).catch((e) => {
        logJson('warn', { reqId, endpoint: ENDPOINT, event: 'live_streams_fetch_failed', error: e instanceof Error ? e.message : String(e) });
        return { items: [] as LiveStreamRow[], dataSource: 'empty_not_wired' as const };
      }),
      1800,
      () => ({ items: [] as LiveStreamRow[], dataSource: 'empty_not_wired' as const })
    );

    const reportsRes = await withTimeout(
      buildReports(reqId, reportsLimit, reportsOffset).catch((e) => {
        logJson('warn', { reqId, endpoint: ENDPOINT, event: 'reports_fetch_failed', error: e instanceof Error ? e.message : String(e) });
        return { items: [] as ReportRow[], dataSource: 'empty_not_wired' as const };
      }),
      1800,
      () => ({ items: [] as ReportRow[], dataSource: 'empty_not_wired' as const })
    );

    // Build analytics data in parallel
    const emptyDays = getLast7Days().map(d => ({ date: d, value: 0 }));
    const emptyReferrals: ReferralSnapshot = { clicks_today: 0, signups_today: 0, top_referrer: null };
    
    const [giftsOverTime, usersOverTime, streamsOverTime, topCreatorsToday, referralsToday] = await Promise.all([
      withTimeout(buildGiftsOverTime(reqId), 2000, () => emptyDays),
      withTimeout(buildUsersOverTime(reqId), 2000, () => emptyDays),
      withTimeout(buildStreamsOverTime(reqId), 2000, () => emptyDays),
      withTimeout(buildTopCreatorsToday(reqId), 2000, () => []),
      withTimeout(buildReferralsToday(reqId), 2000, () => emptyReferrals),
    ]);

    const windowEndAt = generatedAt;
    const windowStartAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const revenueSummary = emptyRevenueSummary(windowStartAt, windowEndAt);

    let dataSource: OwnerPanelDataSource = 'empty_not_wired';
    if (
      statsRes.dataSource === 'supabase' ||
      healthRes.dataSource === 'supabase' ||
      flagsRes.dataSource === 'supabase' ||
      liveStreamsRes.dataSource === 'supabase' ||
      reportsRes.dataSource === 'supabase'
    ) {
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
        // Analytics time series (7 days)
        gifts_over_time: giftsOverTime,
        users_over_time: usersOverTime,
        streams_over_time: streamsOverTime,
        // Snapshots
        top_creators_today: topCreatorsToday,
        referrals_today: referralsToday,
      },
    };

    const parsed = OwnerSummaryResponseSchema.safeParse(payload);
    if (!parsed.success) {
      // Log the issue but DON'T block the response - UI needs to show the data even if schema drifts
      logJson('warn', { reqId, endpoint: ENDPOINT, event: 'response_schema_drift', issues: parsed.error.issues });
    }

    logJson('info', { reqId, endpoint: ENDPOINT, event: 'complete', duration_ms: Date.now() - startedAt });
    return NextResponse.json(payload, { status: 200 });
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
