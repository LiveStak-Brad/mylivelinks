import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * User Analytics API
 * GET /api/user-analytics?profileId=...&range=7d|30d|90d|all
 * 
 * Returns analytics data for a specific user based on their role:
 * - Members: personal stats
 * - Streamers: earnings + performance
 * - Gifters: spending + gift activity
 */

interface AnalyticsResponse {
  // Overview KPIs
  overview: {
    coinsBalance: number;
    diamondsBalance: number;
    totalCoinsSpent: number;
    totalGiftsReceived: number;
    lifetimeDiamondsEarned: number;
    totalGiftsSent: number;
    followerCount: number;
    followingCount: number;
  };
  
  // Wallet data
  wallet: {
    coinsBalance: number;
    diamondsBalance: number;
    diamondsUsd: number;
  };
  
  // Gifting data (as gifter)
  gifting: {
    giftsSentCount: number;
    totalCoinsSpent: number;
    avgGiftSize: number;
    biggestGift: number;
    topCreatorsGifted: Array<{
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string;
      totalCoins: number;
      giftCount: number;
    }>;
  };
  
  // Earnings data (as creator)
  earnings: {
    diamondsEarned: number;
    diamondsOutstanding: number;
    giftsReceivedCount: number;
    avgGiftReceived: number;
    topGifters: Array<{
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string;
      totalCoins: number;
      giftCount: number;
      tierKey: string;
    }>;
  };
  
  // Stream data (if creator)
  streams: {
    totalSessions: number;
    totalMinutes: number;
    avgViewers: number;
    peakViewers: number;
    sessions: Array<{
      id: string;
      date: string;
      duration: number;
      peakViewers: number;
      totalViews: number;
    }>;
  };
  
  // Gifter tier info
  gifterStatus: {
    tierKey: string;
    tierName: string;
    tierColor: string;
    tierIcon: string;
    level: number;
    levelInTier: number;
    tierLevelMax: number;
    isDiamond: boolean;
    progressPct: number;
    lifetimeCoins: number;
    nextLevelCoins: number;
  } | null;
  
  // Time series data
  charts: {
    coinsSpentOverTime: Array<{ label: string; value: number }>;
    diamondsEarnedOverTime: Array<{ label: string; value: number }>;
  };
  
  // Recent transactions
  transactions: Array<{
    id: string;
    date: string;
    type: string;
    coinsDelta: number;
    diamondsDelta: number;
    note: string;
  }>;
  
  // Privacy & permissions
  isOwnProfile: boolean;
  canViewPrivate: boolean;
}

function getDateRange(range: string): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  
  let start: Date;
  switch (range) {
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
    default:
      start = new Date(2020, 0, 1);
      break;
  }
  
  return { start, end };
}

