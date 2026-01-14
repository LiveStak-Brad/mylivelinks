/**
 * Live Interaction APIs for mobile
 * 
 * Provides follow, gift, and like functionality for live streams.
 * Matches web implementation patterns.
 */

import { supabase } from './supabase';

const API_BASE = 'https://www.mylivelinks.com';

/**
 * Get auth headers for API requests
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  return headers;
}

// ============================================================================
// FOLLOW API
// ============================================================================

export interface FollowResult {
  success: boolean;
  isFollowing: boolean;
  error?: string;
}

/**
 * Toggle follow/unfollow for a profile
 * Uses /api/profile/follow endpoint (same as web)
 */
export async function toggleFollow(targetProfileId: string): Promise<FollowResult> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE}/api/profile/follow`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetProfileId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        isFollowing: false,
        error: data.error || `Request failed: ${response.status}`,
      };
    }

    return {
      success: true,
      isFollowing: data.is_following ?? data.isFollowing ?? false,
    };
  } catch (err: any) {
    console.error('[liveInteractions] toggleFollow error:', err);
    return {
      success: false,
      isFollowing: false,
      error: err.message || 'Failed to toggle follow',
    };
  }
}

/**
 * Check if current user is following a profile
 */
export async function checkFollowStatus(targetProfileId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetProfileId)
      .maybeSingle();

    if (error) {
      console.error('[liveInteractions] checkFollowStatus error:', error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('[liveInteractions] checkFollowStatus error:', err);
    return false;
  }
}

// ============================================================================
// GIFT API
// ============================================================================

export interface SendGiftParams {
  toUserId: string;
  coinsAmount: number;
  giftTypeId?: number;
  streamId?: number;
  roomSlug?: string;
}

export interface SendGiftResult {
  success: boolean;
  giftId?: number;
  coinsSpent?: number;
  diamondsAwarded?: number;
  senderBalance?: {
    coins: number;
    diamonds: number;
  };
  error?: string;
}

/**
 * Send a gift to a user
 * Uses /api/gifts/send endpoint (same as web)
 */
export async function sendGift(params: SendGiftParams): Promise<SendGiftResult> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE}/api/gifts/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        toUserId: params.toUserId,
        coinsAmount: params.coinsAmount,
        giftTypeId: params.giftTypeId,
        streamId: params.streamId,
        roomSlug: params.roomSlug,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Request failed: ${response.status}`,
      };
    }

    return {
      success: true,
      giftId: data.giftId,
      coinsSpent: data.coinsSpent,
      diamondsAwarded: data.diamondsAwarded,
      senderBalance: data.senderBalance,
    };
  } catch (err: any) {
    console.error('[liveInteractions] sendGift error:', err);
    return {
      success: false,
      error: err.message || 'Failed to send gift',
    };
  }
}

/**
 * Get current user's coin balance
 */
export async function getCoinBalance(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('[liveInteractions] getCoinBalance error:', error);
      return 0;
    }

    return data?.coin_balance ?? 0;
  } catch (err) {
    console.error('[liveInteractions] getCoinBalance error:', err);
    return 0;
  }
}

// ============================================================================
// LIKE API (for trending)
// ============================================================================

export interface LikeResult {
  success: boolean;
  isLiked: boolean;
  likesCount: number;
  error?: string;
}

/**
 * Toggle like on a live stream (for trending score)
 * Uses direct supabase calls (same as web useLiveLike hook)
 */
export async function toggleStreamLike(streamId: number): Promise<LikeResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, isLiked: false, likesCount: 0, error: 'Not authenticated' };
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('stream_likes')
      .select('id')
      .eq('live_stream_id', streamId)
      .eq('profile_id', user.id)
      .maybeSingle();

    let isLiked: boolean;

    if (existingLike) {
      // Unlike
      await supabase
        .from('stream_likes')
        .delete()
        .eq('live_stream_id', streamId)
        .eq('profile_id', user.id);
      isLiked = false;
    } else {
      // Like
      await supabase
        .from('stream_likes')
        .insert({
          live_stream_id: streamId,
          profile_id: user.id,
        });
      isLiked = true;
    }

    // Get updated count
    const { count } = await supabase
      .from('stream_likes')
      .select('id', { count: 'exact', head: true })
      .eq('live_stream_id', streamId);

    return {
      success: true,
      isLiked,
      likesCount: count ?? 0,
    };
  } catch (err: any) {
    console.error('[liveInteractions] toggleStreamLike error:', err);
    return {
      success: false,
      isLiked: false,
      likesCount: 0,
      error: err.message || 'Failed to toggle like',
    };
  }
}

