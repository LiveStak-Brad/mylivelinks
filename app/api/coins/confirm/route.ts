import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Purchases are finalized by Stripe webhook only.
    // This endpoint is intentionally disabled to prevent a second credit path.
    return NextResponse.json(
      {
        error: 'Purchase confirmation disabled',
        message: 'Purchases are finalized by Stripe webhook only.',
      },
      { status: 410 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Confirm failed', message }, { status: 500 });
  }
}
