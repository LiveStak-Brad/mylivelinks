'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Sparkles, Users, TrendingUp, Filter, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button, Input, Badge, Card, CardContent, EmptyState, Skeleton } from '@/components/ui';
import Image from 'next/image';
import Link from 'next/link';

interface Room {
  id: string;
  slug: string;
  display_name: string | null;
  description: string | null;
  thumbnail_url: string | null;
  is_live: boolean;
  viewer_count: number;
  category: string | null;
  tags: string[] | null;
}

/**
 * ROOMS BROWSE PAGE
 * 
 * Public directory of all live streaming rooms.
 * Features:
 * - Grid of room cards
 * - Live status indicators
 * - Viewer counts
 * - Search and filter (UI only for now)
 * - Click to join room
 * 
 * Route: /rooms
 */
export default function RoomsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLiveOnly, setFilterLiveOnly] = useState(false);

  useEffect(() => {
    loadRooms();
  }, [filterLiveOnly]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('rooms')
        .select(`
          id,
          slug,
          display_name,
          description,
          thumbnail_url,
          is_live,
          viewer_count,
          category,
          tags
        `)
        .eq('is_published', true)
        .order('is_live', { ascending: false })
        .order('viewer_count', { ascending: false });

      if (filterLiveOnly) {
        query = query.eq('is_live', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRooms(data || []);
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter(room => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (room.display_name ?? '').toLowerCase().includes(query) ||
      room.description?.toLowerCase().includes(query) ||
      room.category?.toLowerCase().includes(query) ||
      (Array.isArray(room.tags) ? room.tags : []).some(tag => (tag ?? '').toLowerCase().includes(query))
    );
  });

  return (
    <main 
      id="main"
      className="min-h-[calc(100vh-7rem)] bg-background pb-24 md:pb-8"
    >
      <div className="container mx-auto px-4 py-6 sm:py-8">
        
        {/* Page Header */}
        <header className="mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Video className="w-6 h-6 text-primary" aria-hidden="true" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Live Rooms
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Discover and join live streaming rooms
          </p>
        </header>

        {/* Filters & Search */}
        <div className="mb-6 space-y-3 animate-slide-up">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={filterLiveOnly ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterLiveOnly(!filterLiveOnly)}
              className="gap-2"
            >
              <div className={`w-2 h-2 rounded-full ${filterLiveOnly ? 'bg-white' : 'bg-red-500'} animate-pulse`} />
              Live Now
            </Button>

            <Badge variant="secondary" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {filteredRooms.length} {filteredRooms.length === 1 ? 'Room' : 'Rooms'}
            </Badge>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="w-full aspect-video" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredRooms.length === 0 && (
          <div className="animate-fade-in">
            <EmptyState
              icon={<Video className="w-16 h-16" />}
              title={filterLiveOnly ? "No rooms are live right now" : "No rooms found"}
              description={
                searchQuery
                  ? "Try adjusting your search or filters"
                  : filterLiveOnly
                  ? "Check back soon for live streams"
                  : "Rooms will appear here once they're created"
              }
              action={
                filterLiveOnly || searchQuery
                  ? {
                      label: "Clear Filters",
                      onClick: () => {
                        setFilterLiveOnly(false);
                        setSearchQuery('');
                      }
                    }
                  : undefined
              }
            />
          </div>
        )}

        {/* Rooms Grid */}
        {!loading && filteredRooms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
            {filteredRooms.map((room) => (
              <Link
                key={room.id}
                href={`/rooms/${room.slug}`}
                className="group"
              >
                <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1 h-full">
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-muted overflow-hidden">
                    {room.thumbnail_url ? (
                      <Image
                        src={room.thumbnail_url}
                        alt={room.display_name || 'Room thumbnail'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <Video className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* Live Badge */}
                    {room.is_live && (
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        LIVE
                      </div>
                    )}

                    {/* Viewer Count */}
                    {room.is_live && room.viewer_count > 0 && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-full">
                        <Users className="w-3 h-3" />
                        {room.viewer_count}
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                  </div>

                  {/* Content */}
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                      {room.display_name || 'Untitled room'}
                    </h3>
                    
                    {room.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {room.description}
                      </p>
                    )}

                    {/* Category/Tags */}
                    {(room.category || (Array.isArray(room.tags) && room.tags.length > 0)) && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        {room.category && (
                          <Badge variant="secondary" className="text-xs">
                            {room.category}
                          </Badge>
                        )}
                        {(Array.isArray(room.tags) ? room.tags : []).slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Coming Soon Notice */}
        {!loading && filteredRooms.length === 0 && !filterLiveOnly && !searchQuery && (
          <div className="mt-8 text-center">
            <Card className="max-w-md mx-auto">
              <CardContent className="p-6 space-y-3">
                <div className="flex justify-center">
                  <Sparkles className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Rooms Coming Soon</h3>
                <p className="text-sm text-muted-foreground">
                  We're preparing an amazing lineup of live rooms for you. Check back soon!
                </p>
                <Button
                  onClick={() => router.push('/live')}
                  variant="primary"
                  className="w-full"
                >
                  Explore Live Streams Instead
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}

