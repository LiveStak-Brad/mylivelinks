'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Video, ArrowLeft, Lock, Users } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import LiveRoom from '@/components/LiveRoom';
import LiveRoomErrorBoundary from '@/components/LiveRoomErrorBoundary';
import { Button, Card } from '@/components/ui';
import { createLiveCentralConfig, type RoomConfig } from '@/lib/room-config';

interface RoomData {
  id: string;
  room_key: string;
  slug: string;
  contentRoomId?: string;
  name: string;
  description: string | null;
  room_type: string;
  visibility: string;
  status: string;
  team_id: string | null;
  team_name: string | null;
  team_slug: string | null;
  icon_url: string | null;
  banner_url: string | null;
  background_image: string | null;
  fallback_gradient: string | null;
  grid_size: number;
  chat_enabled: boolean;
  gifting_enabled: boolean;
}

export default function RoomPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const supabase = createClient();
  
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchRoomAndAccess();
    }
  }, [slug]);

  const fetchRoomAndAccess = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      // Check if this is the main Live Central room (handle various slug formats)
      const isLiveCentral = slug === 'live-central' || 
        slug === 'live_central' || 
        slug.toLowerCase() === 'livecentral';

      // Fetch room config via RPC
      const { data: roomConfig, error: roomError } = await supabase.rpc('rpc_get_room_config', {
        p_slug: slug,
      });

      if (roomError || !roomConfig) {
        // If room not found but it's Live Central, use default config
        if (isLiveCentral) {
          setRoom({
            id: 'live-central-default',
            room_key: 'live_central',
            slug: 'live-central',
            name: 'Live Central',
            description: 'The main live streaming room - watch and stream with up to 12 creators!',
            room_type: 'official',
            visibility: 'public',
            status: 'live',
            team_id: null,
            team_name: null,
            team_slug: null,
            icon_url: '/livecentral.png',
            banner_url: null,
            background_image: null,
            fallback_gradient: 'from-purple-600 to-pink-600',
            grid_size: 12,
            chat_enabled: true,
            gifting_enabled: true,
            contentRoomId: 'live-central',
          });
          setHasAccess(true);
          setLoading(false);
          return;
        }
        
        setError('Room not found');
        return;
      }

      setRoom(roomConfig);

      // Check access based on visibility
      if (roomConfig.visibility === 'public') {
        setHasAccess(true);
      } else if (roomConfig.visibility === 'team_only') {
        // Check if user is a team member
        if (!user) {
          setHasAccess(false);
        } else if (roomConfig.team_id) {
          const { data: membership } = await supabase
            .from('team_memberships')
            .select('status')
            .eq('team_id', roomConfig.team_id)
            .eq('profile_id', user.id)
            .eq('status', 'approved')
            .single();
          setHasAccess(!!membership);
        } else {
          setHasAccess(false);
        }
      } else {
        setHasAccess(false);
      }
    } catch (err) {
      setError('Failed to load room');
    } finally {
      setLoading(false);
    }
  };

  // Create room config for LiveRoom component
  const roomConfig: RoomConfig | undefined = useMemo(() => {
    if (!room) return undefined;
    
    // Use 'live_central' (underscore) for LiveKit room name to match existing setup
    const roomId = room.room_key === 'live_central' || room.slug === 'live-central' 
      ? 'live_central' 
      : (room.slug || room.room_key);

    const contentRoomId = room.room_key === 'live_central' || room.slug === 'live-central'
      ? 'live-central'
      : (room.slug || room.room_key);
    
    return {
      roomId,
      contentRoomId,
      type: room.room_type as 'live_central' | 'team' | 'official' | 'private',
      branding: {
        name: room.name,
        description: room.description ?? undefined,
        iconUrl: room.icon_url ?? undefined,
        bannerUrl: room.banner_url ?? undefined,
        backgroundUrl: room.background_image ?? undefined,
        fallbackGradient: room.fallback_gradient ?? undefined,
      },
      permissions: {
        canView: () => hasAccess,
        canPublish: () => true, // Server will enforce actual permissions
        canModerate: () => false,
      },
      teamId: room.team_id ?? undefined,
      teamSlug: room.team_slug ?? undefined,
      gridSize: room.grid_size,
    };
  }, [room, hasAccess]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse">
            <Video className="w-8 h-8 text-white" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading room...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center border-0 shadow-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-destructive via-destructive/70 to-destructive" />
          <div className="p-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-muted flex items-center justify-center">
              <Video className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Room Not Found</h2>
            <p className="text-muted-foreground mb-6">
              {error || "This room doesn't exist or has been removed."}
            </p>
            <Link href="/liveTV">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to LiveTV
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // No access (private room)
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center border-0 shadow-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500" />
          <div className="p-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Lock className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Team Room</h2>
            <p className="text-muted-foreground mb-6">
              This room is only accessible to members of{' '}
              <span className="font-semibold text-foreground">{room.team_name || 'the team'}</span>.
            </p>
            {room.team_slug && (
              <Link href={`/teams/${room.team_slug}`}>
                <Button className="gap-2 bg-gradient-to-r from-primary to-accent">
                  <Users className="w-4 h-4" />
                  View Team
                </Button>
              </Link>
            )}
            <div className="mt-4">
              <Link href="/liveTV">
                <Button variant="ghost" className="gap-2 text-muted-foreground">
                  <ArrowLeft className="w-4 h-4" />
                  Back to LiveTV
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Render the room
  return (
    <LiveRoomErrorBoundary>
      <LiveRoom roomConfig={roomConfig} />
    </LiveRoomErrorBoundary>
  );
}
