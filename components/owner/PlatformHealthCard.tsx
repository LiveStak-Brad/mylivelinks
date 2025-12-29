/**
 * PlatformHealthCard Component
 * Displays platform health status indicators
 */

import { Activity, Database, Radio, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import type { PlatformHealth } from '@/hooks';

export interface PlatformHealthCardProps {
  health: PlatformHealth | null;
  loading?: boolean;
}

export function PlatformHealthCard({ health, loading }: PlatformHealthCardProps) {
  if (loading || !health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-6 w-12 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusVariant = (
    status: 'ok' | 'degraded' | 'down'
  ): 'success' | 'warning' | 'destructive' => {
    switch (status) {
      case 'ok':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'down':
        return 'destructive';
    }
  };

  const formatMs = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Platform Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {/* API Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">API</span>
            </div>
            <Badge
              variant={getStatusVariant(health.api)}
              size="sm"
              dot
              dotColor={getStatusVariant(health.api)}
            >
              {health.api.toUpperCase()}
            </Badge>
          </div>

          {/* Supabase Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Database</span>
            </div>
            <Badge
              variant={getStatusVariant(health.supabase)}
              size="sm"
              dot
              dotColor={getStatusVariant(health.supabase)}
            >
              {health.supabase.toUpperCase()}
            </Badge>
          </div>

          {/* LiveKit Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">LiveKit</span>
            </div>
            <Badge
              variant={getStatusVariant(health.livekit)}
              size="sm"
              dot
              dotColor={getStatusVariant(health.livekit)}
            >
              {health.livekit.toUpperCase()}
            </Badge>
          </div>

          {/* Token Success Rate */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Token Success
              </span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {health.tokenSuccessRate.toFixed(1)}%
            </p>
          </div>

          {/* Avg Join Time */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Avg Join</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {formatMs(health.avgJoinTime)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


