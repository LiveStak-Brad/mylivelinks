import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const supabase = createRouteHandlerClient(request);
    const { data, error } = await supabase.rpc('admin_overview');

    if (!error) {
      return NextResponse.json(data);
    }

    const admin = getSupabaseAdmin();

    const now = Date.now();
    const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const since60s = new Date(now - 60 * 1000).toISOString();

    const { count: usersCount } = await admin.from('profiles').select('id', { count: 'exact', head: true });
    const { count: activeStreamsCount } = await admin
      .from('live_streams')
      .select('id', { count: 'exact', head: true })
      .eq('live_available', true);
    const { count: gifts24hCount } = await admin
      .from('gifts')
      .select('id', { count: 'exact', head: true })
      .gte('sent_at', since24h);

    const getPendingReportsCount = async () => {
      const { count: crCount, error: crErr } = await admin
        .from('content_reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (!crErr) return crCount ?? 0;

      const { count: rCount, error: rErr } = await admin
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (!rErr) return rCount ?? 0;
      return 0;
    };

    const pendingReportsCount = await getPendingReportsCount();

    const { data: liveStreams } = await admin
      .from('live_streams')
      .select('id, profile_id, started_at')
      .eq('live_available', true)
      .order('started_at', { ascending: false, nullsFirst: false })
      .limit(20);

    const streamRows = Array.isArray(liveStreams) ? liveStreams : [];
    const streamIds = streamRows.map((s: any) => s.id).filter(Boolean);
    const profileIds = streamRows.map((s: any) => s.profile_id).filter(Boolean);

    const { data: profiles } = profileIds.length
      ? await admin.from('profiles').select('id, username').in('id', profileIds)
      : { data: [] as any[] };
    const usernameById = new Map<string, string>();
    for (const p of Array.isArray(profiles) ? profiles : []) {
      if (p?.id) usernameById.set(String(p.id), String(p.username ?? ''));
    }

    const { data: viewerRows } = streamIds.length
      ? await admin
          .from('active_viewers')
          .select('live_stream_id')
          .in('live_stream_id', streamIds)
          .eq('is_active', true)
          .eq('is_unmuted', true)
          .eq('is_visible', true)
          .eq('is_subscribed', true)
          .gte('last_active_at', since60s)
      : { data: [] as any[] };

    const viewerCountByStreamId = new Map<string, number>();
    for (const v of Array.isArray(viewerRows) ? viewerRows : []) {
      const sid = String(v?.live_stream_id ?? '');
      if (!sid) continue;
      viewerCountByStreamId.set(sid, (viewerCountByStreamId.get(sid) ?? 0) + 1);
    }

    const live_now = streamRows.map((s: any) => {
      const streamId = String(s?.id ?? '');
      const hostId = String(s?.profile_id ?? '');
      return {
        stream_id: streamId,
        host_user_id: hostId,
        host_name: usernameById.get(hostId) || null,
        title: null,
        viewer_count: viewerCountByStreamId.get(streamId) ?? 0,
        started_at: s?.started_at ?? null,
      };
    });

    const loadRecentReports = async () => {
      const { data: cr, error: crErr } = await admin
        .from('content_reports')
        .select('id, created_at, reporter_id, reported_user_id, report_reason, status')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!crErr && Array.isArray(cr)) {
        const rIds = cr.map((r: any) => r.reporter_id).filter(Boolean);
        const tIds = cr.map((r: any) => r.reported_user_id).filter(Boolean);
        const ids = Array.from(new Set([...rIds, ...tIds].map(String)));
        const { data: ps } = ids.length
          ? await admin.from('profiles').select('id, username').in('id', ids)
          : { data: [] as any[] };
        const m = new Map<string, string>();
        for (const p of Array.isArray(ps) ? ps : []) {
          if (p?.id) m.set(String(p.id), String(p.username ?? ''));
        }
        return cr.map((r: any) => ({
          report_id: String(r?.id ?? ''),
          created_at: r?.created_at ?? null,
          reporter_name: r?.reporter_id ? m.get(String(r.reporter_id)) ?? null : null,
          target_name: r?.reported_user_id ? m.get(String(r.reported_user_id)) ?? null : null,
          reason: String(r?.report_reason ?? 'unknown'),
          status: String(r?.status ?? 'pending'),
        }));
      }

      const { data: rp, error: rpErr } = await admin
        .from('reports')
        .select(
          'id, created_at, reporter_id, reporter_user_id, reported_user_id, target_user_id, reason, report_reason, report_type, status'
        )
        .order('created_at', { ascending: false })
        .limit(20);
      if (!rpErr && Array.isArray(rp)) {
        const rIds = rp.map((r: any) => r.reporter_id ?? r.reporter_user_id).filter(Boolean);
        const tIds = rp.map((r: any) => r.reported_user_id ?? r.target_user_id).filter(Boolean);
        const ids = Array.from(new Set([...rIds, ...tIds].map(String)));
        const { data: ps } = ids.length
          ? await admin.from('profiles').select('id, username').in('id', ids)
          : { data: [] as any[] };
        const m = new Map<string, string>();
        for (const p of Array.isArray(ps) ? ps : []) {
          if (p?.id) m.set(String(p.id), String(p.username ?? ''));
        }
        return rp.map((r: any) => {
          const reporterId = r?.reporter_id ?? r?.reporter_user_id;
          const targetId = r?.reported_user_id ?? r?.target_user_id;
          const reason = r?.reason ?? r?.report_reason ?? r?.report_type ?? 'unknown';
          return {
            report_id: String(r?.id ?? ''),
            created_at: r?.created_at ?? null,
            reporter_name: reporterId ? m.get(String(reporterId)) ?? null : null,
            target_name: targetId ? m.get(String(targetId)) ?? null : null,
            reason: String(reason),
            status: String(r?.status ?? 'pending'),
          };
        });
      }

      return [];
    };

    const recent_reports = await loadRecentReports();

    return NextResponse.json({
      totals: {
        users: usersCount ?? 0,
        live_streams_active: activeStreamsCount ?? 0,
        gifts_sent_24h: gifts24hCount ?? 0,
        pending_reports: pendingReportsCount ?? 0,
      },
      live_now,
      recent_reports,
      rpc_error: error.message,
    });
  } catch (err) {
    return authErrorToResponse(err);
  }
}
