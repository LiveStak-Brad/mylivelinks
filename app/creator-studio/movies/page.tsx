'use client';

import { useState } from 'react';
import { Clapperboard, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui';

export default function MoviesPage() {
  const [movies] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Movies</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your long-form films and movies
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
          Upload Movie
        </Button>
      </div>

      {movies.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Clapperboard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No movies yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Upload your feature films, documentaries, or long-form content. 
              Perfect for cinematic storytelling.
            </p>
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Upload Your First Movie
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {movies.map((m) => (
            <Card key={m.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <div className="aspect-video bg-muted relative">
                <Clapperboard className="w-8 h-8 text-muted-foreground/30 absolute inset-0 m-auto" />
              </div>
              <CardContent className="p-4">
                <h4 className="font-semibold text-foreground">{m.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">Draft</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
