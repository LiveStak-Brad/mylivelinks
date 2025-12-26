'use client';

import { useState } from 'react';
import { 
  Edit, 
  Users, 
  Copy, 
  MoreVertical,
  Play,
  Pause,
  Eye,
  Heart,
  ExternalLink,
  Trash2,
  Settings
} from 'lucide-react';

export interface RoomInstance {
  id: string;
  room_key: string;
  name: string;
  description: string | null;
  category: string;
  image_url: string | null;
  fallback_gradient: string;
  interest_threshold: number;
  current_interest_count: number;
  status: 'draft' | 'interest' | 'opening_soon' | 'live' | 'paused';
  display_order: number;
  disclaimer_required: boolean;
  disclaimer_text: string | null;
  special_badge: string | null;
  layout_type?: string;
  max_participants?: number;
  template_id?: string | null;
  roles_summary?: {
    admins_count: number;
    moderators_count: number;
  };
  created_at: string;
  updated_at: string;
}

interface RoomRowProps {
  room: RoomInstance;
  onEdit: (room: RoomInstance) => void;
  onManageRoles: (room: RoomInstance) => void;
  onDuplicate: (room: RoomInstance) => void;
  onStatusChange: (room: RoomInstance, newStatus: RoomInstance['status']) => void;
  onDelete?: (room: RoomInstance) => void;
  canDelete?: boolean;
}

const statusConfig: Record<RoomInstance['status'], { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-gray-400', bg: 'bg-gray-500/10' },
  interest: { label: 'Gauging Interest', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  opening_soon: { label: 'Opening Soon', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  live: { label: 'Live', color: 'text-green-400', bg: 'bg-green-500/10' },
  paused: { label: 'Paused', color: 'text-orange-400', bg: 'bg-orange-500/10' },
};

export default function RoomRow({
  room,
  onEdit,
  onManageRoles,
  onDuplicate,
  onStatusChange,
  onDelete,
  canDelete = false,
}: RoomRowProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  
  const statusInfo = statusConfig[room.status] || statusConfig.draft;
  const progressPercent = Math.min((room.current_interest_count / room.interest_threshold) * 100, 100);

  return (
    <div className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-all">
      {/* Room Image */}
      <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0">
        {room.image_url ? (
          <img
            src={room.image_url}
            alt={room.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${room.fallback_gradient || 'from-purple-600 to-pink-600'}`} />
        )}
        {room.status === 'live' && (
          <div className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 bg-red-500 rounded text-[10px] font-bold text-white">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        )}
      </div>

      {/* Room Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground truncate">{room.name}</h3>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
          <span className="capitalize">{room.category}</span>
          <span className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" />
            {room.current_interest_count.toLocaleString()} / {room.interest_threshold.toLocaleString()}
          </span>
          {room.roles_summary && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {room.roles_summary.admins_count}A / {room.roles_summary.moderators_count}M
            </span>
          )}
        </div>
        
        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary/70 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(room)}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
          title="Edit Room"
        >
          <Edit className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => onManageRoles(room)}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
          title="Manage Roles"
        >
          <Users className="w-4 h-4" />
        </button>

        {/* Status Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            onBlur={() => setTimeout(() => setShowStatusMenu(false), 200)}
            className={`p-2 rounded-lg transition ${
              room.status === 'live' 
                ? 'text-green-400 hover:bg-green-500/10' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title="Change Status"
          >
            {room.status === 'live' || room.status === 'opening_soon' ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          
          {showStatusMenu && (
            <div className="absolute right-0 top-full mt-1 py-1 bg-popover border border-border rounded-lg shadow-lg z-20 min-w-[160px]">
              {Object.entries(statusConfig).map(([status, config]) => (
                <button
                  key={status}
                  onClick={() => {
                    onStatusChange(room, status as RoomInstance['status']);
                    setShowStatusMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition ${
                    room.status === status ? 'bg-muted' : ''
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${config.bg.replace('/10', '')}`} />
                  <span className={config.color}>{config.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* More Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            onBlur={() => setTimeout(() => setShowMenu(false), 200)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 py-1 bg-popover border border-border rounded-lg shadow-lg z-20 min-w-[140px]">
              <button
                onClick={() => {
                  onDuplicate(room);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              <a
                href={`/${room.room_key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition"
              >
                <ExternalLink className="w-4 h-4" />
                View Room
              </a>
              {canDelete && onDelete && (
                <button
                  onClick={() => {
                    onDelete(room);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


