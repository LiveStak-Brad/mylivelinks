'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Settings, 
  Palette, 
  Users, 
  Eye,
  Save,
  Loader2,
  ExternalLink,
  Heart,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import BannerUploader from '@/components/owner/BannerUploader';
import { RoomRolesPanel, RoleUser } from '@/components/admin';
import RoomCard from '@/components/rooms/RoomCard';
import { useToast } from '@/components/ui';

type TabId = 'settings' | 'appearance' | 'roles' | 'preview';

interface RoomData {
  id: string;
  room_key: string;
  name: string;
  description: string | null;
  category: string;
  image_url: string | null;
  fallback_gradient: string;
  interest_threshold: number;
  current_interest_count: number;
  status: string;
  display_order: number;
  disclaimer_required: boolean;
  disclaimer_text: string | null;
  special_badge: string | null;
  layout_type: string;
  max_participants: number;
  theme_color: string | null;
  background_image: string | null;
  subtitle: string | null;
  gifts_enabled: boolean;
  chat_enabled: boolean;
  template_id: string | null;
  created_at: string;
  updated_at: string;
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
  { value: 'grid', label: 'Grid Layout' },
  { value: 'versus', label: 'Versus Layout' },
  { value: 'panel', label: 'Panel Layout' },
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

export default function EditRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabId>('settings');
  const [room, setRoom] = useState<RoomData | null>(null);
  const [formData, setFormData] = useState<Partial<RoomData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  
  // Roles state
  const [roomAdmins, setRoomAdmins] = useState<RoleUser[]>([]);
  const [roomModerators, setRoomModerators] = useState<RoleUser[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}`);
      if (!res.ok) throw new Error('Room not found');
      const data = await res.json();
      setRoom(data.room);
      setFormData(data.room);
    } catch (err) {
      console.error('Error fetching room:', err);
      router.push('/owner/rooms');
    } finally {
      setLoading(false);
    }
  }, [roomId, router]);

  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/roles`);
      if (res.ok) {
        const data = await res.json();
        setRoomAdmins(data.admins || []);
        setRoomModerators(data.moderators || []);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    } finally {
      setRolesLoading(false);
    }
  }, [roomId]);

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
    fetchRoom();
    checkIsOwner();
  }, [fetchRoom, checkIsOwner]);

  useEffect(() => {
    if (activeTab === 'roles') {
      fetchRoles();
    }
  }, [activeTab, fetchRoles]);

  const handleChange = (field: keyof RoomData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        const data = await res.json();
        setRoom(data.room);
        setFormData(data.room);
        setHasChanges(false);
      } else {
        const err = await res.json();
        toast({
          title: 'Save failed',
          description: err?.error || 'Failed to save changes',
          variant: 'error',
        });
      }
    } catch (err) {
      console.error('Error saving room:', err);
      toast({
        title: 'Save failed',
        description: 'Failed to save changes',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdmin = async (roomId: string, userId: string) => {
    try {
      await fetch(`/api/admin/rooms/${roomId}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: userId }),
      });
      fetchRoles();
    } catch (err) {
      console.error('Error adding admin:', err);
    }
  };

  const handleAddModerator = async (roomId: string, userId: string) => {
    try {
      await fetch(`/api/admin/rooms/${roomId}/moderators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: userId }),
      });
      fetchRoles();
    } catch (err) {
      console.error('Error adding moderator:', err);
    }
  };

  const handleRemoveAdmin = async (roomId: string, userId: string) => {
    try {
      await fetch(`/api/admin/rooms/${roomId}/admins`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: userId }),
      });
      fetchRoles();
    } catch (err) {
      console.error('Error removing admin:', err);
    }
  };

  const handleRemoveModerator = async (roomId: string, userId: string) => {
    try {
      await fetch(`/api/admin/rooms/${roomId}/moderators`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: userId }),
      });
      fetchRoles();
    } catch (err) {
      console.error('Error removing moderator:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Room not found</p>
          <Link href="/owner/rooms">
            <Button>Back to Rooms</Button>
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: typeof Settings }[] = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'roles', label: 'Roles', icon: Users },
    { id: 'preview', label: 'Preview', icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link 
              href="/owner/rooms" 
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{room.name}</h1>
                <a
                  href={`/${room.room_key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground bg-muted rounded transition"
                >
                  <ExternalLink className="w-3 h-3" />
                  View
                </a>
              </div>
              <p className="text-muted-foreground text-sm">/{room.room_key}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {hasChanges && (
              <Button
                onClick={handleSave}
                isLoading={saving}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg mb-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition ${
                  activeTab === tab.id 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-card border border-border rounded-xl p-6">
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Room Key</label>
                  <Input value={room.room_key} disabled className="bg-muted/50" />
                  <p className="text-xs text-muted-foreground">Room key cannot be changed</p>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Room Name</label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Subtitle</label>
                <Input
                  value={formData.subtitle || ''}
                  onChange={(e) => handleChange('subtitle', e.target.value)}
                  placeholder="A short tagline for your room"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Description</label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Status</label>
                  <select
                    value={formData.status || 'interest'}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    {statuses.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Category</label>
                  <select
                    value={formData.category || 'entertainment'}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm capitalize"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="capitalize">
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Layout Type</label>
                  <select
                    value={formData.layout_type || 'grid'}
                    onChange={(e) => handleChange('layout_type', e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    {layoutTypes.map((lt) => (
                      <option key={lt.value} value={lt.value}>{lt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Max Participants</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={formData.max_participants || 12}
                    onChange={(e) => handleChange('max_participants', parseInt(e.target.value) || 12)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Interest Threshold</label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.interest_threshold || 5000}
                    onChange={(e) => handleChange('interest_threshold', parseInt(e.target.value) || 5000)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Special Badge</label>
                <Input
                  value={formData.special_badge || ''}
                  onChange={(e) => handleChange('special_badge', e.target.value)}
                  placeholder="e.g. 'Comedy / Roast'"
                />
              </div>

              {/* Feature Flags */}
              <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.gifts_enabled ?? true}
                    onChange={(e) => handleChange('gifts_enabled', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Gifts Enabled</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.chat_enabled ?? true}
                    onChange={(e) => handleChange('chat_enabled', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Chat Enabled</span>
                </label>
              </div>

              {/* Disclaimer */}
              <div className="pt-4 border-t border-border space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.disclaimer_required ?? false}
                    onChange={(e) => handleChange('disclaimer_required', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium">Require Consent Disclaimer</span>
                </label>
                
                {formData.disclaimer_required && (
                  <Textarea
                    value={formData.disclaimer_text || ''}
                    onChange={(e) => handleChange('disclaimer_text', e.target.value)}
                    placeholder="Enter disclaimer text..."
                    rows={3}
                  />
                )}
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <BannerUploader
                currentUrl={formData.image_url || null}
                onUpload={(url) => handleChange('image_url', url)}
                onClear={() => handleChange('image_url', null)}
                roomKeyOrId={roomId}
                label="Banner Image"
              />
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Fallback Gradient (when no image)
                </label>
                <div className="flex flex-wrap gap-2">
                  {gradients.map((gradient) => (
                    <button
                      key={gradient}
                      type="button"
                      onClick={() => handleChange('fallback_gradient', gradient)}
                      className={`w-12 h-8 rounded-lg bg-gradient-to-r ${gradient} transition-all ${
                        formData.fallback_gradient === gradient 
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' 
                          : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <BannerUploader
                currentUrl={formData.background_image || null}
                onUpload={(url) => handleChange('background_image', url)}
                onClear={() => handleChange('background_image', null)}
                roomKeyOrId={roomId}
                label="Background Image (optional)"
                aspectRatio="aspect-[21/9]"
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Theme Color (optional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.theme_color || '#8b5cf6'}
                    onChange={(e) => handleChange('theme_color', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-input cursor-pointer"
                  />
                  <Input
                    value={formData.theme_color || ''}
                    onChange={(e) => handleChange('theme_color', e.target.value)}
                    placeholder="#8b5cf6"
                    className="w-32"
                  />
                  {formData.theme_color && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleChange('theme_color', null)}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Roles Tab */}
          {activeTab === 'roles' && (
            <RoomRolesPanel
              room={room}
              roomAdmins={roomAdmins}
              roomModerators={roomModerators}
              onBack={() => setActiveTab('settings')}
              onAddAdmin={handleAddAdmin}
              onAddModerator={handleAddModerator}
              onRemoveAdmin={handleRemoveAdmin}
              onRemoveModerator={handleRemoveModerator}
              canManageAdmins={isOwner}
              canManageModerators={true}
              isLoading={rolesLoading}
            />
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Room Card Preview</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  How this room appears in the "Coming Soon" carousel on the homepage
                </p>
                <div className="flex justify-center p-8 bg-muted/30 rounded-xl">
                  <RoomCard
                    room={{
                      id: room.id,
                      name: formData.name || room.name,
                      description: formData.description || room.description,
                      category: (formData.category || room.category) as any,
                      image_url: formData.image_url || room.image_url || '',
                      fallback_gradient: formData.fallback_gradient || room.fallback_gradient,
                      interest_count: room.current_interest_count,
                      current_interest_count: room.current_interest_count,
                      interest_threshold: formData.interest_threshold || room.interest_threshold,
                      status: (formData.status || room.status) as any,
                      disclaimer_required: formData.disclaimer_required || room.disclaimer_required,
                      special_badge: formData.special_badge || room.special_badge || undefined,
                    }}
                    interested={false}
                    onOpenPreview={() => {}}
                    onToggleInterest={() => {}}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Room Stats</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm">Interest</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {room.current_interest_count.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      of {room.interest_threshold.toLocaleString()} needed
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Capacity</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {formData.max_participants || room.max_participants || 12}
                    </p>
                    <p className="text-xs text-muted-foreground">max participants</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Created</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {new Date(room.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Updated</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {new Date(room.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

