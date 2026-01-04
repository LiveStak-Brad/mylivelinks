import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getBaseUrl() {
  return (process.env.OLLAMA_BASE_URL ?? '').trim().replace(/\/$/, '');
}

export async function GET() {
  const baseUrl = getBaseUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { ok: false, baseUrl: null, tagsOk: false, tagsStatus: null, error: 'OLLAMA_BASE_URL not set' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  let tagsStatus: number | null = null;
  let tagsOk = false;

  try {
    const res = await fetch(`${baseUrl}/api/tags`, { cache: 'no-store' });
    tagsStatus = res.status;
    tagsOk = res.ok;
  } catch (error) {
    console.error('[API /api/ollama/health] Proxy error:', error);
  }

  return NextResponse.json(
    {
      ok: true,
      baseUrl,
      tagsOk,
      tagsStatus,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
