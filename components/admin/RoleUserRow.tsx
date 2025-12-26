'use client';

import { Trash2, Shield, Crown, Users, ExternalLink } from 'lucide-react';

export interface RoleUser {
  id: string;
  profile_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  email?: string;
  role: 'owner' | 'app_admin' | 'room_admin' | 'room_moderator';
  assigned_by?: string;
  assigned_by_username?: string;
  created_at: string;
  room_id?: string;
  room_name?: string;
}

interface RoleUserRowProps {
  user: RoleUser;
  onRemove?: (userId: string) => void;
  canRemove?: boolean;
  isLoading?: boolean;
  showRoom?: boolean;
}

const roleLabels: Record<string, { label: string; color: string; icon: any }> = {
  owner: { label: 'Owner', color: 'bg-amber-500/20 text-amber-400', icon: Crown },
  app_admin: { label: 'App Admin', color: 'bg-purple-500/20 text-purple-400', icon: Shield },
  room_admin: { label: 'Room Admin', color: 'bg-blue-500/20 text-blue-400', icon: Shield },
  room_moderator: { label: 'Moderator', color: 'bg-green-500/20 text-green-400', icon: Users },
};

export default function RoleUserRow({ user, onRemove, canRemove = true, isLoading = false, showRoom = false }: RoleUserRowProps) {
  const roleInfo = roleLabels[user.role] || roleLabels.room_moderator;
  const RoleIcon = roleInfo.icon;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition">
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-gray-600 overflow-hidden flex-shrink-0">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
            {(user.display_name || user.username).charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">{user.display_name || user.username}</span>
          <a
            href={`/${user.username}`}
            target="_blank"
            className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
          >
            @{user.username}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
          {user.email && <span>{user.email}</span>}
          <span>Added {formatDate(user.created_at)}</span>
          {user.assigned_by_username && (
            <span>by @{user.assigned_by_username}</span>
          )}
        </div>
        {showRoom && user.room_name && (
          <div className="mt-1 text-sm text-gray-500">
            Room: <span className="text-gray-300">{user.room_name}</span>
          </div>
        )}
      </div>

      {/* Role Badge */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${roleInfo.color}`}>
        <RoleIcon className="w-4 h-4" />
        {roleInfo.label}
      </div>

      {/* Remove Button */}
      {canRemove && user.role !== 'owner' && onRemove && (
        <button
          onClick={() => onRemove(user.id)}
          disabled={isLoading}
          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition disabled:opacity-50"
          title="Remove role"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

