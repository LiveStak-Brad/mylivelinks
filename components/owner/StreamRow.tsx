'use client';

import { 
  User, 
  MapPin, 
  Clock, 
  Eye, 
  Gift, 
  MessageSquare,
  Radio
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { LiveOpsStreamData } from '@/hooks';

interface StreamRowProps {
  stream: LiveOpsStreamData;
  onClick: (stream: LiveOpsStreamData) => void;
}

const regionLabels: Record<string, string> = {
  'us-east': 'US East',
  'us-west': 'US West',
  'eu-west': 'EU West',
  'ap-south': 'Asia Pacific',
  'all': 'Global',
};

const statusConfig = {
  live: { variant: 'live' as const, color: 'text-green-500' },
  starting: { variant: 'new' as const, color: 'text-blue-500' },
  ending: { variant: 'offline' as const, color: 'text-orange-500' },
};

export default function StreamRow({ stream, onClick }: StreamRowProps) {
  const statusInfo = statusConfig[stream.status];
  const duration = getStreamDuration(stream.startedAt);

  return (
    <div
      onClick={() => onClick(stream)}
      className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer"
    >
      {/* Avatar */}
      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-muted">
        {stream.avatarUrl ? (
          <img
            src={stream.avatarUrl}
            alt={stream.streamer}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-accent">
            <User className="w-6 h-6 text-white" />
          </div>
        )}
        {stream.status === 'live' && (
          <div className="absolute -top-1 -right-1">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-card" />
            </span>
          </div>
        )}
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-foreground truncate">{stream.streamer}</h3>
          <StatusBadge variant={statusInfo.variant} size="xs" pulse={stream.status === 'live'} />
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1 truncate">
            <Radio className="w-3.5 h-3.5 flex-shrink-0" />
            {stream.room}
          </span>
          {stream.roomId && (
            <span className="text-xs font-mono">
              {stream.roomId}
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="hidden md:grid grid-cols-4 gap-4 flex-shrink-0">
        {/* Region */}
        <div className="flex flex-col items-center gap-1 min-w-[80px]">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{regionLabels[stream.region]}</span>
        </div>

        {/* Duration */}
        <div className="flex flex-col items-center gap-1 min-w-[80px]">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">{duration}</span>
        </div>

        {/* Viewers */}
        <div className="flex flex-col items-center gap-1 min-w-[80px]">
          <Eye className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-medium text-foreground">{stream.viewers.toLocaleString()}</span>
        </div>

        {/* Engagement */}
        <div className="flex flex-col items-center gap-1 min-w-[80px]">
          <div className="flex items-center gap-1">
            <Gift className="w-3.5 h-3.5 text-purple-500" />
            <MessageSquare className="w-3.5 h-3.5 text-green-500" />
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-foreground">
            <span>{stream.giftsPerMin}</span>
            <span className="text-muted-foreground">/</span>
            <span>{stream.chatPerMin}</span>
          </div>
        </div>
      </div>

      {/* Mobile Stats */}
      <div className="flex md:hidden items-center gap-3 text-sm">
        <div className="flex items-center gap-1 text-blue-500">
          <Eye className="w-4 h-4" />
          <span className="font-medium">{stream.viewers}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span className="text-xs">{duration}</span>
        </div>
      </div>
    </div>
  );
}

function getStreamDuration(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffHours > 0) {
    const mins = diffMins % 60;
    return `${diffHours}h ${mins}m`;
  }
  return `${diffMins}m`;
}

