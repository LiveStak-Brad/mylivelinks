'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, 
  LayoutTemplate, 
  Search, 
  Filter, 
  RefreshCw,
  ChevronLeft,
  LayoutGrid,
  List,
  ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SkeletonCard } from '@/components/ui';
import { PageShell, PageHeader, PageSection } from '@/components/layout';
import RoomRow, { RoomInstance } from '@/components/owner/RoomRow';
import { RoomRolesPanel, RoleUser } from '@/components/admin';

type ViewMode = 'rooms' | 'templates';
type SortBy = 'name' | 'status' | 'interest' | 'created';

export default function OwnerRoomsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ViewMode>('rooms');
  const [rooms, setRooms] = useState<RoomInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('created');
  const [isOwner, setIsOwner] = useState(false);
  
  // Roles panel state
  const [selectedRoom, setSelectedRoom] = useState<RoomInstance | null>(null);
  const [roomAdmins, setRoomAdmins] = useState<RoleUser[]>([]);
  const [roomModerators, setRoomModerators] = useState<RoleUser[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/rooms');
      if (!res.ok) throw new Error('Failed to fetch rooms');
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkIsOwner = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        const data = await res.json();
        setIsOwner(data.profile?.is_owner === true);
      }
    } catch (err) {
      console.error('Error checking owner status:', err);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    checkIsOwner();
  }, [fetchRooms, checkIsOwner]);

  const handleEdit = (room: RoomInstance) => {
    router.push(`/owner/rooms/${room.id}`);
  };

  const handleManageRoles = async (room: RoomInstance) => {
    console.log('[ROLES] Opening roles panel for room:', room.id, room.name);
    setSelectedRoom(room);
    setRolesLoading(true);
    
    try {
      const res = await fetch(`/api/admin/rooms/${room.id}/roles`);
      const data = await res.json();
      
      if (res.ok) {
        console.log('[ROLES] Fetched roles:', data);
        setRoomAdmins(data.admins || []);
        setRoomModerators(data.moderators || []);
      } else {
        console.error('[ROLES] API error:', res.status, data?.error);
        // Still show the panel but with empty roles
        setRoomAdmins([]);
        setRoomModerators([]);
      }
    } catch (err) {
      console.error('[ROLES] Error fetching roles:', err);
      setRoomAdmins([]);
      setRoomModerators([]);
    } finally {
      setRolesLoading(false);
    }
  };

  const handleDuplicate = async (room: RoomInstance) => {
    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_key: `${room.room_key}-copy-${Date.now()}`,
          name: `${room.name} (Copy)`,
          description: room.description,
          category: room.category,
          image_url: room.image_url,
          fallback_gradient: room.fallback_gradient,
          interest_threshold: room.interest_threshold,
          status: 'draft',
          disclaimer_required: room.disclaimer_required,
          disclaimer_text: room.disclaimer_text,
          special_badge: room.special_badge,
        }),
      });
      
      if (res.ok) {
        await fetchRooms();
      }
    } catch (err) {
      console.error('Error duplicating room:', err);
    }
  };

  const handleStatusChange = async (room: RoomInstance, newStatus: RoomInstance['status']) => {
    try {
      const res = await fetch(`/api/admin/rooms/${room.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (res.ok) {
        setRooms(prev => prev.map(r => 
          r.id === room.id ? { ...r, status: newStatus } : r
        ));
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDelete = async (room: RoomInstance) => {
    if (!confirm(`Are you sure you want to delete "${room.name}"?`)) return;
    
    try {
      const res = await fetch(`/api/admin/rooms/${room.id}`, { method: 'DELETE' });
      if (res.ok) {
        setRooms(prev => prev.filter(r => r.id !== room.id));
      }
    } catch (err) {
      console.error('Error deleting room:', err);
    }
  };

  const handleAddAdmin = async (roomId: string, userId: string, username: string) => {
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: userId, role: 'room_admin' }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Error adding admin:', err?.error);
      }
      // Refresh roles
      if (selectedRoom) handleManageRoles(selectedRoom);
    } catch (err) {
      console.error('Error adding admin:', err);
    }
  };

  const handleAddModerator = async (roomId: string, userId: string, username: string) => {
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: userId, role: 'room_moderator' }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Error adding moderator:', err?.error);
      }
      // Refresh roles
      if (selectedRoom) handleManageRoles(selectedRoom);
    } catch (err) {
      console.error('Error adding moderator:', err);
    }
  };

  const handleRemoveAdmin = async (roomId: string, userId: string) => {
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/roles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: userId, role: 'room_admin' }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Error removing admin:', err?.error);
      }
      // Refresh roles
      if (selectedRoom) handleManageRoles(selectedRoom);
    } catch (err) {
      console.error('Error removing admin:', err);
    }
  };

  const handleRemoveModerator = async (roomId: string, userId: string) => {
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/roles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: userId, role: 'room_moderator' }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Error removing moderator:', err?.error);
      }
      // Refresh roles
      if (selectedRoom) handleManageRoles(selectedRoom);
    } catch (err) {
      console.error('Error removing moderator:', err);
    }
  };

  // Filter and sort rooms
  const filteredRooms = rooms
    .filter(room => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return room.name.toLowerCase().includes(q) || 
             room.room_key.toLowerCase().includes(q) ||
             room.category.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'interest':
          return b.current_interest_count - a.current_interest_count;
        case 'created':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // Roles panel view
  if (selectedRoom) {
    return (
      <PageShell maxWidth="lg" padding="md">
        <RoomRolesPanel
          room={selectedRoom}
          roomAdmins={roomAdmins}
          roomModerators={roomModerators}
          onBack={() => setSelectedRoom(null)}
          onAddAdmin={handleAddAdmin}
          onAddModerator={handleAddModerator}
          onRemoveAdmin={handleRemoveAdmin}
          onRemoveModerator={handleRemoveModerator}
          canManageAdmins={isOwner}
          canManageModerators={true}
          isLoading={rolesLoading}
        />
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="xl" padding="md">
      <PageHeader
        title="Rooms Management"
        description="Create and manage your live rooms"
        backLink="/owner"
        backLabel="Back"
        actions={
          <div className="flex items-center gap-3">
            <Link href="/owner/templates">
              <Button variant="outline" className="gap-2">
                <LayoutTemplate className="w-4 h-4" />
                Templates
              </Button>
            </Link>
            <Link href="/owner/rooms/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Room
              </Button>
            </Link>
          </div>
        }
      />

      {/* Tabs */}
      <PageSection>
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'rooms' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Rooms ({rooms.length})
          </button>
          <Link
            href="/owner/templates"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition"
          >
            <LayoutTemplate className="w-4 h-4" />
            Templates
          </Link>
        </div>
      </PageSection>

      {/* Search & Filters */}
      <PageSection>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rooms..."
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="created">Newest First</option>
              <option value="name">Name A-Z</option>
              <option value="status">Status</option>
              <option value="interest">Most Interest</option>
            </select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRooms}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </PageSection>

      {/* Rooms List */}
      <PageSection>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} showImage={false} textLines={2} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchRooms}>Retry</Button>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-xl">
            <LayoutGrid className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? 'No rooms found' : 'No rooms yet'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery 
                ? 'Try a different search term' 
                : 'Create your first room to get started'
              }
            </p>
            {!searchQuery && (
              <Link href="/owner/rooms/new">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Room
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRooms.map((room) => (
              <RoomRow
                key={room.id}
                room={room}
                onEdit={handleEdit}
                onManageRoles={handleManageRoles}
                onDuplicate={handleDuplicate}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                canDelete={isOwner}
              />
            ))}
          </div>
        )}
      </PageSection>
    </PageShell>
  );
}

