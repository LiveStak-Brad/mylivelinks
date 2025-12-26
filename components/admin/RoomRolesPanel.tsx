'use client';

import { useState } from 'react';
import { X, Shield, Users, Plus, ChevronLeft, Crown } from 'lucide-react';
import RoleUserRow, { RoleUser } from './RoleUserRow';
import AddRoleModal from './AddRoleModal';

interface Room {
  id: string;
  name: string;
  image_url: string | null;
  status: string;
  category: string;
}

interface RoomRolesPanelProps {
  room: Room;
  roomAdmins: RoleUser[];
  roomModerators: RoleUser[];
  onBack: () => void;
  onAddAdmin: (roomId: string, userId: string, username: string) => void;
  onAddModerator: (roomId: string, userId: string, username: string) => void;
  onRemoveAdmin: (roomId: string, userId: string) => void;
  onRemoveModerator: (roomId: string, userId: string) => void;
  canManageAdmins: boolean;
  canManageModerators: boolean;
  isLoading?: boolean;
}

export default function RoomRolesPanel({
  room,
  roomAdmins,
  roomModerators,
  onBack,
  onAddAdmin,
  onAddModerator,
  onRemoveAdmin,
  onRemoveModerator,
  canManageAdmins,
  canManageModerators,
  isLoading = false,
}: RoomRolesPanelProps) {
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showAddModModal, setShowAddModModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4">
          {/* Room Image */}
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-700">
            {room.image_url ? (
              <img src={room.image_url} alt={room.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{room.name}</h3>
            <p className="text-sm text-gray-400">
              Manage admins and moderators for this room
            </p>
          </div>
        </div>
      </div>

      {/* Room Admins Section */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-400" />
            <h4 className="font-semibold text-white">Room Admins</h4>
            <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full">
              {roomAdmins.length}
            </span>
          </div>
          {canManageAdmins && (
            <button
              onClick={() => setShowAddAdminModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Add Admin
            </button>
          )}
        </div>
        <div className="p-4 space-y-3">
          {roomAdmins.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No room admins assigned</p>
              {canManageAdmins && (
                <p className="text-sm mt-1">Add an admin to help manage this room</p>
              )}
            </div>
          ) : (
            roomAdmins.map((admin) => (
              <RoleUserRow
                key={admin.id}
                user={admin}
                onRemove={() => onRemoveAdmin(room.id, admin.id)}
                canRemove={canManageAdmins}
                isLoading={isLoading}
              />
            ))
          )}
        </div>
      </div>

      {/* Room Moderators Section */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-green-400" />
            <h4 className="font-semibold text-white">Room Moderators</h4>
            <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full">
              {roomModerators.length}
            </span>
          </div>
          {canManageModerators && (
            <button
              onClick={() => setShowAddModModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
            >
              <Plus className="w-4 h-4" />
              Add Moderator
            </button>
          )}
        </div>
        <div className="p-4 space-y-3">
          {roomModerators.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No moderators assigned</p>
              {canManageModerators && (
                <p className="text-sm mt-1">Add moderators to help manage chat and users</p>
              )}
            </div>
          ) : (
            roomModerators.map((mod) => (
              <RoleUserRow
                key={mod.id}
                user={mod}
                onRemove={() => onRemoveModerator(room.id, mod.id)}
                canRemove={canManageModerators}
                isLoading={isLoading}
              />
            ))
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <h5 className="font-medium text-white mb-2">About Room Roles</h5>
        <ul className="text-sm text-gray-400 space-y-1">
          <li className="flex items-start gap-2">
            <Crown className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <span><strong className="text-amber-400">Owner</strong> has full privileges everywhere and cannot be removed.</span>
          </li>
          <li className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <span><strong className="text-blue-400">Room Admins</strong> can manage the room, add/remove moderators, and have full moderation powers.</span>
          </li>
          <li className="flex items-start gap-2">
            <Users className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span><strong className="text-green-400">Moderators</strong> can mute users, delete messages, and time out participants in this room only.</span>
          </li>
        </ul>
      </div>

      {/* Add Admin Modal */}
      <AddRoleModal
        isOpen={showAddAdminModal}
        onClose={() => setShowAddAdminModal(false)}
        onConfirm={(userId, username) => {
          onAddAdmin(room.id, userId, username);
          setShowAddAdminModal(false);
        }}
        roleType="room_admin"
        roomName={room.name}
        existingUserIds={roomAdmins.map((a) => a.profile_id)}
        isLoading={isLoading}
      />

      {/* Add Moderator Modal */}
      <AddRoleModal
        isOpen={showAddModModal}
        onClose={() => setShowAddModModal(false)}
        onConfirm={(userId, username) => {
          onAddModerator(room.id, userId, username);
          setShowAddModModal(false);
        }}
        roleType="room_moderator"
        roomName={room.name}
        existingUserIds={roomModerators.map((m) => m.profile_id)}
        isLoading={isLoading}
      />
    </div>
  );
}

