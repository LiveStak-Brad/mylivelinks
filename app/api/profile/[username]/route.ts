import { createAuthedRouteHandlerClient } from '@/lib/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getGifterStatus } from '@/lib/gifter-status';

/**
 * GET /api/profile/[username]
 * Fetch complete public profile data (single query)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const supabase = createAuthedRouteHandlerClient(request);
  
  try {
    const { username } = params;
    
    // Get current user (optional - for relationship status)
    const { data: { user } } = await supabase.auth.getUser();
    const viewerId = user?.id || null;

    let viewerIsAdmin = false;
    if (viewerId) {
      try {
        const { data: isAdmin } = await supabase.rpc('is_admin', { uid: viewerId });
        viewerIsAdmin = isAdmin === true;
      } catch {
        viewerIsAdmin = false;
      }
    }
    
    // Detect platform from user agent (mobile vs web)
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
    const platform = isMobile ? 'mobile' : 'web';
    
    // Call RPC function to get complete profile with adult filtering
    const { data, error } = await supabase.rpc('get_public_profile_with_adult_filtering', {
      p_username: username,
      p_viewer_id: viewerId,
      p_platform: platform
    });
    
    if (error) {
      console.error('Profile fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }
    
    if (!data || data.error) {
      return NextResponse.json(
        { error: data?.error || 'Profile not found' },
        { status: 404 }
      );
    }

    const profileId = String((data as any)?.profile?.id ?? '');
    const totalSpent = Number((data as any)?.profile?.total_spent ?? 0);
    const totalGiftsReceived = Number((data as any)?.profile?.total_gifts_received ?? 0);

    const gifter_statuses: Record<string, any> = {};
    try {
      const topSupporters = Array.isArray((data as any)?.top_supporters)
        ? ((data as any).top_supporters as any[])
        : [];
      const ids = Array.from(
        new Set([
          profileId,
          ...topSupporters
            .map((s) => String((s as any)?.id ?? ''))
            .filter((id) => typeof id === 'string' && id.length > 0),
        ].filter((id) => typeof id === 'string' && id.length > 0))
      );

      if (ids.length > 0) {
        const { data: rows, error: rowsErr } = await supabase
          .from('profiles')
          .select('id, lifetime_coins_gifted, profile_type')
          .in('id', ids);

        if (!rowsErr && Array.isArray(rows)) {
          for (const row of rows) {
            const id = String((row as any)?.id ?? '');
            if (!id) continue;
            const lifetimeCoins = Number((row as any)?.lifetime_coins_gifted ?? 0);
            gifter_statuses[id] = getGifterStatus(lifetimeCoins, { is_admin: viewerIsAdmin });

            if (
              id === profileId &&
              (data as any)?.profile &&
              ((data as any).profile as any).profile_type == null
            ) {
              ((data as any).profile as any).profile_type = (row as any)?.profile_type ?? null;
            }
          }
        }
      }
    } catch {
      // ignore
    }

    let gifter_rank = 0;
    let streamer_rank = 0;
    let streak_days = 0;

    if (Number.isFinite(totalSpent) && totalSpent > 0) {
      try {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gt('total_spent', totalSpent);

        if (typeof count === 'number' && Number.isFinite(count)) {
          gifter_rank = count + 1;
        }
      } catch {
        gifter_rank = 0;
      }
    }

    if (Number.isFinite(totalGiftsReceived) && totalGiftsReceived > 0) {
      try {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gt('total_gifts_received', totalGiftsReceived);

        if (typeof count === 'number' && Number.isFinite(count)) {
          streamer_rank = count + 1;
        }
      } catch {
        streamer_rank = 0;
      }
    }

    if (profileId) {
      const now = new Date();
      const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const sinceUtc = new Date(todayUtc.getTime() - 60 * 24 * 60 * 60 * 1000);
      const sinceIso = sinceUtc.toISOString();

      const activityDates = new Set<string>();
      const pushTs = (ts: unknown) => {
        if (!ts) return;
        const d = new Date(String(ts));
        if (Number.isNaN(d.getTime())) return;
        activityDates.add(d.toISOString().slice(0, 10));
      };

      try {
        const { data: giftRows, error: giftErr } = await supabase
          .from('gifts')
          .select('sent_at')
          .or(`sender_id.eq.${profileId},recipient_id.eq.${profileId}`)
          .gte('sent_at', sinceIso)
          .limit(2000);
        if (!giftErr && Array.isArray(giftRows)) {
          for (const r of giftRows) pushTs((r as any)?.sent_at);
        }
      } catch {
        // ignore
      }

      try {
        const { data: ledgerRows, error: ledgerErr } = await supabase
          .from('ledger_entries')
          .select('created_at')
          .eq('user_id', profileId)
          .gte('created_at', sinceIso)
          .limit(2000);
        if (!ledgerErr && Array.isArray(ledgerRows)) {
          for (const r of ledgerRows) pushTs((r as any)?.created_at);
        }
      } catch {
        // ignore
      }

      try {
        const { data: chatRows, error: chatErr } = await supabase
          .from('chat_messages')
          .select('created_at')
          .eq('profile_id', profileId)
          .gte('created_at', sinceIso)
          .limit(2000);
        if (!chatErr && Array.isArray(chatRows)) {
          for (const r of chatRows) pushTs((r as any)?.created_at);
        }
      } catch {
        // ignore
      }

      let count = 0;
      for (let i = 0; i < 60; i++) {
        const day = new Date(todayUtc.getTime() - i * 24 * 60 * 60 * 1000);
        const key = day.toISOString().slice(0, 10);
        if (!activityDates.has(key)) break;
        count++;
      }
      streak_days = count;
    }

    return NextResponse.json(
      {
        ...(data as any),
        gifter_statuses,
        streak_days,
        gifter_rank,
        streamer_rank,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
