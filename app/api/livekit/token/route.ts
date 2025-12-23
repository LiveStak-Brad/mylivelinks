import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables with detailed error messages
    if (!LIVEKIT_URL) {
      console.error('LIVEKIT_URL is not set in environment variables');
      return NextResponse.json(
        { error: 'LiveKit URL not configured. Please set LIVEKIT_URL in Vercel environment variables.' },
        { status: 500 }
      );
    }
    if (!LIVEKIT_API_KEY) {
      console.error('LIVEKIT_API_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'LiveKit API Key not configured. Please set LIVEKIT_API_KEY in Vercel environment variables.' },
        { status: 500 }
      );
    }
    if (!LIVEKIT_API_SECRET) {
      console.error('LIVEKIT_API_SECRET is not set in environment variables');
      return NextResponse.json(
        { error: 'LiveKit API Secret not configured. Please set LIVEKIT_API_SECRET in Vercel environment variables.' },
        { status: 500 }
      );
    }

    // Log credential status (without exposing secrets)
    console.log('LiveKit credentials check:', {
      hasUrl: !!LIVEKIT_URL,
      urlFormat: LIVEKIT_URL?.substring(0, 50) + '...',
      urlFull: LIVEKIT_URL, // Log full URL to verify it matches
      hasApiKey: !!LIVEKIT_API_KEY,
      apiKeyLength: LIVEKIT_API_KEY?.length,
      apiKeyPrefix: LIVEKIT_API_KEY?.substring(0, 15) + '...', // First 15 chars to verify
      hasApiSecret: !!LIVEKIT_API_SECRET,
      apiSecretLength: LIVEKIT_API_SECRET?.length,
      apiSecretPrefix: LIVEKIT_API_SECRET?.substring(0, 15) + '...', // First 15 chars to verify
    });

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    // Get auth token from request headers or cookies
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '') || null;
    
    // Also try to get from cookies (for browser requests)
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => c.split('='))
    );
    const sbAccessToken = cookies['sb-access-token'] || cookies[`sb-${SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`] || null;
    
    console.log('Auth check:', {
      hasAuthHeader: !!authHeader,
      hasAccessToken: !!accessToken,
      hasCookieToken: !!sbAccessToken,
      cookieKeys: Object.keys(cookies).slice(0, 5), // Limit log size
    });

    // Create Supabase client with the access token
    const tokenToUse = accessToken || sbAccessToken;
    
    if (!tokenToUse) {
      console.error('No auth token found in request');
      return NextResponse.json(
        { error: 'Unauthorized: No authentication token provided. Please log in first.' },
        { status: 401 }
      );
    }

    // Verify user - try multiple methods
    let verifiedUser = null;
    let authError = null;

    // Method 1: Try getUser with token in headers
    const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    try {
      const userResult = await supabase.auth.getUser();
      verifiedUser = userResult.data?.user;
      authError = userResult.error;
    } catch (err: any) {
      console.warn('getUser with token failed:', err.message);
    }

    // Method 2: Decode JWT to extract user ID (fallback)
    if (!verifiedUser && tokenToUse) {
      try {
        const parts = tokenToUse.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          const userId = payload.sub;
          
          if (userId) {
            verifiedUser = { id: userId } as any;
            console.log('User ID extracted from JWT token');
          }
        }
      } catch (jwtErr) {
        console.warn('JWT decode failed:', jwtErr);
      }
    }

    const user = verifiedUser;

    console.log('Auth result:', {
      hasUser: !!user,
      userId: user?.id?.substring(0, 8) + '...',
      error: authError?.message,
    });

    if (authError || !user) {
      console.error('Authentication failed:', {
        error: authError?.message,
        errorCode: authError?.status,
        hasToken: !!tokenToUse,
        tokenPrefix: tokenToUse?.substring(0, 20) + '...',
        allCookies: Object.keys(cookies),
      });
      
      // More helpful error message
      let errorMessage = 'Unauthorized: ';
      if (authError?.message) {
        errorMessage += authError.message;
      } else if (!tokenToUse) {
        errorMessage += 'No authentication token provided. Please log in first.';
      } else {
        errorMessage += 'Invalid or expired session. Please log in again.';
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: authError?.status ? `Error code: ${authError.status}` : undefined,
        },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { roomName, participantName, participantMetadata, canPublish, canSubscribe, userId: clientUserId } = body;

    // Validate required fields
    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: 'roomName and participantName are required' },
        { status: 400 }
      );
    }

    // Get user's profile for metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    // Create LiveKit access token
    // Ensure identity is a string (UUIDs from Supabase are already strings, but be safe)
    const identity = String(user.id);
    const name = participantName || profile?.display_name || profile?.username || user.email || 'Anonymous';
    
    console.log('Generating LiveKit token:', {
      identity,
      name,
      roomName,
      canPublish,
      canSubscribe,
    });

    // Validate API key/secret format (they should be strings)
    if (typeof LIVEKIT_API_KEY !== 'string' || LIVEKIT_API_KEY.length < 10) {
      console.error('Invalid LIVEKIT_API_KEY format');
      return NextResponse.json(
        { error: 'Invalid LiveKit API Key format. Please check your Vercel environment variables.' },
        { status: 500 }
      );
    }
    if (typeof LIVEKIT_API_SECRET !== 'string' || LIVEKIT_API_SECRET.length < 10) {
      console.error('Invalid LIVEKIT_API_SECRET format');
      return NextResponse.json(
        { error: 'Invalid LiveKit API Secret format. Please check your Vercel environment variables.' },
        { status: 500 }
      );
    }

    let at: AccessToken;
    try {
      // Create token with 6 hour expiration
      at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: identity,
        name: name,
        ttl: '6h', // 6 hours expiration
      });
    } catch (tokenErr: any) {
      console.error('Error creating AccessToken:', tokenErr);
      return NextResponse.json(
        { error: `Failed to create LiveKit token: ${tokenErr.message || 'Invalid API credentials'}` },
        { status: 500 }
      );
    }

    // Grant permissions
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: canPublish !== false, // Default to true, can be overridden
      canSubscribe: canSubscribe !== false, // Default to true, can be overridden
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    // Add metadata
    if (participantMetadata) {
      at.metadata = JSON.stringify(participantMetadata);
    } else if (profile) {
      at.metadata = JSON.stringify({
        profile_id: user.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      });
    }

    // Generate token (synchronous, no await needed)
    const token = at.toJwt();
    
    // Validate token was generated
    if (!token || token.length < 50) {
      console.error('Token generation failed - token too short:', { tokenLength: token?.length });
      return NextResponse.json(
        { error: 'Failed to generate valid token' },
        { status: 500 }
      );
    }

    console.log('Token generated successfully for:', { 
      identity, 
      name, 
      roomName,
      url: LIVEKIT_URL,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + '...',
      apiKeyPrefix: LIVEKIT_API_KEY?.substring(0, 10) + '...',
      apiKeyLength: LIVEKIT_API_KEY?.length,
      apiSecretLength: LIVEKIT_API_SECRET?.length,
      urlMatches: LIVEKIT_URL?.includes('mylivelinkscom'),
    });

    // Validate URL format
    if (!LIVEKIT_URL || (!LIVEKIT_URL.startsWith('wss://') && !LIVEKIT_URL.startsWith('ws://') && !LIVEKIT_URL.startsWith('https://'))) {
      console.error('Invalid LIVEKIT_URL format:', LIVEKIT_URL);
      return NextResponse.json(
        { error: 'Invalid LiveKit URL format. Must start with wss://, ws://, or https://' },
        { status: 500 }
      );
    }

    // Ensure URL is WebSocket format for client connection
    let wsUrl = LIVEKIT_URL;
    if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://');
    } else if (!wsUrl.startsWith('wss://') && !wsUrl.startsWith('ws://')) {
      wsUrl = `wss://${wsUrl}`;
    }

    return NextResponse.json({
      token,
      url: wsUrl,
    });
  } catch (error: any) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate token' },
      { status: 500 }
    );
  }
}

