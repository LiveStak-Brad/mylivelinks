import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest, context: { params: { postId: string } }) {
  const fallbackRequestId = crypto.randomUUID();

  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const postId = context.params.postId;

    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const coins = typeof body?.coins === 'number' ? body.coins : null;
    if (!coins || !Number.isFinite(coins) || coins <= 0 || Math.floor(coins) !== coins) {
      return NextResponse.json({ error: 'coins must be a positive integer' }, { status: 400 });
    }

    const headerKey = request.headers.get('idempotency-key');
    const requestId = typeof body?.request_id === 'string' && body.request_id.length ? body.request_id : (headerKey && headerKey.length ? headerKey : fallbackRequestId);

    const admin = getSupabaseAdmin();

    const { data, error } = await admin.rpc('gift_post', {
      p_post_id: postId,
      p_sender_id: user.id,
      p_coins_amount: coins,
      p_request_id: requestId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ gift: data }, { status: 200 });
  } catch (err) {
    console.error('POST /api/posts/[postId]/gift error:', err);
    return NextResponse.json({ error: 'Failed to gift post' }, { status: 500 });
  }
}