function generateDateLabels(start: Date, end: Date, maxPoints: number = 7): string[] {
  const labels: string[] = [];
  const diff = end.getTime() - start.getTime();
  const daysDiff = Math.ceil(diff / (24 * 60 * 60 * 1000));
  
  const step = Math.max(1, Math.floor(daysDiff / maxPoints));
  
  for (let i = 0; i < daysDiff && labels.length < maxPoints; i += step) {
    const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }
  
  return labels;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const targetProfileId = url.searchParams.get('profileId');
    const range = url.searchParams.get('range') || '30d';
    const { start, end } = getDateRange(range);
    
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    const currentUserId = user?.id || null;
    
    // Determine which profile to load
    const profileId = targetProfileId || currentUserId;
    
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID required' }, { status: 400 });
    }
    
    // Check permissions
    const isOwnProfile = currentUserId === profileId;
    let canViewPrivate = isOwnProfile;
    
    // Check if admin/owner viewing another profile
    if (!isOwnProfile && currentUserId) {
      const { data: isAdmin } = await supabase.rpc('is_app_admin', { p_profile_id: currentUserId });
      const { data: isOwner } = await supabase.rpc('is_owner', { p_profile_id: currentUserId });
      canViewPrivate = isAdmin === true || isOwner === true;
    }
    
    // Load profile data.
    // IMPORTANT: use select('*') so this route remains compatible across schema migrations.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // following_count is not always denormalized in the profiles table.
    // Fall back to computing it from the follows table when possible.
    let followingCount = Number((profile as any).following_count ?? 0);
    if (!Number.isFinite(followingCount) || followingCount <= 0) {
      try {
        const { count } = await supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', profileId);
        if (typeof count === 'number' && Number.isFinite(count)) {
          followingCount = count;
        }
      } catch {
        // ignore
      }
    }
    
    // Initialize response with public data
    const response: AnalyticsResponse = {
      overview: {
        coinsBalance: canViewPrivate ? (profile.coin_balance || 0) : 0,
        diamondsBalance: canViewPrivate ? (profile.earnings_balance || 0) : 0,
        totalCoinsSpent: 0,
        totalGiftsReceived: 0,
        lifetimeDiamondsEarned: 0,
        totalGiftsSent: 0,
        followerCount: profile.follower_count || 0,
        followingCount,
      },
      wallet: {
        coinsBalance: canViewPrivate ? (profile.coin_balance || 0) : 0,
        diamondsBalance: canViewPrivate ? (profile.earnings_balance || 0) : 0,
        diamondsUsd: canViewPrivate ? ((profile.earnings_balance || 0) / 100) : 0,
      },
      gifting: {
        giftsSentCount: 0,
        totalCoinsSpent: 0,
        avgGiftSize: 0,
        biggestGift: 0,
        topCreatorsGifted: [],
      },
      earnings: {
        diamondsEarned: 0,
        diamondsOutstanding: canViewPrivate ? (profile.earnings_balance || 0) : 0,
        giftsReceivedCount: 0,
        avgGiftReceived: 0,
        topGifters: [],
      },
      streams: {
        totalSessions: 0,
        totalMinutes: 0,
        avgViewers: 0,
        peakViewers: 0,
        sessions: [],
      },
      gifterStatus: null,
      charts: {
        coinsSpentOverTime: [],
        diamondsEarnedOverTime: [],
      },
      transactions: [],
      isOwnProfile,
      canViewPrivate,
    };
    
    if (!canViewPrivate) {
      // Return only public data
      return NextResponse.json(response);
    }
    
    // Load private analytics data
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    
    // Gifts sent (as gifter)
    const { data: giftsSent } = await supabase
      .from('gifts')
      .select('id, coin_amount, recipient_id, sent_at')
      .eq('sender_id', profileId)
      .gte('sent_at', startIso)
      .lte('sent_at', endIso);
    
    if (giftsSent) {
      response.gifting.giftsSentCount = giftsSent.length;
      response.gifting.totalCoinsSpent = giftsSent.reduce((sum, g) => sum + ((g as any).coin_amount || 0), 0);
      response.gifting.avgGiftSize = giftsSent.length > 0 
        ? Math.round(response.gifting.totalCoinsSpent / giftsSent.length) 
        : 0;
      response.gifting.biggestGift = Math.max(0, ...giftsSent.map(g => (g as any).coin_amount || 0));
      response.overview.totalCoinsSpent = response.gifting.totalCoinsSpent;
      response.overview.totalGiftsSent = giftsSent.length;
      
      // Aggregate by recipient
      const recipientMap = new Map<string, { coins: number; count: number }>();
      giftsSent.forEach(g => {
        const existing = recipientMap.get(g.recipient_id) || { coins: 0, count: 0 };
        recipientMap.set(g.recipient_id, {
          coins: existing.coins + ((g as any).coin_amount || 0),
          count: existing.count + 1,
        });
      });
      
      // Load recipient profiles
      const recipientIds = Array.from(recipientMap.keys()).slice(0, 10);
      if (recipientIds.length > 0) {
        const { data: recipients } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', recipientIds);
        
        if (recipients) {
          response.gifting.topCreatorsGifted = recipients
            .map(r => ({
              id: r.id,
              username: r.username,
              displayName: r.display_name || r.username,
              avatarUrl: r.avatar_url || '',
              totalCoins: recipientMap.get(r.id)?.coins || 0,
              giftCount: recipientMap.get(r.id)?.count || 0,
            }))
            .sort((a, b) => b.totalCoins - a.totalCoins)
            .slice(0, 5);
        }
      }
    }
    
    // Gifts received (as creator)
    const { data: giftsReceived } = await supabase
      .from('gifts')
      .select('id, coin_amount, sender_id, sent_at')
      .eq('recipient_id', profileId)
      .gte('sent_at', startIso)
      .lte('sent_at', endIso);
    
    if (giftsReceived) {
      response.earnings.giftsReceivedCount = giftsReceived.length;
      // Canonical gift economics: 1:1 coins -> diamonds
      response.earnings.diamondsEarned = giftsReceived.reduce((sum, g) => sum + ((g as any).coin_amount || 0), 0);
      response.earnings.avgGiftReceived = giftsReceived.length > 0 
        ? Math.round(response.earnings.diamondsEarned / giftsReceived.length) 
        : 0;
      response.overview.totalGiftsReceived = giftsReceived.length;
      response.overview.lifetimeDiamondsEarned = response.earnings.diamondsEarned;
      
      // Aggregate by sender
      const senderMap = new Map<string, { coins: number; count: number }>();
      giftsReceived.forEach(g => {
        const existing = senderMap.get(g.sender_id) || { coins: 0, count: 0 };
        senderMap.set(g.sender_id, {
          coins: existing.coins + ((g as any).coin_amount || 0),
          count: existing.count + 1,
        });
      });
      
      // Load sender profiles with gifter tier
      const senderIds = Array.from(senderMap.keys()).slice(0, 10);
      if (senderIds.length > 0) {
        const { data: senders } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', senderIds);
        
        if (senders) {
          // Get gifter status for top gifters
          const gifterStatuses = new Map<string, string>();
          for (const senderId of senderIds.slice(0, 5)) {
            try {
              const statusRes = await fetch(
                `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/gifter-status?profileId=${senderId}`,
                { cache: 'no-store' }
              );
              if (statusRes.ok) {
                const status = await statusRes.json();
                gifterStatuses.set(senderId, status.tier_key || 'starter');
              }
            } catch {
              gifterStatuses.set(senderId, 'starter');
            }
          }
          
          response.earnings.topGifters = senders
            .map(s => ({
              id: s.id,
              username: s.username,
              displayName: s.display_name || s.username,
              avatarUrl: s.avatar_url || '',
              totalCoins: senderMap.get(s.id)?.coins || 0,
              giftCount: senderMap.get(s.id)?.count || 0,
              tierKey: gifterStatuses.get(s.id) || 'starter',
            }))
            .sort((a, b) => b.totalCoins - a.totalCoins)
            .slice(0, 5);
        }
      }
    }
    
    // Load stream sessions if available
    let streams: any[] | null = null;
    try {
      const attempt = await supabase
        .from('live_streams')
        .select('id, created_at, started_at, ended_at, total_viewer_minutes')
        .eq('profile_id', profileId)
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: false });

      if (!attempt.error) streams = (attempt.data as any[]) ?? null;
    } catch {
      streams = null;
    }
    
    if (streams && streams.length > 0) {
      response.streams.totalSessions = streams.length;
      
      let totalMinutes = 0;
      let peakViewers = 0;
      let totalViewers = 0;
      
      const sessions = streams.map(s => {
        const startTime = new Date(s.started_at || s.created_at).getTime();
        const endTime = s.ended_at ? new Date(s.ended_at).getTime() : startTime;
        const duration = Math.round((endTime - startTime) / 60000);
        
        totalMinutes += duration;
        // These fields aren't part of the canonical live_streams schema yet.
        peakViewers = Math.max(peakViewers, 0);
        totalViewers += 0;
        
        return {
          id: s.id,
          date: s.created_at,
          duration: Math.max(0, duration),
          peakViewers: 0,
          totalViews: 0,
        };
      });
      
      response.streams.totalMinutes = totalMinutes;
      response.streams.peakViewers = peakViewers;
      response.streams.avgViewers = streams.length > 0 
        ? Math.round(totalViewers / streams.length) 
        : 0;
      response.streams.sessions = sessions.slice(0, 20);
    }
    
    // Load gifter status
    try {
      const statusRes = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/gifter-status/me`,
        {
          headers: { cookie: cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ') },
          cache: 'no-store',
        }
      );
      if (statusRes.ok) {
        const status = await statusRes.json();
        response.gifterStatus = {
          tierKey: status.tier_key,
          tierName: status.tier_name,
          tierColor: status.tier_color,
          tierIcon: status.tier_icon,
          level: status.level,
          levelInTier: status.level_in_tier,
          tierLevelMax: status.tier_level_max,
          isDiamond: status.is_diamond,
          progressPct: status.progress_pct,
          lifetimeCoins: status.lifetime_coins,
          nextLevelCoins: status.next_level_coins,
        };
      }
    } catch (e) {
      // Gifter status not available
    }
    
    // Generate chart data
    const dateLabels = generateDateLabels(start, end);
    
    // Create time buckets for coins spent
    if (giftsSent && giftsSent.length > 0) {
      const buckets = new Map<string, number>();
      dateLabels.forEach(l => buckets.set(l, 0));
      
      giftsSent.forEach(g => {
        const date = new Date((g as any).sent_at);
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const closest = dateLabels.reduce((prev, curr) => 
          Math.abs(new Date(curr).getTime() - date.getTime()) < Math.abs(new Date(prev).getTime() - date.getTime()) 
            ? curr : prev
        );
        buckets.set(closest, (buckets.get(closest) || 0) + ((g as any).coin_amount || 0));
      });
      
      response.charts.coinsSpentOverTime = dateLabels.map(label => ({
        label,
        value: buckets.get(label) || 0,
      }));
    }
    
    // Create time buckets for diamonds earned
    if (giftsReceived && giftsReceived.length > 0) {
      const buckets = new Map<string, number>();
      dateLabels.forEach(l => buckets.set(l, 0));
      
      giftsReceived.forEach(g => {
        const date = new Date((g as any).sent_at);
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const closest = dateLabels.reduce((prev, curr) => 
          Math.abs(new Date(curr).getTime() - date.getTime()) < Math.abs(new Date(prev).getTime() - date.getTime()) 
            ? curr : prev
        );
        buckets.set(closest, (buckets.get(closest) || 0) + ((g as any).coin_amount || 0));
      });
      
      response.charts.diamondsEarnedOverTime = dateLabels.map(label => ({
        label,
        value: buckets.get(label) || 0,
      }));
    }
    
    // Load recent transactions (last 50)
    let ledgerEntries: any[] | null = null;
    try {
      const le = await supabase
        .from('ledger_entries')
        .select('id, entry_type, delta_coins, delta_diamonds, provider_ref, created_at')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!le.error) ledgerEntries = (le.data as any[]) ?? null;
    } catch {
      ledgerEntries = null;
    }
    
    if (ledgerEntries) {
      response.transactions = ledgerEntries.map(entry => {
        let note = entry.entry_type;
        if (entry.entry_type === 'coin_purchase') note = 'Coin purchase';
        else if (entry.entry_type === 'coin_spend_gift') note = 'Gift sent';
        else if (entry.entry_type === 'diamond_earn') note = 'Gift received';
        else if (entry.entry_type === 'diamond_debit_cashout') note = 'Cashout';
        
        return {
          id: entry.id,
          date: entry.created_at,
          type: entry.entry_type,
          coinsDelta: entry.delta_coins || 0,
          diamondsDelta: entry.delta_diamonds || 0,
          note,
        };
      });
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] user-analytics error:', error);
    const details = error instanceof Error ? error.message : String(error);
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ error: 'Failed to load analytics', details }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}

