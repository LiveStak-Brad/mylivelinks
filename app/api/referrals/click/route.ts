import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getRequestIp, hashDeviceId, hashIp, normalizeReferralCode } from '@/lib/referrals';

type ClickBody = {
  code?: unknown;
  landing_path?: unknown;
  device_id?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    let body: ClickBody;
    try {
      body = (await request.json()) as ClickBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const code = typeof body?.code === 'string' ? normalizeReferralCode(body.code) : '';
    const landingPath = typeof body?.landing_path === 'string' ? body.landing_path.trim() : '';
    const deviceIdRaw = typeof body?.device_id === 'string' ? body.device_id : null;

    if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 });
    if (!landingPath) return NextResponse.json({ error: 'landing_path is required' }, { status: 400 });

    const deviceIdHash = hashDeviceId(deviceIdRaw);
    const ip = getRequestIp(request);
    const ipHash = hashIp(ip);

    const admin = getSupabaseAdmin();

    const now = Date.now();
    const since = new Date(now - 60 * 1000).toISOString();
    const todayUtc = new Date().toISOString().slice(0, 10);

    if (ipHash) {
      const { count, error } = await admin
        .from('referral_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('clicked_at', since);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if ((count ?? 0) >= 30) {
        return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
      }
    }

    if (deviceIdHash) {
      const { count, error } = await admin
        .from('referral_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('device_id', deviceIdHash)
        .eq('clicked_day', todayUtc);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if ((count ?? 0) >= 200) {
        return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
      }

      const { data: existing } = await admin
        .from('referral_clicks')
        .select('id')
        .eq('device_id', deviceIdHash)
        .eq('clicked_day', todayUtc)
        .eq('referral_code', code)
        .order('clicked_at', { ascending: true })
        .limit(1);

      if (Array.isArray(existing) && existing[0]?.id) {
        return NextResponse.json({ click_id: String(existing[0].id) }, { status: 200 });
      }
    }

    const userAgent = request.headers.get('user-agent') || null;

    const { data, error } = await admin
      .from('referral_clicks')
      .insert({
        referral_code: code,
        device_id: deviceIdHash,
        ip_hash: ipHash,
        user_agent: userAgent,
        landing_path: landingPath,
      })
      .select('id')
      .single();

    if (error) {
      if (deviceIdHash && (error as any)?.code === '23505') {
        const { data: existing } = await admin
          .from('referral_clicks')
          .select('id')
          .eq('device_id', deviceIdHash)
          .eq('clicked_day', todayUtc)
          .eq('referral_code', code)
          .order('clicked_at', { ascending: true })
          .limit(1);

        if (Array.isArray(existing) && existing[0]?.id) {
          return NextResponse.json({ click_id: String(existing[0].id) }, { status: 200 });
        }
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const clickId = data?.id ? String(data.id) : null;
    if (!clickId) return NextResponse.json({ error: 'Failed to create click' }, { status: 500 });

    return NextResponse.json({ click_id: clickId }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'MISSING_REFERRAL_HASH_SALT') {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }
    console.error('POST /api/referrals/click error:', err);
    return NextResponse.json({ error: 'Failed to track click' }, { status: 500 });
  }
}
