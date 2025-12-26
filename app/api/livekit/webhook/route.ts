import { NextRequest, NextResponse } from 'next/server';
import { WebhookReceiver } from 'livekit-server-sdk';
import { createClient } from '@/lib/supabase';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

function parseProfileIdFromIdentity(identity: unknown): string | null {
  const raw = String(identity ?? '');
  if (!raw) return null;
  if (raw.startsWith('u_')) {
    const rest = raw.slice(2);
    const profileId = rest.split(':')[0];
    return profileId || null;
  }
  // Backward compatibility: older identities were directly the profile UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return raw;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      console.error('LiveKit credentials not configured');
      return NextResponse.json(
        { error: 'LiveKit credentials not configured' },
        { status: 500 }
      );
    }

    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    // Verify webhook signature
    const receiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    const body = await request.text();
    
    let event;
    try {
      event = await receiver.receive(body, authHeader);
    } catch (error: any) {
      console.error('Webhook signature verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Get Supabase client
    const supabase = createClient();
    const admin = getSupabaseAdmin();

    // Handle different event types
    if (event.event === 'participant_joined' || event.event === 'participant_left') {
      const participant = event.participant;
      const room = event.room;
      
      if (!participant || !room) {
        return NextResponse.json({ error: 'Missing participant or room data' }, { status: 400 });
      }

      // Extract profile_id from participant identity (device-scoped identity: u_<profileId>:...)
      const profileIdFromIdentity = parseProfileIdFromIdentity(participant.identity);
      let profileIdFromMetadata: string | null = null;
      let liveStreamIdFromMetadata: number | null = null;
      try {
        const metadata = participant.metadata ? JSON.parse(participant.metadata) : null;
        if (metadata?.profile_id) profileIdFromMetadata = String(metadata.profile_id);
        if (metadata?.live_stream_id) liveStreamIdFromMetadata = parseInt(String(metadata.live_stream_id), 10);
      } catch {
        // ignore
      }

      const profileId = profileIdFromIdentity || profileIdFromMetadata;
      if (!profileId) {
        return NextResponse.json({ received: true });
      }
      
      // Extract live_stream_id for global room
      // Since we're using a single global room ("live_central"), we need to identify
      // which streamer this participant is watching based on participant identity
      // For viewers: participant.identity is the viewer's profile_id
      // For streamers: participant.identity is the streamer's profile_id
      // We need to find which streamer's tracks this viewer is subscribed to
      let liveStreamId: number | null = liveStreamIdFromMetadata;
      
      // If still no liveStreamId, try to find it from the participant's identity
      // In a global room, we need to determine which streamer this viewer is watching
      // For now, we'll use a heuristic: if participant is publishing, they're a streamer
      // Otherwise, we need to check active_viewers to see which stream they're watching
      if (!liveStreamId && participant.isPublisher) {
        // Participant is a streamer - find their live_stream_id (do not require live_available to handle cleanup)
        const { data: stream } = await admin
          .from('live_streams')
          .select('id')
          .eq('profile_id', profileId)
          .maybeSingle();

        if (stream) {
          liveStreamId = (stream as any).id;
        }
      }

      // If a publisher left, force-cleanup their stream regardless of viewer heartbeat
      if (event.event === 'participant_left' && participant.isPublisher) {
        try {
          await admin
            .from('live_streams')
            .update({ live_available: false, ended_at: new Date().toISOString() })
            .eq('profile_id', profileId);

          await admin
            .from('user_grid_slots')
            .delete()
            .eq('streamer_id', profileId);

          await admin
            .from('room_presence')
            .delete()
            .eq('profile_id', profileId);

          if (liveStreamId) {
            await admin.from('active_viewers').delete().eq('live_stream_id', liveStreamId);
          }

          await (admin.rpc as any)('update_publish_state_from_viewers');
        } catch (cleanupErr) {
          console.error('[WEBHOOK] streamer cleanup error:', cleanupErr);
        }

        return NextResponse.json({ received: true });
      }

      if (!liveStreamId) {
        return NextResponse.json({ received: true });
      }

      if (event.event === 'participant_joined') {
        // Participant joined - create/update active_viewers record
        // Note: We'll rely on the client heartbeat for detailed state
        // This webhook just ensures the record exists
        const { error } = await (supabase.rpc as any)('update_viewer_heartbeat', {
          p_viewer_id: profileId,
          p_live_stream_id: liveStreamId,
          p_is_active: true,
          p_is_unmuted: true,
          p_is_visible: true,
          p_is_subscribed: true,
        });

        if (error) {
          console.error('Error updating viewer heartbeat:', error);
        }

        // Trigger publish state update
        await (supabase.rpc as any)('update_publish_state_from_viewers');
      } else if (event.event === 'participant_left') {
        // Participant left - remove from active_viewers
        const { error } = await supabase
          .from('active_viewers')
          .delete()
          .eq('viewer_id', profileId)
          .eq('live_stream_id', liveStreamId);

        if (error) {
          console.error('Error removing viewer:', error);
        }

        // Trigger publish state update
        await (supabase.rpc as any)('update_publish_state_from_viewers');
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process webhook' },
      { status: 500 }
    );
  }
}


