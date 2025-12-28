import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getRequestIp, hashIp, normalizeReferralCode } from '@/lib/referrals';

export const dynamic = 'force-dynamic';

export default async function InviteUsernamePage({ params }: { params: { username: string } }) {
  const raw = typeof params?.username === 'string' ? params.username : '';
  const username = raw.trim().toLowerCase();

  if (!username) {
    redirect('/signup');
  }

  const admin = getSupabaseAdmin();

  const { data: profile } = await admin
    .from('profiles')
    .select('id, username')
    .ilike('username', username)
    .maybeSingle();

  if (!profile?.id) {
    redirect('/signup');
  }

  const { data: existingCodeRow } = await admin
    .from('referral_codes')
    .select('code')
    .eq('profile_id', profile.id)
    .maybeSingle();

  let code = typeof (existingCodeRow as any)?.code === 'string' ? String((existingCodeRow as any).code) : null;

  if (!code) {
    for (let i = 0; i < 10; i++) {
      const { data: gen } = await admin.rpc('generate_referral_code', { p_length: 8 });
      const candidate = typeof gen === 'string' ? normalizeReferralCode(gen) : '';
      if (!candidate) continue;

      const { error } = await admin.from('referral_codes').insert({ profile_id: profile.id, code: candidate });
      if (!error) {
        code = candidate;
        break;
      }

      if ((error as any)?.code !== '23505') {
        break;
      }
    }
  }

  const h = headers();
  const ip = getRequestIp({ headers: h as any });
  let ipHash: string | null = null;
  try {
    ipHash = hashIp(ip);
  } catch {
    ipHash = null;
  }
  const userAgent = h.get('user-agent') || null;

  if (code) {
    try {
      await admin.from('referral_clicks').insert({
        referral_code: normalizeReferralCode(code),
        ip_hash: ipHash,
        user_agent: userAgent,
        landing_path: `/invite/${username}`,
      });
    } catch {
      // best-effort
    }

    redirect(`/signup?ref=${encodeURIComponent(code)}`);
  }

  redirect('/signup');
}
