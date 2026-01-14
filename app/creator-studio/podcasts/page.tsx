'use client';

import { useState } from 'react';
import { Mic, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui';

export default function PodcastsPage() {
  const [podcasts] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Podcasts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your podcast episodes and shows
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
          New Podcast
        </Button>
      </div>

      {podcasts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Mic className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No podcasts yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Start your podcast journey. Upload episodes, manage shows, 
              and grow your audience.
            </p>
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Create Your First Podcast
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {podcasts.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <div className="aspect-square bg-muted relative">
                <Mic className="w-8 h-8 text-muted-foreground/30 absolute inset-0 m-auto" />
              </div>
              <CardContent className="p-4">
                <h4 className="font-semibold text-foreground">{p.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">0 episodes</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
