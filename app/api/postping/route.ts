import { NextRequest, NextResponse } from 'next/server';

// CORS headers for mobile app requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS preflight request
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST echo route to confirm POST works fast (no auth, no DB, just echo)
export async function POST(request: NextRequest) {
  const t0 = Date.now();
  
  let body: any = null;
  try {
    body = await request.json();
  } catch {
    // If body parse fails, still return success (we're just testing POST reachability)
    body = { error: 'invalid_json' };
  }
  
  const elapsed = Date.now() - t0;
  
  return NextResponse.json(
    {
      ok: true,
      ts: new Date().toISOString(),
      elapsed_ms: elapsed,
      echo: body,
    },
    { status: 200, headers: corsHeaders }
  );
}

