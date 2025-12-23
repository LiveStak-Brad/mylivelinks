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

    // Handle different event types
    if (event.event === 'participant_joined' || event.event === 'participant_left') {
      const participant = event.participant;
      const room = event.room;
      
      if (!participant || !room) {
        return NextResponse.json({ error: 'Missing participant or room data' }, { status: 400 });
      }

      // Extract profile_id from participant identity (we use Supabase user ID as LiveKit identity)
      const viewerId = participant.identity;
      
      // Extract live_stream_id for global room
      // Since we're using a single global room ("live_central"), we need to identify
      // which streamer this participant is watching based on participant identity
      // For viewers: participant.identity is the viewer's profile_id
      // For streamers: participant.identity is the streamer's profile_id
      // We need to find which streamer's tracks this viewer is subscribed to
      let liveStreamId: number | null = null;
      
      // Try to get stream ID from participant metadata first
      try {
        const metadata = participant.metadata ? JSON.parse(participant.metadata) : null;
        if (metadata?.live_stream_id) {
          liveStreamId = parseInt(metadata.live_stream_id, 10);
        } else if (metadata?.profile_id) {
          // If metadata has profile_id but no live_stream_id, find the stream
          // This handles the case where a streamer joins
          const { data: stream } = await supabase
            .from('live_streams')
            .select('id')
            .eq('profile_id', metadata.profile_id)
            .eq('live_available', true)
            .single();
          
          if (stream) {
            liveStreamId = (stream as any).id;
          }
        }
      } catch (e) {
        console.error('Error parsing metadata:', e);
      }
      
      // If still no liveStreamId, try to find it from the participant's identity
      // In a global room, we need to determine which streamer this viewer is watching
      // For now, we'll use a heuristic: if participant is publishing, they're a streamer
      // Otherwise, we need to check active_viewers to see which stream they're watching
      if (!liveStreamId && participant.isPublisher) {
        // Participant is a streamer - find their live_stream_id
        const { data: stream } = await supabase
          .from('live_streams')
          .select('id')
          .eq('profile_id', viewerId)
          .eq('live_available', true)
          .single();
        
        if (stream) {
          liveStreamId = (stream as any).id;
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
        const { error } = await (supabase.rpc as any)('update_viewer_heartbeat', {
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
        await (supabase.rpc as any)('update_publish_state_from_viewers');
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


