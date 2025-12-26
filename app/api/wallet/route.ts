import { NextRequest, NextResponse } from 'next/server';
import { createAuthedRouteHandlerClient, getSessionUser } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAuthedRouteHandlerClient(request);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('coin_balance, earnings_balance')
      .eq('id', user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to load wallet' }, { status: 500 });
    }

    const coinBalance = Number((profile as any)?.coin_balance ?? 0);
    const diamondBalance = Number((profile as any)?.earnings_balance ?? 0);

    return NextResponse.json({
      coin_balance: coinBalance,
      diamond_balance: diamondBalance,
      diamond_usd: diamondBalance / 100,
    });
  } catch (error) {
    console.error('[API] wallet error:', error);
    return NextResponse.json({ error: 'Failed to load wallet' }, { status: 500 });
  }
}
