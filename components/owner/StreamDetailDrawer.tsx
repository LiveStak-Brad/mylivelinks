'use client';

import { useEffect } from 'react';
import { 
  X, 
  User, 
  Radio, 
  MapPin, 
  Clock, 
  Eye, 
  Gift, 
  MessageSquare,
  StopCircle,
  Volume2,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tooltip } from '@/components/ui/Tooltip';
import { LiveStreamData } from './StreamRow';

interface StreamDetailDrawerProps {
  stream: LiveStreamData;
  isOpen: boolean;
  onClose: () => void;
}

interface ViewerPreview {
  id: string;
  username: string;
  avatarUrl: string | null;
  isGifting: boolean;
}

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
}

const regionLabels: Record<string, string> = {
  'us-east': 'US East',
  'us-west': 'US West',
  'eu-west': 'EU West',
  'ap-south': 'Asia Pacific',
  'all': 'Global',
};

export default function StreamDetailDrawer({ stream, isOpen, onClose }: StreamDetailDrawerProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Mock data for UI
  const mockViewers: ViewerPreview[] = [
    { id: '1', username: 'viewer_123', avatarUrl: null, isGifting: true },
    { id: '2', username: 'fan_user', avatarUrl: null, isGifting: false },
    { id: '3', username: 'supporter_99', avatarUrl: null, isGifting: true },
    { id: '4', username: 'watcher_42', avatarUrl: null, isGifting: false },
  ];

  const mockChat: ChatMessage[] = [
    { id: '1', username: 'viewer_123', message: 'Amazing stream! 🔥', timestamp: '2 min ago' },
    { id: '2', username: 'fan_user', message: 'Love this content', timestamp: '3 min ago' },
    { id: '3', username: 'supporter_99', message: 'Keep it up!', timestamp: '5 min ago' },
  ];

  const duration = getStreamDuration(stream.startedAt);

  return (
    <div
      className="fixed inset-0 flex items-center justify-end"
      style={{ zIndex: 'var(--z-modal)' }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm animate-fade-in" 
        style={{ zIndex: 'var(--z-modal-backdrop)' }}
      />
      
      {/* Drawer */}
      <div
        className="relative h-full w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right"
        style={{ zIndex: 'var(--z-modal)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-foreground">Stream Details</h2>
            <p className="text-sm text-muted-foreground mt-1">Live operations monitoring</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Stream Meta */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Stream Information</h3>
            
            {/* Streamer */}
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
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
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{stream.streamer}</p>
                  <StatusBadge 
                    variant={stream.status === 'live' ? 'live' : 'offline'} 
                    size="xs" 
                    pulse={stream.status === 'live'}
                  />
                </div>
                <p className="text-sm text-muted-foreground">ID: {stream.streamerId}</p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Radio className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">Room</span>
                </div>
                <p className="text-sm font-semibold text-foreground truncate">{stream.room}</p>
                {stream.roomId && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{stream.roomId}</p>
                )}
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">Region</span>
                </div>
                <p className="text-sm font-semibold text-foreground">{regionLabels[stream.region]}</p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">Duration</span>
                </div>
                <p className="text-sm font-semibold text-foreground">{duration}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Started {new Date(stream.startedAt).toLocaleTimeString()}
                </p>
              </div>

              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">Viewers</span>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stream.viewers.toLocaleString()}
                </p>
              </div>

              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                  <Gift className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">Gifts/Min</span>
                </div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {stream.giftsPerMin}
                </p>
              </div>

              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">Chat/Min</span>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stream.chatPerMin}
                </p>
              </div>
            </div>
          </div>

          {/* Viewers Preview */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Active Viewers ({mockViewers.length})
            </h3>
            <div className="space-y-2">
              {mockViewers.map((viewer) => (
                <div
                  key={viewer.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1">{viewer.username}</span>
                  {viewer.isGifting && (
                    <Gift className="w-4 h-4 text-purple-500" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Chat Preview */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Recent Chat
            </h3>
            <div className="space-y-2">
              {mockChat.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{msg.username}</span>
                    <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{msg.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="border-t border-border p-6 space-y-3 flex-shrink-0 bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
            Stream Actions
          </h3>
          
          <Tooltip content="Backend wiring required - coming soon">
            <Button
              variant="destructive"
              size="md"
              fullWidth
              disabled
              leftIcon={<StopCircle className="w-4 h-4" />}
            >
              End Stream
            </Button>
          </Tooltip>

          <Tooltip content="Backend wiring required - coming soon">
            <Button
              variant="outline"
              size="md"
              fullWidth
              disabled
              leftIcon={<Volume2 className="w-4 h-4" />}
            >
              Mute Chat
            </Button>
          </Tooltip>

          <Tooltip content="Backend wiring required - coming soon">
            <Button
              variant="outline"
              size="md"
              fullWidth
              disabled
              leftIcon={<TrendingDown className="w-4 h-4" />}
            >
              Throttle Gifts
            </Button>
          </Tooltip>

          <div className="flex items-start gap-2 mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Action buttons will be functional once backend endpoints are wired
            </p>
          </div>
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

