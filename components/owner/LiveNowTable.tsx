/**
 * LiveNowTable Component
 * Displays currently live streams with admin actions
 */

import { Eye, Ban, Radio } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Tooltip } from '@/components/ui';
import { EmptyState } from '@/components/owner/ui-kit';
import type { LiveStreamInfo } from '@/hooks';

export interface LiveNowTableProps {
  streams: LiveStreamInfo[];
  loading?: boolean;
  onJoinInvisibly?: (streamId: number) => void;
  onEndStream?: (streamId: number) => void;
  onShadowMute?: (streamId: number) => void;
}

export function LiveNowTable({
  streams,
  loading = false,
  onJoinInvisibly,
  onEndStream,
  onShadowMute,
}: LiveNowTableProps) {
  const formatDuration = (startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live Now</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Radio className="w-4 h-4 text-red-500" />
          Live Now ({streams.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {streams.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No live streams"
            description="No streamers are currently live."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Streamer
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Viewers
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Gifts/min
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Chat/min
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Region
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Duration
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {streams.map((stream) => (
                  <tr
                    key={stream.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    {/* Streamer */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {stream.streamer_avatar ? (
                          <img
                            src={stream.streamer_avatar}
                            alt={stream.streamer_username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                            {stream.streamer_username[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {stream.streamer_username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {stream.room_name}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Viewers */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {stream.viewer_count}
                        </span>
                      </div>
                    </td>

                    {/* Gifts/min */}
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm text-foreground">
                        {stream.gifts_per_min.toFixed(1)}
                      </span>
                    </td>

                    {/* Chat/min */}
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm text-foreground">
                        {stream.chat_per_min.toFixed(1)}
                      </span>
                    </td>

                    {/* Region */}
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-mono text-muted-foreground uppercase">
                        {stream.region}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(stream.started_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Tooltip content="Wiring coming soon">
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled
                            onClick={() => onJoinInvisibly?.(stream.id)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Wiring coming soon">
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled
                            onClick={() => onEndStream?.(stream.id)}
                          >
                            <Radio className="w-3.5 h-3.5" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Wiring coming soon">
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled
                            onClick={() => onShadowMute?.(stream.id)}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </Button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

