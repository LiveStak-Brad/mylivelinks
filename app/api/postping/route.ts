import { NextRequest, NextResponse } from 'next/server';

// CORS headers for mobile app requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store, max-age=0',
};

// Handle OPTIONS preflight request
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ ok: true, ts: Date.now() }, { headers: corsHeaders });
}

// POST echo route to confirm POST works fast (no auth, no DB, just echo)
export async function POST(request: NextRequest) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // If body parse fails, still return success (we're just testing POST reachability)
    body = null;
  }

  const receivedKeys =
    body && typeof body === 'object' && !Array.isArray(body)
      ? Object.keys(body as Record<string, unknown>)
      : [];

  return NextResponse.json(
    {
      ok: true,
      ts: Date.now(),
      receivedKeys,
    },
    { status: 200, headers: corsHeaders }
  );
}
