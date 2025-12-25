import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type GifterLevelRow = {
  level: number;
  min_coins_spent: number;
  badge_name: string | null;
  badge_color: string | null;
  badge_icon_url: string | null;
};

export async function GET() {
  try {
    const adminSupabase = getSupabaseAdmin();

    const { data, error } = await adminSupabase
      .from('gifter_levels')
      .select('level, min_coins_spent, badge_name, badge_color, badge_icon_url')
      .order('level', { ascending: true });

    if (error) {
      console.error('[API] gifter-levels fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch gifter levels' },
        { status: 500 }
      );
    }

    const rows: GifterLevelRow[] = (data || []) as any;

    const levels = rows.map((row, idx) => {
      const next = rows[idx + 1];
      const maxCoinsSpent = next ? next.min_coins_spent - 1 : null;

      return {
        level: row.level,
        name: row.badge_name,
        min_coins_spent: row.min_coins_spent,
        max_coins_spent: maxCoinsSpent,
        badge: row.badge_icon_url,
        color: row.badge_color,
        perks: null,
      };
    });

    return NextResponse.json({
      levels,
      logic_type: 'lifetime',
      source_of_truth:
        'DB: public.gifter_levels (min_coins_spent thresholds) + profiles.total_spent (lifetime coins spent) as used by update_gifter_level()',
    });
  } catch (error) {
    console.error('[API] gifter-levels error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
