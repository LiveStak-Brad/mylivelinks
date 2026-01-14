'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Layers, Plus, Film } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui';

export default function SeriesPage() {
  const [series] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Series</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organize your content into series and seasons
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
          New Series
        </Button>
      </div>

      {series.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Layers className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No series yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Create a series to organize episodic content. Perfect for shows, 
              tutorials, or any content with multiple parts.
            </p>
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Create Your First Series
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {series.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <div className="aspect-video bg-muted relative">
                <Film className="w-8 h-8 text-muted-foreground/30 absolute inset-0 m-auto" />
              </div>
              <CardContent className="p-4">
                <h4 className="font-semibold text-foreground">{s.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">0 episodes</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
