'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Camera, Film, Grid, Clapperboard, Tag } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { PhotoGrid, MediaViewerModal } from '@/components/photos';
import type { MediaItem } from '@/components/photos';

/* =============================================================================
   PHOTOS PAGE
   
   Instagram-style photos and videos gallery for user profiles.
   
   UI-ONLY: No mock media, no fake data, empty-by-default.
   Will be wired to real data sources in future iterations.
============================================================================= */

export default function PhotosPage() {
  const params = useParams<{ username?: string }>();
  const username = params?.username ?? '';
  
  if (!username) {
    return null;
  }
  
  const [activeTab, setActiveTab] = useState('all');
  
  // Empty media array - no mock data
  const mediaItems: MediaItem[] = [];
  
  // Viewer state - won't open since there's no media
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Handler for item click - only triggers if items exist
  const handleItemClick = (item: MediaItem, index: number) => {
    if (mediaItems.length > 0) {
      setViewerIndex(index);
      setViewerOpen(true);
    }
  };

  // Get empty state config based on active tab
  const getEmptyStateConfig = () => {
    switch (activeTab) {
      case 'photos':
        return {
          icon: <Camera className="w-10 h-10" />,
          title: 'No photos yet',
          description: 'Photos will appear here when uploads are enabled.',
        };
      case 'videos':
        return {
          icon: <Film className="w-10 h-10" />,
          title: 'No videos yet',
          description: 'Videos will appear here when uploads are enabled.',
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
          description: 'Uploads coming soon.',
        };
    }
  };

  const emptyState = getEmptyStateConfig();

  return (
    <div className="min-h-screen bg-background">
      {/* Sub-tabs */}
      <div className="bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start gap-0 h-12 bg-transparent rounded-none p-0">
              <TabsTrigger
                value="all"
                className="
                  flex-1 sm:flex-none px-6 h-12 rounded-none
                  data-[state=active]:border-b-2 data-[state=active]:border-foreground
                  data-[state=active]:bg-transparent
                  data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent
                "
              >
                <Grid className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Posts</span>
              </TabsTrigger>
              
              <TabsTrigger
                value="photos"
                className="
                  flex-1 sm:flex-none px-6 h-12 rounded-none
                  data-[state=active]:border-b-2 data-[state=active]:border-foreground
                  data-[state=active]:bg-transparent
                  data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent
                "
              >
                <Camera className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Photos</span>
              </TabsTrigger>
              
              <TabsTrigger
                value="videos"
                className="
                  flex-1 sm:flex-none px-6 h-12 rounded-none
                  data-[state=active]:border-b-2 data-[state=active]:border-foreground
                  data-[state=active]:bg-transparent
                  data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent
                "
              >
                <Clapperboard className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Videos</span>
              </TabsTrigger>
              
              <TabsTrigger
                value="tagged"
                className="
                  flex-1 sm:flex-none px-6 h-12 rounded-none
                  data-[state=active]:border-b-2 data-[state=active]:border-foreground
                  data-[state=active]:bg-transparent
                  data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent
                "
              >
                <Tag className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Tagged</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content - Always empty for now */}
      <main className="max-w-6xl mx-auto">
        <PhotoGrid
          items={mediaItems}
          isLoading={false}
          onItemClick={handleItemClick}
          emptyState={emptyState}
        />
      </main>

      {/* Media Viewer Modal - Only opens if mediaItems exist */}
      {mediaItems.length > 0 && (
        <MediaViewerModal
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          items={mediaItems}
          initialIndex={viewerIndex}
          username={username}
        />
      )}
    </div>
  );
}
