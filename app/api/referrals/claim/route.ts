import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/rbac';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { hashDeviceId, normalizeReferralCode } from '@/lib/referrals';

type ClaimBody = {
  code?: unknown;
  click_id?: unknown;
  device_id?: unknown;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request);

    let body: ClaimBody;
    try {
      body = (await request.json()) as ClaimBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const codeRaw = typeof body?.code === 'string' ? body.code : '';
    const code = normalizeReferralCode(codeRaw);
    if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 });

    const clickIdRaw = typeof body?.click_id === 'string' ? body.click_id.trim() : '';
    const clickId = clickIdRaw && isUuid(clickIdRaw) ? clickIdRaw : null;

    const deviceIdRaw = typeof body?.device_id === 'string' ? body.device_id : null;
    const deviceIdHash = hashDeviceId(deviceIdRaw);

    const supabase = createRouteHandlerClient(request);

    const { data, error } = await supabase.rpc('claim_referral', {
      p_code: code,
      p_click_id: clickId,
      p_device_id: deviceIdHash,
    });

    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('unauthorized')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      if (msg.includes('invalid_code')) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
      if (msg.includes('self_referral_not_allowed')) {
        return NextResponse.json({ error: 'Self-referral not allowed' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const referralId = typeof data === 'string' ? data : data ? String(data) : null;
    if (!referralId) return NextResponse.json({ error: 'Failed to claim referral' }, { status: 500 });

    return NextResponse.json({ ok: true, referral_id: referralId }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (msg === 'MISSING_REFERRAL_HASH_SALT') {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }
    console.error('POST /api/referrals/claim error:', err);
    return NextResponse.json({ error: 'Failed to claim referral' }, { status: 500 });
  }
}
