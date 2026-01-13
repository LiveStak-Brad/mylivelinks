import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import ProfileShareRedirectClient from './ProfileShareRedirectClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const raw = typeof params?.username === 'string' ? params.username : '';
  const username = raw.trim().toLowerCase();

  const title = username ? `${username} on MyLiveLinks` : 'MyLiveLinks';
  const description = username
    ? `View ${username}'s profile on MyLiveLinks. Share your links, make posts, go live, get paid.`
    : 'MyLiveLinks. Share your links, make posts, go live, get paid.';

  let avatarUrl: string | null = null;
  let resolvedUsername = username;

  if (username) {
    try {
      const admin = getSupabaseAdmin();
      const { data: profile } = await admin
        .from('profiles')
        .select('username, avatar_url')
        .ilike('username', username)
        .maybeSingle();

      resolvedUsername = typeof (profile as any)?.username === 'string' ? String((profile as any).username).trim() : username;
      avatarUrl = (profile as any)?.avatar_url ? String((profile as any).avatar_url) : null;
    } catch {
      // best-effort
    }
  }

  const baseUrl = 'https://mylivelinks.com';
  const ogImage = avatarUrl
    ? `${baseUrl}/api/og/profile?mode=share&username=${encodeURIComponent(resolvedUsername)}&avatar=${encodeURIComponent(avatarUrl)}`
    : `${baseUrl}/api/og?username=${encodeURIComponent(resolvedUsername)}&displayName=${encodeURIComponent(resolvedUsername)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: username ? `${baseUrl}/p/${encodeURIComponent(username)}` : baseUrl,
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

export default async function ProfileSharePage({ params }: { params: { username: string } }) {
  const raw = typeof params?.username === 'string' ? params.username : '';
  const username = raw.trim().toLowerCase();

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-black text-white">
      <ProfileShareRedirectClient username={username || ''} />
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
        <h1 className="text-2xl font-bold mb-2">Opening profile…</h1>
        <p className="text-white/80 mb-8">Redirecting you to the right place.</p>
        {username ? (
          <Link
            className="inline-flex items-center justify-center px-5 py-3 rounded-lg bg-white text-black font-semibold"
            href={`/${encodeURIComponent(username)}`}
          >
            Continue
          </Link>
        ) : (
          <Link className="underline" href="/home">
            Continue
          </Link>
        )}
      </div>
    </main>
  );
}
