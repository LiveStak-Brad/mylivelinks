import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getRequestIp, hashIp, normalizeReferralCode } from '@/lib/referrals';
import InviteRedirectClient from './InviteRedirectClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const raw = typeof params?.username === 'string' ? params.username : '';
  const username = raw.trim().toLowerCase();

  const title = username ? `Join ${username} on MyLiveLinks` : 'Join on MyLiveLinks';
  const description = username
    ? `Join ${username} on MyLiveLinks. Share your links, make posts, go live, get paid.`
    : 'Join MyLiveLinks. Share your links, make posts, go live, get paid.';

  const ogImage = username
    ? `https://mylivelinks.com/api/og?mode=invite&username=${encodeURIComponent(username)}&displayName=${encodeURIComponent(username)}&bio=${encodeURIComponent(
        `Join ${username} on MyLiveLinks`
      )}`
    : 'https://mylivelinks.com/mylivelinksmeta.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: username ? `https://mylivelinks.com/invite/${encodeURIComponent(username)}` : 'https://mylivelinks.com/join',
      siteName: 'MyLiveLinks',
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function InviteUsernamePage({ params }: { params: { username: string } }) {
  const raw = typeof params?.username === 'string' ? params.username : '';
  const username = raw.trim().toLowerCase();

  let targetUrl = '/signup';
  let displayUsername = username;

  if (!username) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-black text-white">
        <div className="w-full max-w-lg text-center">
          <div className="flex items-center justify-center mb-6">
            <Image
              src="/branding/mylivelinkstransparent.png"
              alt="MyLiveLinks"
              width={220}
              height={220}
              priority
            />
          </div>
          <h1 className="text-2xl font-bold mb-2">Join on MyLiveLinks</h1>
          <p className="text-white/80 mb-8">Redirecting…</p>
          <Link className="underline" href="/signup">
            Continue
          </Link>
        </div>
      </main>
    );
  }

  const admin = getSupabaseAdmin();

  const { data: profile } = await admin
    .from('profiles')
    .select('id, username')
    .ilike('username', username)
    .maybeSingle();

  if (!profile?.id) {
    targetUrl = '/signup';
  } else {
    displayUsername = typeof (profile as any)?.username === 'string' ? String((profile as any).username) : username;
  }

  if (profile?.id) {
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
      let clickId: string | null = null;
      try {
        const { data: clickRow } = await admin
          .from('referral_clicks')
          .insert({
            referral_code: normalizeReferralCode(code),
            ip_hash: ipHash,
            user_agent: userAgent,
            landing_path: `/invite/${username}`,
          })
          .select('id')
          .single();
        clickId = clickRow?.id ? String(clickRow.id) : null;
      } catch {
        // best-effort
      }

      targetUrl = `/signup?ref=${encodeURIComponent(code)}${clickId ? `&click_id=${encodeURIComponent(clickId)}` : ''}`;
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-black text-white">
      <InviteRedirectClient to={targetUrl} />
      <div className="w-full max-w-lg text-center">
        <div className="flex items-center justify-center mb-6">
          <Image
            src="/branding/mylivelinkstransparent.png"
            alt="MyLiveLinks"
            width={220}
            height={220}
            priority
          />
        </div>
        <h1 className="text-2xl font-bold mb-2">Join {displayUsername} on MyLiveLinks</h1>
        <p className="text-white/80 mb-8">Redirecting you to sign up…</p>
        <p className="text-white/60 text-sm mb-6">
          If you’re not redirected automatically, click continue.
        </p>
        <Link className="inline-flex items-center justify-center px-5 py-3 rounded-lg bg-white text-black font-semibold" href={targetUrl}>
          Continue
        </Link>
      </div>
    </main>
  );
}
