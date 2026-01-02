'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import Card from './ui-kit/Card';
import Badge from './ui-kit/Badge';
import { TableCell } from './ui-kit/Table';
import EmptyState from './ui-kit/EmptyState';
import BannerUploader from './BannerUploader';
import Drawer from './ui-kit/Drawer';
import { 
  Plus, 
  Search, 
  Users, 
  Globe, 
  Lock, 
  Vote, 
  Rocket, 
  Archive,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Radio,
  ChevronDown,
  AlertCircle,
  Check,
  X
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface Room {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: 'official' | 'team' | 'community';
  visibility: 'public' | 'private' | 'team_only';
  status: 'draft' | 'voting' | 'scheduled' | 'live' | 'archived';
  team_id: string | null;
  team_name: string | null;
  team_slug: string | null;
  admin_profile_id: string;
  admin_username: string | null;
  grid_size: number;
  icon_url: string | null;
  banner_url: string | null;
  vote_count: number;
  current_viewer_count: number;
  current_streamer_count: number;
  created_at: string;
  launched_at: string | null;
}

interface Team {
  id: string;
  name: string;
  slug: string;
  approved_member_count: number;
  icon_url: string | null;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

type LaunchOption = 'live' | 'voting' | 'team' | 'draft';

// ============================================================================
// Create Room Form
// ============================================================================

interface CreateRoomFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  teams: Team[];
  admins: Profile[];
}

function CreateRoomForm({ onSubmit, onCancel, isLoading, teams, admins }: CreateRoomFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    type: 'official' as 'official' | 'team' | 'community',
    visibility: 'public' as 'public' | 'private' | 'team_only',
    status: 'draft' as 'draft' | 'voting' | 'live',
    team_id: null as string | null,
    admin_profile_id: null as string | null,
    grid_size: 12,
    icon_url: null as string | null,
    banner_url: null as string | null,
  });
  
  const [launchOption, setLaunchOption] = useState<LaunchOption>('draft');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const eligibleTeams = teams.filter(t => t.approved_member_count >= 100);
  const ineligibleTeams = teams.filter(t => t.approved_member_count < 100);
  
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Auto-generate slug from name
    if (field === 'name') {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  };
  
  const handleLaunchOptionChange = (option: LaunchOption) => {
    setLaunchOption(option);
    
    switch (option) {
      case 'live':
        setFormData(prev => ({ 
          ...prev, 
          type: 'official',
          visibility: 'public',
          status: 'live',
          team_id: null,
        }));
        break;
      case 'voting':
        setFormData(prev => ({ 
          ...prev, 
          type: 'community',
          visibility: 'public',
          status: 'voting',
          team_id: null,
        }));
        break;
      case 'team':
        setFormData(prev => ({ 
          ...prev, 
          type: 'team',
          visibility: 'team_only',
          status: 'draft',
        }));
        break;
      case 'draft':
        setFormData(prev => ({ 
          ...prev, 
          type: 'official',
          visibility: 'public',
          status: 'draft',
          team_id: null,
        }));
        break;
    }
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Room name is required';
    }
    
    if (!formData.slug.trim()) {
      newErrors.slug = 'Room slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug must be lowercase letters, numbers, and hyphens only';
    }
    
    if (launchOption === 'team' && !formData.team_id) {
      newErrors.team_id = 'Please select a team';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      await onSubmit(formData);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Room Details</h3>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Room Name <span className="text-destructive">*</span>
          </label>
          <Input
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Gaming Central"
            error={!!errors.name}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            URL Slug <span className="text-destructive">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">mylivelinks.com/room/</span>
            <Input
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="gaming-central"
              error={!!errors.slug}
              className="flex-1"
            />
          </div>
          {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Description
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="What's this room about?"
            rows={2}
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Room Admin
          </label>
          <div className="relative">
            <select
              value={formData.admin_profile_id || ''}
              onChange={(e) => handleChange('admin_profile_id', e.target.value || null)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Use my account</option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  @{admin.username}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>
      
      {/* Launch Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Launch Option</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Launch to Everyone */}
          <button
            type="button"
            onClick={() => handleLaunchOptionChange('live')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              launchOption === 'live' 
                ? 'border-green-500 bg-green-500/10' 
                : 'border-border hover:border-muted-foreground/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${launchOption === 'live' ? 'bg-green-500/20' : 'bg-muted'}`}>
                <Rocket className={`w-5 h-5 ${launchOption === 'live' ? 'text-green-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <div className="font-medium text-foreground">Launch to Everyone</div>
                <div className="text-sm text-muted-foreground">Public room on LiveTV</div>
              </div>
            </div>
          </button>
          
          {/* Future Room (Voting) */}
          <button
            type="button"
            onClick={() => handleLaunchOptionChange('voting')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              launchOption === 'voting' 
                ? 'border-purple-500 bg-purple-500/10' 
                : 'border-border hover:border-muted-foreground/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${launchOption === 'voting' ? 'bg-purple-500/20' : 'bg-muted'}`}>
                <Vote className={`w-5 h-5 ${launchOption === 'voting' ? 'text-purple-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <div className="font-medium text-foreground">Future Room (Voting)</div>
                <div className="text-sm text-muted-foreground">Let users vote on home page</div>
              </div>
            </div>
          </button>
          
          {/* Team Room */}
          <button
            type="button"
            onClick={() => handleLaunchOptionChange('team')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              launchOption === 'team' 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-border hover:border-muted-foreground/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${launchOption === 'team' ? 'bg-blue-500/20' : 'bg-muted'}`}>
                <Users className={`w-5 h-5 ${launchOption === 'team' ? 'text-blue-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <div className="font-medium text-foreground">Assign to Team</div>
                <div className="text-sm text-muted-foreground">Private team room (100+ members)</div>
              </div>
            </div>
          </button>
          
          {/* Save as Draft */}
          <button
            type="button"
            onClick={() => handleLaunchOptionChange('draft')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              launchOption === 'draft' 
                ? 'border-amber-500 bg-amber-500/10' 
                : 'border-border hover:border-muted-foreground/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${launchOption === 'draft' ? 'bg-amber-500/20' : 'bg-muted'}`}>
                <Archive className={`w-5 h-5 ${launchOption === 'draft' ? 'text-amber-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <div className="font-medium text-foreground">Save as Draft</div>
                <div className="text-sm text-muted-foreground">Configure later</div>
              </div>
            </div>
          </button>
        </div>
      </div>
      
      {/* Team Selection (if team option selected) */}
      {launchOption === 'team' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Select Team</h3>
          
          {eligibleTeams.length === 0 ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <div className="font-medium text-amber-200">No Eligible Teams</div>
                  <div className="text-sm text-amber-200/70">
                    Teams need at least 100 members to have a live room.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <select
                  value={formData.team_id || ''}
                  onChange={(e) => handleChange('team_id', e.target.value || null)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a team...</option>
                {eligibleTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.approved_member_count} members)
                  </option>
                ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              {errors.team_id && <p className="text-sm text-destructive">{errors.team_id}</p>}
            </div>
          )}
          
          {/* Visibility toggle for team rooms */}
          {formData.team_id && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Room Visibility
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('visibility', 'team_only')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    formData.visibility === 'team_only' 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Lock className={`w-4 h-4 ${formData.visibility === 'team_only' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                    <span className="font-medium">Private (Team Only)</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('visibility', 'public')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    formData.visibility === 'public' 
                      ? 'border-green-500 bg-green-500/10' 
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Globe className={`w-4 h-4 ${formData.visibility === 'public' ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className="font-medium">Public</span>
                  </div>
                </button>
              </div>
            </div>
          )}
          
          {/* Show ineligible teams */}
          {ineligibleTeams.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{ineligibleTeams.length} teams</span> don't meet the 100 member requirement yet
            </div>
          )}
        </div>
      )}
      
      {/* Grid Size */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Grid Size
        </label>
        <div className="flex gap-2">
          {[4, 6, 9, 12].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => handleChange('grid_size', size)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                formData.grid_size === size 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              {size} boxes
            </button>
          ))}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {launchOption === 'live' ? 'Create & Launch' : 
           launchOption === 'voting' ? 'Create & Open Voting' :
           launchOption === 'team' ? 'Create Team Room' : 'Save Draft'}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Room Management Panel
// ============================================================================

export default function RoomManagement() {
  const supabase = createClient();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('rpc_get_all_rooms');
      if (error) throw error;
      setRooms((data as Room[]) || []);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);
  
  const fetchTeams = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, slug, approved_member_count, icon_url')
        .order('approved_member_count', { ascending: false });
      if (error) throw error;
      setTeams((data as Team[]) || []);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    }
  }, [supabase]);
  
  const fetchAdmins = useCallback(async () => {
    try {
      // Get platform admins or notable users
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .not('username', 'is', null)
        .order('username')
        .limit(100);
      if (error) throw error;
      setAdmins((data as Profile[]) || []);
    } catch (err) {
      console.error('Failed to fetch admins:', err);
    }
  }, [supabase]);
  
  useEffect(() => {
    fetchRooms();
    fetchTeams();
    fetchAdmins();
  }, [fetchRooms, fetchTeams, fetchAdmins]);
  
  const handleCreateRoom = async (data: any) => {
    setIsCreating(true);
    try {
      const { error } = await supabase.rpc('rpc_create_room', {
        p_name: data.name,
        p_slug: data.slug,
        p_type: data.type,
        p_visibility: data.visibility,
        p_status: data.status,
        p_description: data.description || null,
        p_team_id: data.team_id || null,
        p_admin_profile_id: data.admin_profile_id || null,
        p_grid_size: data.grid_size,
        p_icon_url: data.icon_url || null,
        p_banner_url: data.banner_url || null,
      });
      
      if (error) throw error;
      
      setShowCreateDrawer(false);
      fetchRooms();
    } catch (err: any) {
      console.error('Failed to create room:', err);
      alert(err?.message || 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleLaunchRoom = async (roomId: string) => {
    try {
      const { error } = await supabase.rpc('rpc_launch_room', { p_room_id: roomId });
      if (error) throw error;
      fetchRooms();
    } catch (err: any) {
      console.error('Failed to launch room:', err);
      alert(err?.message || 'Failed to launch room');
    }
  };
  
  const handleArchiveRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to archive this room?')) return;
    try {
      const { error } = await supabase.rpc('rpc_archive_room', { p_room_id: roomId });
      if (error) throw error;
      fetchRooms();
    } catch (err: any) {
      console.error('Failed to archive room:', err);
      alert(err?.message || 'Failed to archive room');
    }
  };
  
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = !searchQuery || 
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge variant="success" className="gap-1"><Radio className="w-3 h-3" /> Live</Badge>;
      case 'voting':
        return <Badge variant="default" className="gap-1"><Vote className="w-3 h-3" /> Voting</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'archived':
        return <Badge variant="default">Archived</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };
  
  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe className="w-4 h-4 text-green-500" />;
      case 'team_only':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'private':
        return <Lock className="w-4 h-4 text-amber-500" />;
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Room Management</h2>
          <p className="text-muted-foreground">Create and manage live rooms</p>
        </div>
        <Button onClick={() => setShowCreateDrawer(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Room
        </Button>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rooms..."
            className="pl-9"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring pr-8"
          >
            <option value="all">All Status</option>
            <option value="live">Live</option>
            <option value="voting">Voting</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Rooms</div>
          <div className="text-2xl font-bold">{rooms.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Live Now</div>
          <div className="text-2xl font-bold text-green-500">
            {rooms.filter(r => r.status === 'live').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Voting</div>
          <div className="text-2xl font-bold text-purple-500">
            {rooms.filter(r => r.status === 'voting').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Team Rooms</div>
          <div className="text-2xl font-bold text-blue-500">
            {rooms.filter(r => r.type === 'team').length}
          </div>
        </Card>
      </div>
      
      {/* Rooms Table */}
      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading rooms...</div>
        ) : filteredRooms.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No rooms found"
            description={searchQuery ? "Try a different search term" : "Create your first room to get started"}
            action={
              <Button onClick={() => setShowCreateDrawer(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Room
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Room</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Admin</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">Viewers</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">Votes</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room) => (
                  <tr
                    key={room.id}
                    className="border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors"
                  >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {getVisibilityIcon(room.visibility)}
                      <div>
                        <div className="font-medium">{room.name}</div>
                        <div className="text-sm text-muted-foreground">/room/{room.slug}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="capitalize">
                      {room.type}
                      {room.team_name && ` • ${room.team_name}`}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(room.status)}</TableCell>
                  <TableCell>
                    <span className="text-sm">@{room.admin_username || 'unknown'}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      {room.current_viewer_count}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {room.status === 'voting' && (
                      <span className="font-medium">{room.vote_count}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {room.status === 'draft' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleLaunchRoom(room.id)}
                          className="gap-1"
                        >
                          <Rocket className="w-3 h-3" />
                          Launch
                        </Button>
                      )}
                      {room.status === 'live' && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleArchiveRoom(room.id)}
                          className="gap-1 text-destructive hover:text-destructive"
                        >
                          <Archive className="w-3 h-3" />
                          Archive
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      
      {/* Create Room Drawer */}
      <Drawer
        isOpen={showCreateDrawer}
        onClose={() => setShowCreateDrawer(false)}
        title="Create New Room"
      >
        <CreateRoomForm
          onSubmit={handleCreateRoom}
          onCancel={() => setShowCreateDrawer(false)}
          isLoading={isCreating}
          teams={teams}
          admins={admins}
        />
      </Drawer>
    </div>
  );
}
