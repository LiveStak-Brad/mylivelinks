import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Stream Cleanup API
 * Called via sendBeacon when user closes tab or navigates away while streaming
 * This ensures streams are properly ended even on sudden page closure
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({} as any));
    const { action, reason } = body as { action?: string; reason?: string };

    if (action !== 'end_stream') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Create Supabase client
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

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

    let user: any = null;
    let authError: any = null;

    if (bearerToken) {
      const admin = getSupabaseAdmin();
      const result = await (admin.auth as any).getUser(bearerToken);
      user = result?.data?.user || null;
      authError = result?.error || null;
    } else {
      const result = await supabase.auth.getUser();
      user = result.data?.user || null;
      authError = result.error || null;
    }

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile_id = user.id;

    console.log('[STREAM-CLEANUP] Ending stream for profile:', {
      profile_id,
      reason: reason || null,
    });

    const admin = getSupabaseAdmin();

    // Update live_streams table (service role to bypass RLS)
    const { error: updateError } = await admin
      .from('live_streams')
      .update({ 
        live_available: false, 
        ended_at: new Date().toISOString() 
      })
      .eq('profile_id', profile_id);

    if (updateError) {
      console.error('[STREAM-CLEANUP] Error updating live_streams:', updateError);
    }

    // Remove from user_grid_slots (service role to remove from ALL viewers)
    const { error: deleteError } = await admin
      .from('user_grid_slots')
      .delete()
      .eq('streamer_id', profile_id);

    if (deleteError) {
      console.error('[STREAM-CLEANUP] Error deleting grid slots:', deleteError);
    }

    // Remove from room_presence if exists
    const { error: presenceError } = await admin
      .from('room_presence')
      .delete()
      .eq('profile_id', profile_id);

    if (presenceError) {
      console.error('[STREAM-CLEANUP] Error removing room presence:', presenceError);
    }

    // Remove from active_viewers (service role) so viewer counts/tiles don't stick
    try {
      const { data: streamIds } = await admin
        .from('live_streams')
        .select('id')
        .eq('profile_id', profile_id)
        .limit(25);

      const ids = (streamIds || [])
        .map((r: any) => Number(r?.id))
        .filter((v: any) => Number.isFinite(v));

      // Best-effort: schema may support streamer_id and/or live_stream_id
      await admin.from('active_viewers').delete().eq('streamer_id', profile_id);
      if (ids.length > 0) {
        await admin.from('active_viewers').delete().in('live_stream_id', ids);
      }

      // Best-effort: update publish flags based on current viewers
      try {
        await (admin.rpc as any)('update_publish_state_from_viewers');
      } catch {
        // ignore
      }
    } catch (avErr) {
      console.error('[STREAM-CLEANUP] Error removing active viewers:', avErr);
    }

    console.log('[STREAM-CLEANUP] Successfully cleaned up stream for:', profile_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[STREAM-CLEANUP] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle preflight for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
