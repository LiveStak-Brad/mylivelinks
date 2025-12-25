import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type GifterLevelRow = {
  level: number;
  min_coins_spent: number;
  badge_name: string | null;
};

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient(request);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = getSupabaseAdmin();

    const [{ data: profile, error: profileError }, { data: levelsData, error: levelsError }] =
      await Promise.all([
        adminSupabase
          .from('profiles')
          .select('gifter_level, total_spent')
          .eq('id', user.id)
          .single(),
        adminSupabase
          .from('gifter_levels')
          .select('level, min_coins_spent, badge_name')
          .order('level', { ascending: true }),
      ]);

    if (profileError) {
      console.error('[API] gifter-levels/me profile fetch error:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    if (levelsError) {
      console.error('[API] gifter-levels/me levels fetch error:', levelsError);
      return NextResponse.json(
        { error: 'Failed to fetch gifter levels' },
        { status: 500 }
      );
    }

    const lifetimeCoinsSpent = Number(profile?.total_spent ?? 0);
    const levels: GifterLevelRow[] = ((levelsData || []) as any) ?? [];

    let currentLevel = Number(profile?.gifter_level ?? 0);
    if (profile?.gifter_level === null || profile?.gifter_level === undefined) {
      currentLevel = levels
        .filter((l) => l.min_coins_spent <= lifetimeCoinsSpent)
        .reduce((max, l) => (l.level > max ? l.level : max), 0);
    }

    const currentLevelRow = levels.find((l) => l.level === currentLevel) || null;
    const nextLevelRow = levels.find((l) => l.level > currentLevel) || null;

    const nextLevelAt = nextLevelRow ? Number(nextLevelRow.min_coins_spent) : null;
    const coinsRemainingToNext =
      nextLevelAt === null ? null : Math.max(0, nextLevelAt - lifetimeCoinsSpent);

    return NextResponse.json({
      current_level: currentLevel,
      current_level_name: currentLevelRow?.badge_name ?? null,
      lifetime_coins_spent: lifetimeCoinsSpent,
      next_level_at: nextLevelAt,
      coins_remaining_to_next: coinsRemainingToNext,
    });
  } catch (error) {
    console.error('[API] gifter-levels/me error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
