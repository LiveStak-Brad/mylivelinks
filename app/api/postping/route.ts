import { NextRequest, NextResponse } from 'next/server';

// CORS headers for mobile app requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store, max-age=0',
};

const createReqId = () => {
  try {
    return (globalThis.crypto as any)?.randomUUID?.() ?? Math.random().toString(16).slice(2, 10);
  } catch {
    return Math.random().toString(16).slice(2, 10);
  }
};

// Handle OPTIONS preflight request
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const reqId = createReqId();
  console.log('[POSTPING] request_start', { reqId, method: request.method });
  return NextResponse.json({ ok: true, ts: new Date().toISOString() }, { status: 200, headers: corsHeaders });
}

// POST echo route to confirm POST works fast (no auth, no DB, just echo)
export async function POST(request: NextRequest) {
  const reqId = createReqId();
  console.log('[POSTPING] request_start', { reqId, method: request.method });
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // If body parse fails, still return success (we're just testing POST reachability)
    body = null;
  }

  const keys = Object.keys((body || {}) as any);

  return NextResponse.json(
    {
      ok: true,
      ts: new Date().toISOString(),
      keys,
    },
    { status: 200, headers: corsHeaders }
  );
}
