'use client';

import { useState, useEffect } from 'react';
import { X, Search, Shield, Users, Check, AlertCircle } from 'lucide-react';

interface User {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  email?: string;
}

interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: string, username: string) => void;
  roleType: 'app_admin' | 'room_admin' | 'room_moderator';
  roomName?: string;
  existingUserIds: string[];
  isLoading?: boolean;
}

const roleInfo = {
  app_admin: {
    title: 'Add App Admin',
    description: 'App Admins can manage app-level settings and all rooms globally.',
    icon: Shield,
    color: 'text-purple-400',
  },
  room_admin: {
    title: 'Add Room Admin',
    description: 'Room Admins can manage their assigned room and add moderators.',
    icon: Shield,
    color: 'text-blue-400',
  },
  room_moderator: {
    title: 'Add Room Moderator',
    description: 'Moderators can moderate chat and manage users in their assigned room.',
    icon: Users,
    color: 'text-green-400',
  },
};

export default function AddRoleModal({
  isOpen,
  onClose,
  onConfirm,
  roleType,
  roomName,
  existingUserIds,
  isLoading = false,
}: AddRoleModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const info = roleInfo[roleType];
  const RoleIcon = info.icon;

  // Mock search - replace with real API call
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setError(null);
      
      try {
        // TODO: Replace with real API call
        const res = await fetch(`/api/admin/users?q=${encodeURIComponent(searchQuery)}&limit=10`);
        if (!res.ok) throw new Error('Failed to search users');
        const data = await res.json();
        setSearchResults(data.users || []);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to search users');
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setError(null);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (selectedUser) {
      onConfirm(selectedUser.id, selectedUser.username);
    }
  };

  const isAlreadyAssigned = (userId: string) => existingUserIds.includes(userId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gray-700 ${info.color}`}>
              <RoleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{info.title}</h3>
              {roomName && (
                <p className="text-sm text-gray-400">for {roomName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Description */}
          <p className="text-sm text-gray-400">{info.description}</p>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username or email..."
              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Search Results */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {searching && (
              <div className="text-center py-4 text-gray-400">
                <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                Searching...
              </div>
            )}

            {!searching && searchQuery && searchResults.length === 0 && (
              <div className="text-center py-4 text-gray-400">
                No users found matching "{searchQuery}"
              </div>
            )}

            {searchResults.map((user) => {
              const alreadyAssigned = isAlreadyAssigned(user.id);
              const isSelected = selectedUser?.id === user.id;

              return (
                <button
                  key={user.id}
                  onClick={() => !alreadyAssigned && setSelectedUser(user)}
                  disabled={alreadyAssigned}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition ${
                    alreadyAssigned
                      ? 'opacity-50 cursor-not-allowed bg-gray-700/30'
                      : isSelected
                      ? 'bg-purple-600/20 border border-purple-500/50'
                      : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden flex-shrink-0">
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
                    <div className="font-medium text-white truncate">{user.display_name || user.username}</div>
                    <div className="text-sm text-gray-400 truncate">@{user.username}</div>
                  </div>

                  {/* Status */}
                  {alreadyAssigned ? (
                    <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-1 rounded">
                      Already assigned
                    </span>
                  ) : isSelected ? (
                    <div className="p-1 bg-purple-500 rounded-full">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Selected User Preview */}
          {selectedUser && (
            <div className="p-4 bg-gray-700/50 rounded-xl border border-gray-600">
              <p className="text-sm text-gray-400 mb-2">Selected user:</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                      {(selectedUser.display_name || selectedUser.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-white">{selectedUser.display_name || selectedUser.username}</p>
                  <p className="text-sm text-gray-400">@{selectedUser.username}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedUser || isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Adding...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Confirm Assignment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

