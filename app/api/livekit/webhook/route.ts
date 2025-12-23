import { NextRequest, NextResponse } from 'next/server';
import { WebhookReceiver } from 'livekit-server-sdk';
import { createClient } from '@/lib/supabase';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

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
      event = receiver.receive(body, authHeader);
    } catch (error: any) {
      console.error('Webhook signature verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Get Supabase client
    const supabase = createClient();

    // Handle different event types
    if (event.event === 'participant_joined' || event.event === 'participant_left') {
      const participant = event.participant;
      const room = event.room;
      
      if (!participant || !room) {
        return NextResponse.json({ error: 'Missing participant or room data' }, { status: 400 });
      }

      // Extract profile_id from participant identity (we use Supabase user ID as LiveKit identity)
      const viewerId = participant.identity;
      
      // Extract live_stream_id from room name (format: "live_central" or "live_stream_{id}")
      // For now, we'll use room name to find the stream
      // In production, you might want to store room -> stream_id mapping
      let liveStreamId: number | null = null;
      
      // Try to extract stream ID from room name if it follows a pattern
      const streamIdMatch = room.name.match(/live_stream_(\d+)/);
      if (streamIdMatch) {
        liveStreamId = parseInt(streamIdMatch[1], 10);
      } else {
        // For "live_central", we need to find the streamer's live_stream_id
        // We can get this from participant metadata or query by profile_id
        try {
          const metadata = participant.metadata ? JSON.parse(participant.metadata) : null;
          if (metadata?.profile_id) {
            // Find the live_stream for this profile
            const { data: stream } = await supabase
              .from('live_streams')
              .select('id')
              .eq('profile_id', metadata.profile_id)
              .eq('live_available', true)
              .single();
            
            if (stream) {
              liveStreamId = stream.id;
            }
          }
        } catch (e) {
          console.error('Error parsing metadata:', e);
        }
      }

      if (!liveStreamId || !viewerId) {
        console.log('Skipping webhook: missing liveStreamId or viewerId', { liveStreamId, viewerId });
        return NextResponse.json({ received: true });
      }

      if (event.event === 'participant_joined') {
        // Participant joined - create/update active_viewers record
        // Note: We'll rely on the client heartbeat for detailed state
        // This webhook just ensures the record exists
        const { error } = await supabase.rpc('update_viewer_heartbeat', {
          p_viewer_id: viewerId,
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
        await supabase.rpc('update_publish_state_from_viewers');
      } else if (event.event === 'participant_left') {
        // Participant left - remove from active_viewers
        const { error } = await supabase
          .from('active_viewers')
          .delete()
          .eq('viewer_id', viewerId)
          .eq('live_stream_id', liveStreamId);

        if (error) {
          console.error('Error removing viewer:', error);
        }

        // Trigger publish state update
        await supabase.rpc('update_publish_state_from_viewers');
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


