import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

/**
 * GET /api/admin/referrals/overview
 * 
 * Returns global referral analytics for owner panel:
 * - Total clicks, signups, activations
 * - Top referrers leaderboard
 * - Recent referral activity feed
 * 
 * Access: Owner/Admin only
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const admin = getSupabaseAdmin();

    // 1. Get global totals
    const [
      { count: totalClicks },
      { count: totalSignups },
      { count: totalActivations }
    ] = await Promise.all([
      admin
        .from('referral_clicks')
        .select('id', { count: 'exact', head: true }),
      admin
        .from('referrals')
        .select('id', { count: 'exact', head: true }),
      admin
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .not('activated_at', 'is', null)
    ]);

    const clicks = totalClicks ?? 0;
    const signups = totalSignups ?? 0;
    const activations = totalActivations ?? 0;
    const activationRate = signups > 0 ? (activations / signups) * 100 : 0;

    // 2. Get top referrers leaderboard (top 50)
    const { data: rollups, error: rollupsError } = await admin
      .from('referral_rollups')
      .select(`
        referrer_profile_id,
        click_count,
        referral_count,
        activation_count,
        profiles!referral_rollups_referrer_profile_id_fkey(
          username,
          avatar_url,
          display_name
        )
      `)
      .order('activation_count', { ascending: false })
      .order('referral_count', { ascending: false })
      .limit(50);

    if (rollupsError) {
      console.error('Error fetching referral rollups:', rollupsError);
      return NextResponse.json({ error: rollupsError.message }, { status: 500 });
    }

    const leaderboard = (rollups ?? []).map((r: any, idx: number) => ({
      rank: idx + 1,
      profile_id: r.referrer_profile_id,
      username: r.profiles?.username ?? 'Unknown',
      avatar_url: r.profiles?.avatar_url ?? null,
      display_name: r.profiles?.display_name ?? null,
      clicks: Number(r.click_count ?? 0),
      signups: Number(r.referral_count ?? 0),
      activations: Number(r.activation_count ?? 0),
    }));

    // 3. Get recent referral activity (last 100 events)
    const { data: activityData, error: activityError } = await admin
      .from('referral_activity')
      .select(`
        id,
        event_type,
        created_at,
        referrer_profile_id,
        referred_profile_id,
        referrer:referrer_profile_id(username, avatar_url),
        referred:referred_profile_id(username, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (activityError) {
      console.error('Error fetching referral activity:', activityError);
      return NextResponse.json({ error: activityError.message }, { status: 500 });
    }

    // Map activity to unified format
    const recentActivity = (activityData ?? []).map((a: any) => {
      let action: 'click' | 'signup' | 'activation' = 'signup';
      
      if (a.event_type === 'activated' || a.event_type === 'profile_completed' || a.event_type === 'first_post_created') {
        action = 'activation';
      }

      return {
        id: a.id,
        type: action,
        referrer_username: a.referrer?.username ?? 'Unknown',
        referrer_avatar_url: a.referrer?.avatar_url ?? null,
        referred_username: a.referred?.username ?? null,
        referred_avatar_url: a.referred?.avatar_url ?? null,
        created_at: a.created_at,
        event_type: a.event_type,
      };
    });

    // 4. Get recent clicks for activity feed (last 50)
    const { data: clicksData, error: clicksError } = await admin
      .from('referral_clicks')
      .select(`
        id,
        clicked_at,
        referrer_profile_id,
        referrer:referrer_profile_id(username, avatar_url)
      `)
      .not('referrer_profile_id', 'is', null)
      .order('clicked_at', { ascending: false })
      .limit(50);

    if (!clicksError && clicksData) {
      const clickActivity = clicksData.map((c: any) => ({
        id: c.id,
        type: 'click' as const,
        referrer_username: c.referrer?.username ?? 'Unknown',
        referrer_avatar_url: c.referrer?.avatar_url ?? null,
        referred_username: null,
        referred_avatar_url: null,
        created_at: c.clicked_at,
        event_type: 'click',
      }));

      // Merge and sort all activity
      recentActivity.push(...clickActivity);
      recentActivity.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    // Limit to 100 most recent combined events
    const limitedActivity = recentActivity.slice(0, 100);

    return NextResponse.json({
      totals: {
        clicks,
        signups,
        activations,
        activation_rate: Math.round(activationRate * 100) / 100,
      },
      leaderboard,
      recent_activity: limitedActivity,
    });

  } catch (err) {
    console.error('Referrals overview error:', err);
    return authErrorToResponse(err);
  }
}

