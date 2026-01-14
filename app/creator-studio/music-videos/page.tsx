'use client';

import { useState } from 'react';
import { Music, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui';

export default function MusicVideosPage() {
  const [musicVideos] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Music Videos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your music video content
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
          Upload Music Video
        </Button>
      </div>

      {musicVideos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Music className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No music videos yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Upload your music videos, performances, and lyric videos. 
              Showcase your musical talent to the world.
            </p>
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Upload Your First Music Video
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {musicVideos.map((mv) => (
            <Card key={mv.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <div className="aspect-video bg-muted relative">
                <Music className="w-8 h-8 text-muted-foreground/30 absolute inset-0 m-auto" />
              </div>
              <CardContent className="p-4">
                <h4 className="font-semibold text-foreground">{mv.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">Draft</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
