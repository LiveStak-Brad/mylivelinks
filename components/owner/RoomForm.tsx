'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase';
import BannerUploader from './BannerUploader';
import { 
  LayoutGrid, 
  LayoutTemplate, 
  Users, 
  MessageSquare, 
  Gift, 
  AlertTriangle,
  ChevronDown,
  Globe,
  Lock,
  Vote,
  Rocket,
  Archive,
  AlertCircle
} from 'lucide-react';

export interface RoomFormData {
  room_key: string;
  name: string;
  description: string;
  category: string;
  image_url: string | null;
  fallback_gradient: string;
  interest_threshold: number;
  status: string;
  disclaimer_required: boolean;
  disclaimer_text: string;
  special_badge: string;
  layout_type: string;
  max_participants: number;
  theme_color: string;
  background_image: string | null;
  subtitle: string;
  gifts_enabled: boolean;
  chat_enabled: boolean;
  // New fields for room type/visibility
  room_type: 'official' | 'team' | 'community';
  visibility: 'public' | 'private' | 'team_only';
  team_id: string | null;
  admin_profile_id: string | null;
}

interface Team {
  id: string;
  name: string;
  slug: string;
  approved_member_count: number;
}

interface Profile {
  id: string;
  username: string;
}

interface RoomFormProps {
  initialData?: Partial<RoomFormData>;
  templateDefaults?: Partial<RoomFormData>;
  onSubmit: (data: RoomFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  roomId?: string;
}

const categories = ['gaming', 'music', 'entertainment', 'sports', 'lifestyle', 'education'];
const statuses = [
  { value: 'draft', label: 'Draft' },
  { value: 'interest', label: 'Gauging Interest' },
  { value: 'opening_soon', label: 'Opening Soon' },
  { value: 'live', label: 'Live' },
  { value: 'paused', label: 'Paused' },
];
const layoutTypes = [
  { value: 'grid', label: 'Grid Layout', icon: LayoutGrid },
  { value: 'versus', label: 'Versus Layout', icon: LayoutTemplate },
  { value: 'panel', label: 'Panel Layout', icon: LayoutTemplate },
];
const gradients = [
  'from-purple-600 to-pink-600',
  'from-blue-600 to-cyan-500',
  'from-green-600 to-emerald-500',
  'from-orange-500 to-red-600',
  'from-violet-600 to-indigo-600',
  'from-rose-500 to-pink-500',
  'from-amber-500 to-yellow-400',
  'from-teal-500 to-cyan-400',
];

export default function RoomForm({
  initialData,
  templateDefaults,
  onSubmit,
  onCancel,
  isLoading = false,
  mode,
  roomId,
}: RoomFormProps) {
  const supabase = createClient();
  const defaults = { ...templateDefaults, ...initialData };
  
  const [formData, setFormData] = useState<RoomFormData>({
    room_key: defaults.room_key || '',
    name: defaults.name || '',
    description: defaults.description || '',
    category: defaults.category || 'entertainment',
    image_url: defaults.image_url || null,
    fallback_gradient: defaults.fallback_gradient || 'from-purple-600 to-pink-600',
    interest_threshold: defaults.interest_threshold || 5000,
    status: defaults.status || 'interest',
    disclaimer_required: defaults.disclaimer_required || false,
    disclaimer_text: defaults.disclaimer_text || '',
    special_badge: defaults.special_badge || '',
    layout_type: defaults.layout_type || 'grid',
    max_participants: defaults.max_participants || 12,
    theme_color: defaults.theme_color || '',
    background_image: defaults.background_image || null,
    subtitle: defaults.subtitle || '',
    gifts_enabled: defaults.gifts_enabled ?? true,
    chat_enabled: defaults.chat_enabled ?? true,
    // New fields
    room_type: defaults.room_type || 'official',
    visibility: defaults.visibility || 'public',
    team_id: defaults.team_id || null,
    admin_profile_id: defaults.admin_profile_id || null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Fetch teams and admins
  useEffect(() => {
    const fetchData = async () => {
      // Check if current user is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: adminCheck } = await supabase.rpc('is_admin', { p_profile_id: user.id });
        setIsAdmin(adminCheck === true);
      }
      
      // Fetch teams
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, slug, approved_member_count')
        .order('approved_member_count', { ascending: false });
      if (teamsData) setTeams(teamsData);
      
      // Fetch profiles for admin selection
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username')
        .not('username', 'is', null)
        .order('username')
        .limit(100);
      if (profilesData) setAdmins(profilesData);
    };
    fetchData();
  }, [supabase]);
  
  // Admins can use any team, others need 100+ members
  const eligibleTeams = isAdmin ? teams : teams.filter(t => t.approved_member_count >= 100);
  const ineligibleTeams = isAdmin ? [] : teams.filter(t => t.approved_member_count < 100);

  const handleChange = (field: keyof RoomFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.room_key.trim()) {
      newErrors.room_key = 'Room key is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.room_key)) {
      newErrors.room_key = 'Room key must be lowercase letters, numbers, and hyphens only';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Room name is required';
    }
    
    if (formData.interest_threshold < 1) {
      newErrors.interest_threshold = 'Threshold must be at least 1';
    }
    
    if (formData.max_participants < 1 || formData.max_participants > 100) {
      newErrors.max_participants = 'Max participants must be between 1 and 100';
    }

    if (formData.disclaimer_required && !formData.disclaimer_text.trim()) {
      newErrors.disclaimer_text = 'Disclaimer text is required when disclaimer is enabled';
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
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Appearance Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-foreground">Appearance</h3>
        
        {/* Title Banner Gradient */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Title Banner Gradient
          </label>
          <div className="flex flex-wrap gap-2">
            {gradients.map((gradient) => (
              <button
                key={gradient}
                type="button"
                onClick={() => handleChange('fallback_gradient', gradient)}
                className={`w-14 h-10 rounded-lg bg-gradient-to-r ${gradient} transition-all ${
                  formData.fallback_gradient === gradient 
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' 
                    : 'hover:scale-105'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Used for the room title banner and cards</p>
        </div>
        
        {/* Background Image */}
        <BannerUploader
          currentUrl={formData.background_image}
          onUpload={(url) => handleChange('background_image', url)}
          onClear={() => handleChange('background_image', null)}
          roomKeyOrId={roomId || formData.room_key || 'new-room'}
          label="Background Image (optional)"
        />
        <p className="text-xs text-muted-foreground -mt-2">
          Subtle background that sits behind the room content. Works best with dark, atmospheric images.
        </p>
      </div>

      {/* Basic Info Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Room Key <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.room_key}
              onChange={(e) => handleChange('room_key', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="my-room-name"
              error={!!errors.room_key}
              disabled={mode === 'edit'}
            />
            {errors.room_key && <p className="text-sm text-destructive">{errors.room_key}</p>}
            <p className="text-xs text-muted-foreground">Used in the URL: mylivelinks.com/room/{formData.room_key || 'room-key'}</p>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Room Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="My Awesome Room"
              error={!!errors.name}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Subtitle (optional)
          </label>
          <Input
            value={formData.subtitle}
            onChange={(e) => handleChange('subtitle', e.target.value)}
            placeholder="A short tagline for your room"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Description
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe what this room is about..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Category
            </label>
            <div className="relative">
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="capitalize">
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Special Badge (optional)
            </label>
            <Input
              value={formData.special_badge}
              onChange={(e) => handleChange('special_badge', e.target.value)}
              placeholder="e.g. 'Comedy / Roast'"
            />
          </div>
        </div>
      </div>

      {/* Room Type & Assignment Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Room Type & Assignment</h3>
        
        {/* Room Type Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Room Type</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                handleChange('room_type', 'official');
                handleChange('team_id', null);
                handleChange('visibility', 'public');
                handleChange('status', 'live'); // Auto-launch to LiveTV
              }}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                formData.room_type === 'official' 
                  ? 'border-green-500 bg-green-500/10' 
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${formData.room_type === 'official' ? 'bg-green-500/20' : 'bg-muted'}`}>
                  <Rocket className={`w-5 h-5 ${formData.room_type === 'official' ? 'text-green-500' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <div className="font-medium text-foreground">Official Room</div>
                  <div className="text-xs text-muted-foreground">Public on LiveTV</div>
                </div>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => {
                handleChange('room_type', 'team');
                handleChange('visibility', 'team_only');
                handleChange('status', 'live'); // Live within the team
              }}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                formData.room_type === 'team' 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${formData.room_type === 'team' ? 'bg-blue-500/20' : 'bg-muted'}`}>
                  <Users className={`w-5 h-5 ${formData.room_type === 'team' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <div className="font-medium text-foreground">Team Room</div>
                  <div className="text-xs text-muted-foreground">Assign to a team</div>
                </div>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => {
                handleChange('room_type', 'community');
                handleChange('team_id', null);
                handleChange('visibility', 'public');
                handleChange('status', 'interest');
              }}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                formData.room_type === 'community' 
                  ? 'border-purple-500 bg-purple-500/10' 
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${formData.room_type === 'community' ? 'bg-purple-500/20' : 'bg-muted'}`}>
                  <Vote className={`w-5 h-5 ${formData.room_type === 'community' ? 'text-purple-500' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <div className="font-medium text-foreground">Community Vote</div>
                  <div className="text-xs text-muted-foreground">Let users vote</div>
                </div>
              </div>
            </button>
          </div>
        </div>
        
        {/* Team Selection (if team type) */}
        {formData.room_type === 'team' && (
          <div className="space-y-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Assign to Team <span className="text-destructive">*</span>
              </label>
              {eligibleTeams.length === 0 ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-amber-200">No Eligible Teams</div>
                      <div className="text-sm text-amber-200/70">
                        {isAdmin 
                          ? 'No teams found. Create a team first.'
                          : 'Teams need at least 100 members to have a live room.'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
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
              )}
              {errors.team_id && <p className="text-sm text-destructive">{errors.team_id}</p>}
              {ineligibleTeams.length > 0 && !isAdmin && (
                <p className="text-xs text-muted-foreground">
                  {ineligibleTeams.length} teams don't meet the 100 member requirement
                </p>
              )}
              {isAdmin && (
                <p className="text-xs text-green-500">
                  ✓ Admin bypass: All teams available regardless of member count
                </p>
              )}
            </div>
            
            {/* Visibility for team rooms */}
            {formData.team_id && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Visibility</label>
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
          </div>
        )}
        
        {/* Room Admin Selection */}
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
              <option value="">Use my account (default)</option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  @{admin.username}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <p className="text-xs text-muted-foreground">The admin can manage the room, go live, and moderate</p>
        </div>
      </div>

      {/* Settings Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Status
            </label>
            <div className="relative">
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Layout Type
            </label>
            <div className="relative">
              <select
                value={formData.layout_type}
                onChange={(e) => handleChange('layout_type', e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {layoutTypes.map((lt) => (
                  <option key={lt.value} value={lt.value}>
                    {lt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Max Participants
            </label>
            <Input
              type="number"
              min={1}
              max={100}
              value={formData.max_participants}
              onChange={(e) => handleChange('max_participants', parseInt(e.target.value) || 12)}
              error={!!errors.max_participants}
            />
            {errors.max_participants && <p className="text-sm text-destructive">{errors.max_participants}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Interest Threshold
          </label>
          <Input
            type="number"
            min={1}
            value={formData.interest_threshold}
            onChange={(e) => handleChange('interest_threshold', parseInt(e.target.value) || 5000)}
            error={!!errors.interest_threshold}
          />
          <p className="text-xs text-muted-foreground">Number of interested users needed before the room can open</p>
          {errors.interest_threshold && <p className="text-sm text-destructive">{errors.interest_threshold}</p>}
        </div>
      </div>

      {/* Feature Flags */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Features</h3>
        
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition">
            <input
              type="checkbox"
              checked={formData.gifts_enabled}
              onChange={(e) => handleChange('gifts_enabled', e.target.checked)}
              className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
            />
            <Gift className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Gifts Enabled</span>
          </label>
          
          <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition">
            <input
              type="checkbox"
              checked={formData.chat_enabled}
              onChange={(e) => handleChange('chat_enabled', e.target.checked)}
              className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
            />
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Chat Enabled</span>
          </label>
        </div>
      </div>

      {/* Disclaimer Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Disclaimer</h3>
        
        <label className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg cursor-pointer hover:bg-amber-500/15 transition">
          <input
            type="checkbox"
            checked={formData.disclaimer_required}
            onChange={(e) => handleChange('disclaimer_required', e.target.checked)}
            className="w-4 h-4 rounded border-amber-500/50 text-amber-500 focus:ring-amber-500"
          />
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-200">Require consent disclaimer before entering</span>
        </label>
        
        {formData.disclaimer_required && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Disclaimer Text <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={formData.disclaimer_text}
              onChange={(e) => handleChange('disclaimer_text', e.target.value)}
              placeholder="Enter the disclaimer text users must agree to..."
              rows={4}
              error={!!errors.disclaimer_text}
            />
            {errors.disclaimer_text && <p className="text-sm text-destructive">{errors.disclaimer_text}</p>}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
        >
          {mode === 'create' ? 'Create Room' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}







