'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Music2, Plus, Disc } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui';

export default function MusicPage() {
  const [tracks] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Music</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your audio tracks and singles
          </p>
        </div>
        <Link href="/creator-studio/upload?type=music">
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            Upload Track
          </Button>
        </Link>
      </div>

      {tracks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Music2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No music tracks yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Upload your audio tracks, singles, and albums. 
              Share your music with your audience.
            </p>
            <Link href="/creator-studio/upload?type=music">
              <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                Upload Your First Track
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tracks.map((track) => (
            <Card key={track.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <div className="aspect-square bg-muted relative">
                {track.artwork_url ? (
                  <img
                    src={track.artwork_url}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Disc className="w-12 h-12 text-muted-foreground/30 absolute inset-0 m-auto" />
                )}
              </div>
              <CardContent className="p-4">
                <h4 className="font-semibold text-foreground truncate">{track.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {track.duration_seconds ? `${Math.floor(track.duration_seconds / 60)}:${(track.duration_seconds % 60).toString().padStart(2, '0')}` : 'Draft'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
