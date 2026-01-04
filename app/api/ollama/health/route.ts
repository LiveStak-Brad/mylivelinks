import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/rbac';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getBaseUrl() {
  return (process.env.OLLAMA_BASE_URL ?? '').trim().replace(/\/$/, '');
}

function authFailure(error: Error) {
  const status = error.message === 'FORBIDDEN' ? 403 : 401;
  const message = status === 403 ? 'Forbidden' : 'Unauthorized';
  return NextResponse.json(
    { ok: false, error: message },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

export async function GET(request: NextRequest) {
  try {
    await requireOwner(request);
  } catch (error: any) {
    return authFailure(error instanceof Error ? error : new Error('UNAUTHORIZED'));
  }

  const baseUrl = getBaseUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { ok: false, tagsOk: false, tagsStatus: null, error: 'OLLAMA_BASE_URL not set' },
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
