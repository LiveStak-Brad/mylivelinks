'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Film,
  Upload,
  Layers,
  Mic,
  Clapperboard,
  Music,
  Music2,
  TrendingUp,
  Eye,
  Clock,
  Plus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { createClient } from '@/lib/supabase';

interface StudioStats {
  total_items: number;
  draft_count: number;
  published_count: number;
  processing_count: number;
}

const QUICK_ACTIONS = [
  { href: '/creator-studio/upload', label: 'Upload Content', icon: Upload, color: 'text-blue-500' },
  { href: '/creator-studio/upload?type=music', label: 'Upload Music', icon: Music2, color: 'text-violet-500' },
  { href: '/creator-studio/series', label: 'Create Series', icon: Layers, color: 'text-purple-500' },
  { href: '/creator-studio/podcasts', label: 'New Podcast', icon: Mic, color: 'text-green-500' },
  { href: '/creator-studio/movies', label: 'Upload Movie', icon: Clapperboard, color: 'text-amber-500' },
  { href: '/creator-studio/music-videos', label: 'Music Video', icon: Music, color: 'text-pink-500' },
];

export default function CreatorStudioDashboard() {
  const [stats, setStats] = useState<StudioStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('get_creator_studio_stats');
        
        if (!error && data && data.length > 0) {
          setStats(data[0]);
        } else {
          setStats({
            total_items: 0,
            draft_count: 0,
            published_count: 0,
            processing_count: 0,
          });
        }
      } catch {
        setStats({
          total_items: 0,
          draft_count: 0,
          published_count: 0,
          processing_count: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your content and track performance
          </p>
        </div>
        <Link href="/creator-studio/upload">
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            Upload
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Content"
          value={loading ? '—' : String(stats?.total_items ?? 0)}
          icon={Film}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <StatCard
          label="Published"
          value={loading ? '—' : String(stats?.published_count ?? 0)}
          icon={Eye}
          color="text-green-500"
          bgColor="bg-green-500/10"
        />
        <StatCard
          label="Drafts"
          value={loading ? '—' : String(stats?.draft_count ?? 0)}
          icon={Clock}
          color="text-amber-500"
          bgColor="bg-amber-500/10"
        />
        <StatCard
          label="Processing"
          value={loading ? '—' : String(stats?.processing_count ?? 0)}
          icon={TrendingUp}
          color="text-purple-500"
          bgColor="bg-purple-500/10"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className={`p-3 rounded-xl bg-muted mb-3`}>
                      <Icon className={`w-6 h-6 ${action.color}`} />
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {action.label}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Content Type Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContentSection
          title="Recent Uploads"
          href="/creator-studio/content"
          icon={Film}
          emptyMessage="No content uploaded yet"
        />
        <ContentSection
          title="Your Series"
          href="/creator-studio/series"
          icon={Layers}
          emptyMessage="No series created yet"
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${bgColor}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContentSection({
  title,
  href,
  icon: Icon,
  emptyMessage,
}: {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted-foreground" />
            {title}
          </h4>
          <Link
            href={href}
            className="text-xs text-primary hover:underline"
          >
            View All
          </Link>
        </div>
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          <Link href="/creator-studio/upload">
            <Button variant="secondary" size="sm" className="mt-3">
              Get Started
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
