export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getBaseUrl() {
  return (process.env.OLLAMA_BASE_URL ?? '').trim().replace(/\/$/, '');
}

export async function GET() {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    return new Response(JSON.stringify({ error: 'OLLAMA_BASE_URL not set' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  try {
    const upstream = await fetch(`${baseUrl}/api/tags`, { cache: 'no-store' });

    const headers = new Headers();
    const contentType = upstream.headers.get('content-type');
    if (contentType) headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'no-store');

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error('[API /api/ollama/tags] Proxy error:', error);
    return new Response(JSON.stringify({ error: 'Failed to reach Ollama upstream' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
}
