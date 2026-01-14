'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Film,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  EyeOff,
  Clock,
  Trash2,
  Edit,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button, Input, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase';

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  item_type: string;
  thumb_url: string | null;
  duration_seconds: number | null;
  status: string;
  visibility: string;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-amber-500/20 text-amber-600',
  ready: 'bg-green-500/20 text-green-600',
  processing: 'bg-blue-500/20 text-blue-600',
  uploading: 'bg-purple-500/20 text-purple-600',
  failed: 'bg-red-500/20 text-red-600',
};

const TYPE_LABELS: Record<string, string> = {
  music_video: 'Music Video',
  movie: 'Movie',
  podcast: 'Podcast',
  series_episode: 'Episode',
  education: 'Education',
  vlog: 'Vlog',
  comedy_special: 'Comedy',
  other: 'Other',
};

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('list_creator_studio_items', {
          p_status: statusFilter,
          p_limit: 50,
          p_offset: 0,
        });

        if (!error && data) {
          setItems(data);
        }
      } catch {
        console.error('Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, [statusFilter]);

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">All Content</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length} items total
          </p>
        </div>
        <Link href="/creator-studio/upload">
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            Upload New
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === null ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setStatusFilter(null)}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'draft' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setStatusFilter('draft')}
          >
            Drafts
          </Button>
          <Button
            variant={statusFilter === 'ready' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setStatusFilter('ready')}
          >
            Published
          </Button>
        </div>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4 animate-pulse">
                  <div className="w-32 h-20 bg-muted rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Film className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? 'No results found' : 'No content yet'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? 'Try a different search term'
                : 'Upload your first piece of content to get started'}
            </p>
            {!searchQuery && (
              <Link href="/creator-studio/upload">
                <Button variant="primary">Upload Content</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <ContentRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContentRow({ item }: { item: ContentItem }) {
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Thumbnail */}
          <div className="w-32 h-20 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
            {item.thumb_url ? (
              <img
                src={item.thumb_url}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film className="w-8 h-8 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-foreground truncate">
                  {item.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {TYPE_LABELS[item.item_type] || item.item_type} • {formatDuration(item.duration_seconds)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge
                  variant="default"
                  className={STATUS_COLORS[item.status] || 'bg-muted text-muted-foreground'}
                >
                  {item.status}
                </Badge>
                {item.visibility === 'public' ? (
                  <Eye className="w-4 h-4 text-green-500" />
                ) : (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {item.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {item.description}
              </p>
            )}

            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(item.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Link href={`/creator-studio/edit/${item.id}`}>
              <Button variant="ghost" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
