'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Film, Grid, Clapperboard, Tag, Upload, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, Button, Card, Textarea } from '@/components/ui';
import { PhotoGrid, MediaViewerModal } from '@/components/photos';
import type { MediaItem } from '@/components/photos';
import { createClient } from '@/lib/supabase';
import { uploadPostMedia } from '@/lib/storage';

type FeedPost = {
  id: string;
  media_url: string | null;
  created_at: string;
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
  const [activeTab, setActiveTab] = useState<'all' | 'photos' | 'videos' | 'tagged'>('all');

  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const isOwner = !!currentUsername && currentUsername === username;

  const [composerText, setComposerText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [composerMediaFile, setComposerMediaFile] = useState<File | null>(null);
  const [composerMediaPreviewUrl, setComposerMediaPreviewUrl] = useState<string | null>(null);
  const [composerMediaKind, setComposerMediaKind] = useState<'image' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let canceled = false;
    const loadMe = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        if (error) return;
        if (!data?.user) return;
        if (canceled) return;
        setCurrentUserId(data.user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', data.user.id)
          .maybeSingle();

        if (canceled) return;
        if (profile && typeof (profile as any).username === 'string') {
          setCurrentUsername(String((profile as any).username));
        }
      } catch {
        // ignore
      }
    };

    void loadMe();
    return () => {
      canceled = true;
    };
  }, []);

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

  const onComposerFileChange = useCallback(
    (file: File | null) => {
      if (!file) return;

      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) {
        setLoadError('Please select an image or video file');
        return;
      }

      const maxBytes = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxBytes) {
        setLoadError(isVideo ? 'Video must be 50MB or less' : 'Image must be 10MB or less');
        return;
      }

      if (composerMediaPreviewUrl) URL.revokeObjectURL(composerMediaPreviewUrl);
      setComposerMediaFile(file);
      setComposerMediaKind(isVideo ? 'video' : 'image');
      setComposerMediaPreviewUrl(URL.createObjectURL(file));
    },
    [composerMediaPreviewUrl]
  );

  const clearComposerMedia = useCallback(() => {
    if (composerMediaPreviewUrl) URL.revokeObjectURL(composerMediaPreviewUrl);
    setComposerMediaFile(null);
    setComposerMediaPreviewUrl(null);
    setComposerMediaKind(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [composerMediaPreviewUrl]);

  const createPost = useCallback(async () => {
    if (!currentUserId) {
      setLoadError('Please log in to post a photo/video.');
      return;
    }
    if (!composerMediaFile) {
      setLoadError('Please add a photo or video.');
      return;
    }

    setIsPosting(true);
    setLoadError(null);
    try {
      const mediaUrl = await uploadPostMedia(currentUserId, composerMediaFile);
      const text = composerText.trim();

      const safeTextContent = text.length ? text : ' ';

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text_content: safeTextContent, media_url: mediaUrl }),
      });

      const json = (await res.json()) as any;
      if (!res.ok) {
        setLoadError(json?.error || 'Failed to create post');
        return;
      }

      setComposerText('');
      clearComposerMedia();
      await loadMedia();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  }, [clearComposerMedia, composerMediaFile, composerText, currentUserId, loadMedia]);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'photos') return items.filter((i) => i.type === 'photo');
    if (activeTab === 'videos') return items.filter((i) => i.type === 'video');
    if (activeTab === 'tagged') return [];
    return items;
  }, [activeTab, items]);

  const emptyState = useMemo(() => {
    switch (activeTab) {
      case 'photos':
        return {
          icon: <Camera className="w-10 h-10" />,
          title: 'No photos yet',
          description: 'Photos will appear here when posted to the feed.',
        };
      case 'videos':
        return {
          icon: <Film className="w-10 h-10" />,
          title: 'No videos yet',
          description: 'Videos will appear here when posted to the feed.',
        };
      case 'tagged':
        return {
          icon: <Tag className="w-10 h-10" />,
          title: 'No tagged posts',
          description: `When people tag @${username}, posts will appear here.`,
        };
      default:
        return {
          icon: <Grid className="w-10 h-10" />,
          title: 'Nothing here yet',
          description: 'Post a photo or video to see it here.',
        };
    }
  }, [activeTab, username]);

  const handleItemClick = useCallback((_: MediaItem, index: number) => {
    if (filteredItems.length === 0) return;
    setViewerIndex(index);
    setViewerOpen(true);
  }, [filteredItems.length]);

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

      {isOwner && (
        <Card className={`overflow-hidden backdrop-blur-sm ${borderRadiusClass}`} style={cardStyle}>
          <div className="p-4 sm:p-5 space-y-3">
            <div className="text-sm font-medium text-foreground">Post a photo or video</div>

            <Textarea
              textareaSize="md"
              placeholder="Add a caption (optional)..."
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              disabled={isPosting}
            />

            {composerMediaPreviewUrl && composerMediaKind && (
              <div className="relative rounded-xl overflow-hidden border border-border bg-muted/20">
                {composerMediaKind === 'video' ? (
                  <video src={composerMediaPreviewUrl} controls className="w-full max-h-[420px] object-contain" />
                ) : (
                  <img src={composerMediaPreviewUrl} alt="Selected media" className="w-full max-h-[420px] object-contain" />
                )}
                <button
                  type="button"
                  onClick={clearComposerMedia}
                  className="absolute top-2 right-2 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-background/80 backdrop-blur border border-border text-xs"
                  disabled={isPosting}
                >
                  <X className="w-4 h-4" />
                  Remove
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => onComposerFileChange(e.target.files?.[0] ?? null)}
                  disabled={isPosting}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPosting}
                  leftIcon={<Upload className="w-4 h-4" />}
                >
                  Add photo/video
                </Button>
              </div>
              <Button onClick={createPost} disabled={isPosting || !composerMediaFile} isLoading={isPosting}>
                Post
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="bg-background border-b border-border">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full justify-start gap-0 h-12 bg-transparent rounded-none p-0">
            <TabsTrigger
              value="all"
              className="flex-1 sm:flex-none px-6 h-12 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent"
            >
              <Grid className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Posts</span>
            </TabsTrigger>

            <TabsTrigger
              value="photos"
              className="flex-1 sm:flex-none px-6 h-12 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent"
            >
              <Camera className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Photos</span>
            </TabsTrigger>

            <TabsTrigger
              value="videos"
              className="flex-1 sm:flex-none px-6 h-12 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent"
            >
              <Clapperboard className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Videos</span>
            </TabsTrigger>

            <TabsTrigger
              value="tagged"
              className="flex-1 sm:flex-none px-6 h-12 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent"
            >
              <Tag className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Tagged</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <PhotoGrid items={filteredItems} isLoading={isLoading} onItemClick={handleItemClick} emptyState={emptyState} />

      {filteredItems.length > 0 && (
        <MediaViewerModal
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          items={filteredItems}
          initialIndex={viewerIndex}
          username={username}
        />
      )}
    </div>
  );
}
