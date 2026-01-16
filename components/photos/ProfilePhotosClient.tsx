'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Grid, Tag } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, Button, Card } from '@/components/ui';
import { PhotoGrid, MediaViewerModal } from '@/components/photos';
import type { MediaItem } from '@/components/photos';
import { createClient } from '@/lib/supabase';

type FeedPost = {
  id: string;
  media_url: string | null;
  created_at: string;
  target_profile_id?: string | null;
};

type FeedResponse = {
  posts: FeedPost[];
};

function isVideoUrl(url: string) {
  return /(\.mp4|\.mov|\.webm|\.mkv|\.avi)(\?|$)/i.test(url);
}

export default function ProfilePhotosClient({ 
  username, 
  cardStyle, 
  borderRadiusClass = 'rounded-xl' 
}: { 
  username: string;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
}) {
  // Media tab now only shows: Posted Media and Tagged Media
  // Composer removed - use Feed tab to post
  const [activeTab, setActiveTab] = useState<'posted' | 'tagged'>('posted');

  const [items, setItems] = useState<MediaItem[]>([]);
  const [taggedItems, setTaggedItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTagged, setIsLoadingTagged] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const [profileId, setProfileId] = useState<string | null>(null);

  // Load profile ID for tagged media queries
  useEffect(() => {
    let canceled = false;
    const loadProfileId = async () => {
      try {
        const supabase = createClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .maybeSingle();

        if (canceled) return;
        if (profile?.id) {
          setProfileId(profile.id);
        }
      } catch {
        // ignore
      }
    };

    void loadProfileId();
    return () => {
      canceled = true;
    };
  }, [username]);

  // Load posted media (user's own posts with media)
  const loadMedia = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('username', username);

      const res = await fetch(`/api/feed?${params.toString()}`);
      const json = (await res.json()) as any;

      if (!res.ok) {
        setLoadError(json?.error || 'Failed to load media');
        setItems([]);
        return;
      }

      const data = json as FeedResponse;
      const nextItems: MediaItem[] = (data.posts || [])
        .filter((p) => typeof p?.media_url === 'string' && p.media_url.length)
        .map((p) => {
          const url = String(p.media_url);
          return {
            id: String(p.id),
            type: isVideoUrl(url) ? 'video' : 'photo',
            thumbnailUrl: url,
            caption: '',
          };
        });

      setItems(nextItems);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  // Load tagged media (posts where user is @mentioned or posts to user's page)
  const loadTaggedMedia = useCallback(async () => {
    if (!profileId) return;
    
    setIsLoadingTagged(true);
    try {
      const supabase = createClient();
      
      // Query posts where target_profile_id matches this user (posts to their page)
      // or where text_content contains @username mention
      const { data, error } = await supabase
        .from('posts')
        .select('id, media_url, created_at, target_profile_id, text_content')
        .or(`target_profile_id.eq.${profileId},text_content.ilike.%@${username}%`)
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('[tagged media] query error:', error);
        setTaggedItems([]);
        return;
      }

      const nextItems: MediaItem[] = (data || [])
        .filter((p: any) => typeof p?.media_url === 'string' && p.media_url.length)
        .map((p: any) => {
          const url = String(p.media_url);
          return {
            id: String(p.id),
            type: isVideoUrl(url) ? 'video' : 'photo',
            thumbnailUrl: url,
            caption: '',
          };
        });

      setTaggedItems(nextItems);
    } catch (err) {
      console.warn('[tagged media] error:', err);
      setTaggedItems([]);
    } finally {
      setIsLoadingTagged(false);
    }
  }, [profileId, username]);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  useEffect(() => {
    if (profileId) {
      void loadTaggedMedia();
    }
  }, [profileId, loadTaggedMedia]);

  const displayItems = useMemo(() => {
    if (activeTab === 'tagged') return taggedItems;
    return items;
  }, [activeTab, items, taggedItems]);

  const emptyState = useMemo(() => {
    if (activeTab === 'tagged') {
      return {
        icon: <Tag className="w-10 h-10" />,
        title: 'No tagged media',
        description: `When people @mention @${username} in media posts or post media to their page, it will appear here.`,
      };
    }
    return {
      icon: <Grid className="w-10 h-10" />,
      title: 'No media yet',
      description: 'Media from posts will appear here.',
    };
  }, [activeTab, username]);

  const handleItemClick = useCallback((_: MediaItem, index: number) => {
    if (displayItems.length === 0) return;
    setViewerIndex(index);
    setViewerOpen(true);
  }, [displayItems.length]);

  const currentLoading = activeTab === 'tagged' ? isLoadingTagged : isLoading;

  return (
    <div className="space-y-4">
      {loadError && (
        <Card className={`p-4 border border-destructive/30 bg-destructive/5 backdrop-blur-sm ${borderRadiusClass}`} style={cardStyle}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-destructive">{loadError}</div>
            <Button variant="outline" size="sm" onClick={loadMedia}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      <div className="bg-background border-b border-border">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'posted' | 'tagged')}>
          <TabsList className="w-full justify-start gap-0 h-12 bg-transparent rounded-none p-0">
            <TabsTrigger
              value="posted"
              className="flex-1 sm:flex-none px-6 h-12 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent"
            >
              <Grid className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Posted Media</span>
            </TabsTrigger>

            <TabsTrigger
              value="tagged"
              className="flex-1 sm:flex-none px-6 h-12 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent"
            >
              <Tag className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Tagged Media</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <PhotoGrid items={displayItems} isLoading={currentLoading} onItemClick={handleItemClick} emptyState={emptyState} />

      {displayItems.length > 0 && (
        <MediaViewerModal
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          items={displayItems}
          initialIndex={viewerIndex}
          username={username}
        />
      )}
    </div>
  );
}
