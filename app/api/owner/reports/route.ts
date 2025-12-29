import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireOwner } from '@/lib/rbac';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  OwnerReportsResponseSchema,
  type OwnerReportsResponse,
  type OwnerPanelDataSource,
  type ReportRow,
} from '@/lib/ownerPanel/index';

const ENDPOINT = '/api/owner/reports';
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

  const payload: OwnerReportsResponse = {
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

async function fetchReports(limit: number, offset: number): Promise<{ items: ReportRow[]; dataSource: OwnerPanelDataSource }> {
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
      dataSource: 'supabase',
      items: rows.map((r: any) => ({
        id: String(r?.id ?? ''),
        report_type: mapReportType(r?.report_type),
        report_reason: String(r?.report_reason ?? 'unknown'),
        report_details: r?.report_details ?? null,
        status: mapReportStatus(r?.status),
        created_at: r?.created_at ?? nowIso(),
        reviewed_at: r?.reviewed_at ?? null,
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

    const { items, dataSource } = await fetchReports(limit, offset).catch((err) => {
      if (isNotWiredError(err)) return { items: [] as ReportRow[], dataSource: 'empty_not_wired' as const };
      logJson('error', { reqId, endpoint: ENDPOINT, event: 'fetch_failed', error: err instanceof Error ? err.message : String(err) });
      return { items: [] as ReportRow[], dataSource: 'empty_not_wired' as const };
    });

    const payload: OwnerReportsResponse = {
      ok: true,
      dataSource,
      data: {
        generated_at: generatedAt,
        reports: paginated(items, limit, offset),
      },
    };

    const parsed = OwnerReportsResponseSchema.safeParse(payload);
    if (!parsed.success) {
      logJson('error', { reqId, endpoint: ENDPOINT, event: 'response_schema_invalid', issues: parsed.error.issues });
      const emptyPayload: OwnerReportsResponse = {
        ok: true,
        dataSource: 'empty_not_wired',
        data: {
          generated_at: generatedAt,
          reports: paginated([] as ReportRow[], limit, offset),
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
        const payload: OwnerReportsResponse = {
          ok: true,
          dataSource: 'empty_not_wired',
          data: {
            generated_at: generatedAt,
            reports: paginated([] as ReportRow[], 50, 0),
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
    const payload: OwnerReportsResponse = {
      ok: true,
      dataSource: 'empty_not_wired',
      data: {
        generated_at: nowIso(),
        reports: paginated([] as ReportRow[], 50, 0),
      },
    };
    return NextResponse.json(payload, { status: 200 });
  }
}
