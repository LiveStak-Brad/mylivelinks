import { NextRequest, NextResponse } from 'next/server';
import { getLinkSafety } from '@/lib/outboundLinks';

type LinkMetadata = {
  url: string;
  hostname: string | null;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

function pickMeta(content: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = re.exec(content);
    if (m && m[1]) return String(m[1]).trim().replace(/\s+/g, ' ').slice(0, 300);
  }
  return null;
}

function absolutize(baseUrl: string, maybeRelative: string | null) {
  if (!maybeRelative) return null;
  const value = maybeRelative.trim();
  if (!value) return null;
  try {
    const u = new URL(value, baseUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = String(searchParams.get('url') || '').trim();

  const safety = getLinkSafety(url);
  if (!safety.normalizedUrl) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (safety.category === 'blocked') {
    return NextResponse.json({ error: 'Blocked URL' }, { status: 403 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(safety.normalizedUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'MyLiveLinksBot/1.0 (+https://mylivelinks.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    const finalUrl = typeof (res as any)?.url === 'string' ? String((res as any).url) : safety.normalizedUrl;
    const finalSafety = getLinkSafety(finalUrl);
    if (!finalSafety.normalizedUrl || finalSafety.category === 'blocked') {
      return NextResponse.json({ error: 'Blocked URL' }, { status: 403 });
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('text/html')) {
      const out: LinkMetadata = {
        url: finalSafety.normalizedUrl,
        hostname: finalSafety.hostname,
        title: null,
        description: null,
        image: null,
        siteName: finalSafety.hostname,
      };
      return NextResponse.json(out);
    }

    const html = (await res.text()).slice(0, 250_000);

    const title =
      pickMeta(html, [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<title[^>]*>([^<]+)<\/title>/i,
      ]) || null;

    const description =
      pickMeta(html, [
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      ]) || null;

    const imageRaw =
      pickMeta(html, [
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      ]) || null;

    const siteName =
      pickMeta(html, [
        /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      ]) || null;

    const out: LinkMetadata = {
      url: finalSafety.normalizedUrl,
      hostname: finalSafety.hostname,
      title,
      description,
      image: absolutize(finalSafety.normalizedUrl, imageRaw),
      siteName: siteName || finalSafety.hostname,
    };

    return NextResponse.json(out);
  } catch {
    return NextResponse.json({
      url: safety.normalizedUrl,
      hostname: safety.hostname,
      title: null,
      description: null,
      image: null,
      siteName: safety.hostname,
    } satisfies LinkMetadata);
  } finally {
    clearTimeout(timeout);
  }
}