/**
 * Check if current user has liked a stream
 */
export async function checkStreamLikeStatus(streamId: number): Promise<{ isLiked: boolean; likesCount: number }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Get likes count
    const { count } = await supabase
      .from('stream_likes')
      .select('id', { count: 'exact', head: true })
      .eq('live_stream_id', streamId);

    if (!user) {
      return { isLiked: false, likesCount: count ?? 0 };
    }

    // Check if user has liked
    const { data: existingLike } = await supabase
      .from('stream_likes')
      .select('id')
      .eq('live_stream_id', streamId)
      .eq('profile_id', user.id)
      .maybeSingle();

    return {
      isLiked: !!existingLike,
      likesCount: count ?? 0,
    };
  } catch (err) {
    console.error('[liveInteractions] checkStreamLikeStatus error:', err);
    return { isLiked: false, likesCount: 0 };
  }
}

// ============================================================================
// VIEWER TRACKING
// ============================================================================

/**
 * Send viewer heartbeat to track active viewers
 */
export async function sendViewerHeartbeat(
  liveStreamId: number,
  viewerId: string,
  isActive: boolean = true
): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    
    await fetch(`${API_BASE}/api/active-viewers/heartbeat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        live_stream_id: liveStreamId,
        viewer_id: viewerId,
        is_active: isActive,
        is_unmuted: true,
        is_visible: true,
        is_subscribed: true,
      }),
    });
  } catch (err) {
    console.error('[liveInteractions] sendViewerHeartbeat error:', err);
  }
}

// ============================================================================
// ACTIVE VIEWERS LIST
// ============================================================================

export interface ActiveViewer {
  profile_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  joined_at: string;
}

/**
 * Get list of active viewers for a stream
 */
export async function getActiveViewers(liveStreamId: number): Promise<ActiveViewer[]> {
  try {
    const { data, error } = await supabase
      .from('active_viewers')
      .select(`
        profile_id,
        joined_at,
        profiles!inner (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('live_stream_id', liveStreamId)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('[liveInteractions] getActiveViewers error:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      profile_id: row.profile_id,
      username: row.profiles?.username || 'Unknown',
      display_name: row.profiles?.display_name,
      avatar_url: row.profiles?.avatar_url,
      joined_at: row.joined_at,
    }));
  } catch (err) {
    console.error('[liveInteractions] getActiveViewers error:', err);
    return [];
  }
}

/**
 * Get viewer count for a stream
 */
export async function getViewerCount(liveStreamId: number): Promise<number> {
  try {
    const response = await fetch(`${API_BASE}/api/active-viewers?live_stream_id=${liveStreamId}`);
    if (!response.ok) return 0;
    
    const data = await response.json();
    return data.viewer_count ?? 0;
  } catch (err) {
    console.error('[liveInteractions] getViewerCount error:', err);
    return 0;
  }
}

// ============================================================================
// TOP GIFTERS
// ============================================================================

export interface TopGifter {
  profile_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  total_coins: number;
}

/**
 * Get top gifters for a stream
 */
export async function getStreamTopGifters(liveStreamId: number, limit: number = 10): Promise<TopGifter[]> {
  try {
    const { data, error } = await supabase.rpc('get_stream_top_gifters', {
      p_live_stream_id: liveStreamId,
      p_limit: limit,
    });

    if (error) {
      console.error('[liveInteractions] getStreamTopGifters error:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      profile_id: row.profile_id,
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      total_coins: row.total_coins ?? 0,
    }));
  } catch (err) {
    console.error('[liveInteractions] getStreamTopGifters error:', err);
    return [];
  }
}
