'use client';

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { uploadRoomImage } from '@/lib/storage';
import {
  LayoutDashboard,
  Users,
  Radio,
  AlertTriangle,
  FileCheck,
  Gift,
  Wallet,
  Settings,
  BarChart3,
  Shield,
  LogOut,
  Search,
  RefreshCw,
  Ban,
  MessageSquare,
  Eye,
  Check,
  X,
  Trash2,
  Edit,
  Save,
  Plus,
  DollarSign,
  Coins,
  Gem,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  UserCheck,
  UserX,
  Video,
  VideoOff,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
  Filter,
  MoreVertical,
  Zap,
  Crown,
  Star,
  Sparkles,
  Image,
  Heart,
  UserCog,
  Menu,
  PanelLeftClose,
} from 'lucide-react';

import { RoleUserRow, AddRoleModal, RoomRolesPanel, RoleUser } from '@/components/admin';

// Types
interface User {
  id: string;
  username: string;
  display_name: string | null;
  email?: string;
  avatar_url: string | null;
  is_banned: boolean;
  is_muted: boolean;
  muted_until: string | null;
  is_verified: boolean;
  is_adult_verified: boolean;
  can_stream: boolean;
  coin_balance: number;
  earnings_balance: number;
  gifter_level: number;
  created_at: string;
}

interface LiveStream {
  id: string;
  room_name: string;
  live_available: boolean;
  started_at: string;
  viewer_count: number;
  profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface Report {
  id: string;
  report_type: string;
  report_reason: string;
  report_details: string | null;
  status: string;
  created_at: string;
  reporter: { username: string } | null;
  reported_user: { id: string; username: string } | null;
}

interface Application {
  id: string;
  profile_id: string;
  display_name: string;
  bio: string | null;
  status: string;
  created_at: string;
  profile: { username: string; avatar_url: string | null } | null;
}

interface GiftType {
  id: string;
  name: string;
  emoji: string;
  coin_cost: number;
  display_order: number;
  is_active: boolean;
}

interface CoinPack {
  id: string;
  name: string;
  coins: number;
  price_usd: number;
  bonus_coins: number;
  is_popular: boolean;
  is_active: boolean;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  created_at: string;
  from_user?: string;
  to_user?: string;
}

interface ComingSoonRoom {
  id: string;
  room_key: string;
  name: string;
  description: string | null;
  category: 'gaming' | 'music' | 'entertainment';
  image_url: string | null;
  fallback_gradient: string;
  interest_threshold: number;
  current_interest_count: number;
  status: 'draft' | 'interest' | 'opening_soon' | 'live' | 'paused';
  display_order: number;
  disclaimer_required: boolean;
  disclaimer_text: string | null;
  special_badge: string | null;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  totalUsers: number;
  newUsersToday: number;
  activeStreams: number;
  totalGiftsSent: number;
  totalRevenue: number;
  pendingReports: number;
  pendingApplications: number;
}

type TabType = 'dashboard' | 'users' | 'streams' | 'reports' | 'applications' | 'gifts' | 'transactions' | 'rooms' | 'roles' | 'analytics' | 'settings';

export default function OwnerPanel() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([]);
  const [coinPacks, setCoinPacks] = useState<CoinPack[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rooms, setRooms] = useState<ComingSoonRoom[]>([]);
  const [editingRoom, setEditingRoom] = useState<ComingSoonRoom | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  
  // Roles state
  const [appAdmins, setAppAdmins] = useState<RoleUser[]>([]);
  const [roomRoles, setRoomRoles] = useState<Map<string, { admins: RoleUser[], moderators: RoleUser[] }>>(new Map());
  const [selectedRoomForRoles, setSelectedRoomForRoles] = useState<ComingSoonRoom | null>(null);
  const [showAddAppAdminModal, setShowAddAppAdminModal] = useState(false);
  const [rolesSubTab, setRolesSubTab] = useState<'app' | 'rooms'>('app');
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar state
  const [userFilter, setUserFilter] = useState<'all' | 'banned' | 'muted' | 'streamers' | 'verified'>('all');
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('pending');
  const [roomImageUploading, setRoomImageUploading] = useState(false);
  const [roomImageUploadError, setRoomImageUploadError] = useState<string | null>(null);
  const roomImageInputRef = useRef<HTMLInputElement>(null);
  const [roomDisclaimerDraft, setRoomDisclaimerDraft] = useState('');

  useEffect(() => {
    if (!editingRoom) return;
    setRoomDisclaimerDraft(editingRoom.disclaimer_text || '');
  }, [editingRoom?.id]);

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    try {
      setLoadError(null);
      await loadAllData();
    } catch (error) {
      console.error('Error loading owner panel:', error);
      setLoadError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    setRefreshing(true);
    await Promise.all([
      loadOverview(),
      loadUsers(),
      loadLiveStreams(),
      loadReports(),
      loadApplications(),
      loadGiftTypes(),
      loadCoinPacks(),
      loadTransactions(),
      loadRooms(),
      loadRoles(),
    ]);
    setRefreshing(false);
  };

  const loadOverview = async () => {
    try {
      setLoadError(null);
      const res = await fetch('/api/admin/overview', { cache: 'no-store' });
      if (!res.ok) {
        const msg = await res.text().catch(() => 'Failed to load overview');
        throw new Error(msg);
      }
      const data = await res.json();

      setStats((prev) => ({
        totalUsers: Number(data?.totals?.users ?? 0),
        newUsersToday: 0,
        activeStreams: Number(data?.totals?.live_streams_active ?? 0),
        totalGiftsSent: Number(data?.totals?.gifts_sent_24h ?? 0),
        totalRevenue: 0,
        pendingReports: Number(data?.totals?.pending_reports ?? 0),
        pendingApplications: Number(prev?.pendingApplications ?? 0),
      }));

      if (Array.isArray(data?.live_now)) {
        setLiveStreams(
          data.live_now.map((s: any) => ({
            id: String(s.stream_id),
            room_name: String(s.stream_id),
            live_available: true,
            started_at: s.started_at,
            viewer_count: Number(s.viewer_count ?? 0),
            profile: {
              username: s.host_name,
              display_name: null,
              avatar_url: null,
            },
          }))
        );
      }

      if (Array.isArray(data?.recent_reports)) {
        setReports(
          data.recent_reports.map((r: any) => ({
            id: String(r.report_id),
            report_type: 'report',
            report_reason: String(r.reason ?? 'unknown'),
            report_details: null,
            status: String(r.status ?? 'pending'),
            created_at: r.created_at,
            reporter: r.reporter_name ? { username: String(r.reporter_name) } : null,
            reported_user: r.target_name ? { id: '', username: String(r.target_name) } : null,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading overview:', error);
      setLoadError('Failed to load overview');
    }
  };

  const loadUsers = async () => {
    try {
      const url = new URL('/api/admin/users', window.location.origin);
      url.searchParams.set('limit', '100');
      url.searchParams.set('offset', '0');
      if (searchQuery) url.searchParams.set('q', searchQuery);

      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load users');
      const json = await res.json();
      setUsers(json.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadLiveStreams = async () => {
    try {
      const url = new URL('/api/admin/live-streams', window.location.origin);
      url.searchParams.set('status', 'active');
      url.searchParams.set('limit', '100');
      url.searchParams.set('offset', '0');

      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load live streams');
      const json = await res.json();
      setLiveStreams(json.live_streams || []);
    } catch (error) {
      console.error('Error loading streams:', error);
    }
  };

  const loadReports = async () => {
    try {
      const url = new URL('/api/admin/reports', window.location.origin);
      url.searchParams.set('status', reportFilter === 'all' ? 'all' : reportFilter);
      url.searchParams.set('limit', '100');
      url.searchParams.set('offset', '0');

      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load reports');
      const json = await res.json();
      setReports(json.reports || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const loadApplications = async () => {
    try {
      const url = new URL('/api/admin/applications', window.location.origin);
      url.searchParams.set('status', 'all');
      url.searchParams.set('limit', '100');
      url.searchParams.set('offset', '0');

      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load applications');
      const json = await res.json();
      setApplications(json.applications || []);
      const pending = (json.applications || []).filter((a: any) => a.status === 'pending').length;
      setStats((prev) => (prev ? { ...prev, pendingApplications: pending } : prev));
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const loadGiftTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('gift_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (!error && data) {
        setGiftTypes(data);
      }
    } catch (error) {
      console.error('Error loading gift types:', error);
    }
  };

  const loadCoinPacks = async () => {
    try {
      const res = await fetch('/api/coins/packs', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load coin packs');
      const json = await res.json();
      const packs = Array.isArray(json?.packs) ? json.packs : [];

      const normalized = packs.map((pack: any) => {
        const coins = Number(pack?.coins_awarded ?? pack?.coins_amount ?? pack?.coins ?? 0);
        const price = Number(pack?.usd_amount ?? pack?.price_usd ?? 0);
        const isVip = pack?.is_vip === true;

        return {
          id: String(pack?.sku ?? pack?.price_id ?? pack?.pack_name ?? ''),
          name: String(pack?.pack_name ?? pack?.name ?? 'Coin Pack'),
          coins,
          price_usd: price,
          bonus_coins: 0,
          is_popular: isVip,
          is_active: true,
        } as CoinPack;
      });

      setCoinPacks(normalized);
    } catch (error) {
      console.error('Error loading coin packs:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const url = new URL('/api/admin/transactions', window.location.origin);
      url.searchParams.set('limit', '100');
      url.searchParams.set('offset', '0');
      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load transactions');
      const json = await res.json();
      const rows = Array.isArray(json.transactions) ? json.transactions : [];
      const source = String(json.source || 'unknown');

      const normalized = rows.map((row: any) => {
        if (source === 'ledger_entries') {
          const deltaCoins = Number(row.delta_coins ?? 0);
          const deltaDiamonds = Number(row.delta_diamonds ?? 0);
          const amount = deltaCoins !== 0 ? deltaCoins : deltaDiamonds;
          return {
            id: `le:${row.id}`,
            type: String(row.entry_type || 'ledger'),
            amount: Math.abs(amount),
            created_at: row.created_at,
            from_user: String(row.user_id || ''),
            to_user: '',
          } as Transaction;
        }

        return {
          id: `cl:${row.id}`,
          type: String(row.type || 'ledger'),
          amount: Math.abs(Number(row.amount ?? 0)),
          created_at: row.created_at,
          from_user: String(row.profile_id || ''),
          to_user: '',
        } as Transaction;
      });

      setTransactions(normalized);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const loadRooms = async () => {
    try {
      const res = await fetch('/api/admin/rooms', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load rooms');
      const json = await res.json();
      setRooms(json.rooms || []);
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  };

  const loadRoles = async () => {
    try {
      // Load App Admins
      const res = await fetch('/api/admin/roles', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setAppAdmins(json.app_admins || []);
        
        // Build room roles map
        const rolesMap = new Map<string, { admins: RoleUser[], moderators: RoleUser[] }>();
        for (const room of json.rooms || []) {
          rolesMap.set(room.id, {
            admins: room.admins || [],
            moderators: room.moderators || [],
          });
        }
        setRoomRoles(rolesMap);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      // Set mock data for development
      setAppAdmins([
        {
          id: 'owner-1',
          profile_id: 'owner-1',
          username: 'brad',
          display_name: 'Brad Morris',
          avatar_url: null,
          role: 'owner',
          created_at: new Date().toISOString(),
        },
      ]);
    }
  };

  // Action handlers
  const handleBanUser = async (userId: string, ban: boolean) => {
    if (!confirm(`Are you sure you want to ${ban ? 'ban' : 'unban'} this user?`)) return;
    setActionLoading(userId);
    try {
      await supabase.from('profiles').update({ is_banned: ban }).eq('id', userId);
      setUsers(users.map(u => u.id === userId ? { ...u, is_banned: ban } : u));
    } catch (error) {
      alert('Failed to update ban status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoomImageSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRoomImageUploadError(null);

    if (!file.type.startsWith('image/')) {
      setRoomImageUploadError('Please select an image file.');
      return;
    }

    if (!editingRoom) {
      setRoomImageUploadError('No room is being edited.');
      return;
    }

    const key = String(editingRoom.room_key || '').trim();
    if (!key) {
      setRoomImageUploadError('Set Room Key before uploading an image.');
      return;
    }

    setRoomImageUploading(true);
    try {
      const publicUrl = await uploadRoomImage(key, file);
      setEditingRoom((prev) => (prev ? { ...prev, image_url: publicUrl } : prev));
    } catch (err) {
      setRoomImageUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setRoomImageUploading(false);
      if (roomImageInputRef.current) {
        roomImageInputRef.current.value = '';
      }
    }
  };

  const handleMuteUser = async (userId: string, mute: boolean, duration?: number) => {
    setActionLoading(userId);
    try {
      const mutedUntil = mute && duration ? new Date(Date.now() + duration * 60000).toISOString() : null;
      await supabase.from('profiles').update({ is_muted: mute, muted_until: mutedUntil }).eq('id', userId);
      setUsers(users.map(u => u.id === userId ? { ...u, is_muted: mute, muted_until: mutedUntil } : u));
    } catch (error) {
      alert('Failed to update mute status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyUser = async (userId: string, verify: boolean) => {
    setActionLoading(userId);
    try {
      await supabase.from('profiles').update({ is_verified: verify }).eq('id', userId);
      setUsers(users.map(u => u.id === userId ? { ...u, is_verified: verify } : u));
    } catch (error) {
      alert('Failed to update verification status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStreaming = async (userId: string, canStream: boolean) => {
    setActionLoading(userId);
    try {
      await supabase.from('profiles').update({ can_stream: canStream }).eq('id', userId);
      setUsers(users.map(u => u.id === userId ? { ...u, can_stream: canStream } : u));
    } catch (error) {
      alert('Failed to update streaming permission');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEndStream = async (streamId: string) => {
    if (!confirm('End this stream?')) return;
    setActionLoading(streamId);
    try {
      await fetch('/api/admin/live-streams/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stream_id: streamId }),
      });
      await loadOverview();
      await loadLiveStreams();
    } catch (error) {
      alert('Failed to end stream');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEndAllStreams = async () => {
    if (!confirm('END ALL STREAMS? This will stop every live stream immediately.')) return;
    setActionLoading('all-streams');
    try {
      const res = await fetch('/api/admin/live-streams/end-all', { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      await loadOverview();
      await loadLiveStreams();
      alert('All streams ended');
    } catch (error) {
      alert('Failed to end all streams');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    setActionLoading(reportId);
    try {
      await fetch('/api/admin/reports/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, resolution: status === 'dismissed' ? 'dismissed' : 'actioned' }),
      });
      await loadOverview();
      await loadReports();
    } catch (error) {
      alert('Failed to update report');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApplicationStatus = async (appId: string, profileId: string, status: 'approved' | 'rejected') => {
    setActionLoading(appId);
    try {
      await fetch('/api/admin/applications/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: appId, decision: status }),
      });
      await loadApplications();
    } catch (error) {
      alert('Failed to update application');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddCoins = async (userId: string) => {
    const amount = prompt('Enter coin amount to add:');
    if (!amount || isNaN(parseInt(amount))) return;
    
    setActionLoading(userId);
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      await supabase.from('profiles').update({ 
        coin_balance: (user.coin_balance || 0) + parseInt(amount) 
      }).eq('id', userId);
      setUsers(users.map(u => u.id === userId ? { ...u, coin_balance: u.coin_balance + parseInt(amount) } : u));
      alert(`Added ${amount} coins`);
    } catch (error) {
      alert('Failed to add coins');
    } finally {
      setActionLoading(null);
    }
  };

  // Room handlers
  const handleSaveRoom = async (room: Partial<ComingSoonRoom> & { id?: string }) => {
    setActionLoading(room.id || 'new-room');
    try {
      const isNew = !room.id;
      const url = isNew ? '/api/admin/rooms' : `/api/admin/rooms/${room.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(room),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save room');
      }

      await loadRooms();
      setEditingRoom(null);
      setIsCreatingRoom(false);
      alert(isNew ? 'Room created!' : 'Room updated!');
    } catch (error: any) {
      alert(error.message || 'Failed to save room');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    setActionLoading(roomId);
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await loadRooms();
      alert('Room deleted');
    } catch (error) {
      alert('Failed to delete room');
    } finally {
      setActionLoading(null);
    }
  };

  // Role handlers
  const handleAddAppAdmin = async (userId: string, username: string) => {
    setActionLoading('add-app-admin');
    try {
      const res = await fetch('/api/admin/roles/app-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) throw new Error('Failed to add app admin');
      
      // Optimistic update
      const newAdmin: RoleUser = {
        id: `temp-${Date.now()}`,
        profile_id: userId,
        username,
        display_name: null,
        avatar_url: null,
        role: 'app_admin',
        created_at: new Date().toISOString(),
      };
      setAppAdmins([...appAdmins, newAdmin]);
      setShowAddAppAdminModal(false);
      await loadRoles();
    } catch (error) {
      alert('Failed to add app admin');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveAppAdmin = async (adminId: string) => {
    if (!confirm('Remove this App Admin?')) return;
    setActionLoading(adminId);
    try {
      const res = await fetch(`/api/admin/roles/app-admin/${adminId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove');
      setAppAdmins(appAdmins.filter(a => a.id !== adminId));
    } catch (error) {
      alert('Failed to remove app admin');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddRoomAdmin = async (roomId: string, userId: string, username: string) => {
    setActionLoading('add-room-admin');
    try {
      const res = await fetch(`/api/admin/roles/room/${roomId}/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) throw new Error('Failed to add room admin');
      await loadRoles();
    } catch (error) {
      alert('Failed to add room admin');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveRoomAdmin = async (roomId: string, adminId: string) => {
    if (!confirm('Remove this Room Admin?')) return;
    setActionLoading(adminId);
    try {
      const res = await fetch(`/api/admin/roles/room/${roomId}/admin/${adminId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove');
      await loadRoles();
    } catch (error) {
      alert('Failed to remove room admin');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddRoomModerator = async (roomId: string, userId: string, username: string) => {
    setActionLoading('add-room-mod');
    try {
      const res = await fetch(`/api/admin/roles/room/${roomId}/moderator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) throw new Error('Failed to add moderator');
      await loadRoles();
    } catch (error) {
      alert('Failed to add moderator');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveRoomModerator = async (roomId: string, modId: string) => {
    if (!confirm('Remove this Moderator?')) return;
    setActionLoading(modId);
    try {
      const res = await fetch(`/api/admin/roles/room/${roomId}/moderator/${modId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove');
      await loadRoles();
    } catch (error) {
      alert('Failed to remove moderator');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Filters
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    switch (userFilter) {
      case 'banned': return u.is_banned;
      case 'muted': return u.is_muted;
      case 'streamers': return u.can_stream;
      case 'verified': return u.is_verified;
      default: return true;
    }
  });

  const filteredReports = reports.filter(r => {
    if (reportFilter === 'all') return true;
    return r.status === reportFilter;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Owner Panel...</p>
        </div>
      </div>
    );
  }

  // Tabs configuration
  const tabs: { id: TabType; label: string; icon: any; badge?: number; href?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users, badge: users.length },
    { id: 'streams', label: 'Live Streams', icon: Radio, badge: liveStreams.length },
    { id: 'reports', label: 'Reports', icon: AlertTriangle, badge: stats?.pendingReports },
    { id: 'applications', label: 'Applications', icon: FileCheck, badge: stats?.pendingApplications },
    { id: 'rooms', label: 'Coming Soon Rooms', icon: Sparkles, badge: rooms.length },
    { id: 'roles', label: 'Roles', icon: UserCog, badge: appAdmins.length },
    { id: 'gifts', label: 'Gifts & Coins', icon: Gift },
    { id: 'transactions', label: 'Transactions', icon: Wallet },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/owner/analytics' },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 bg-gray-800 border-r border-gray-700 flex flex-col fixed h-full z-50
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-white">Owner Panel</h1>
              <p className="text-xs text-gray-400">MyLiveLinks</p>
            </div>
            {/* Mobile close button */}
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-gray-400 hover:text-white"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loadError && (
          <div className="mb-6 bg-red-900/20 border border-red-500/30 text-red-200 rounded-lg px-4 py-3">
            {loadError}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            // If tab has href, render as link
            if (tab.href) {
              return (
                <a
                  key={tab.id}
                  href={tab.href}
                  className={`w-full flex items-center gap-3 px-6 py-3 text-left transition ${
                    isActive
                      ? 'bg-purple-600/20 text-purple-400 border-r-2 border-purple-500'
                      : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1">{tab.label}</span>
                  <ExternalLink className="w-4 h-4 opacity-50" />
                </a>
              );
            }
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSidebarOpen(false); // Close sidebar on mobile when selecting tab
                }}
                className={`w-full flex items-center gap-3 px-6 py-3 text-left transition ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-400 border-r-2 border-purple-500'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    isActive ? 'bg-purple-500 text-white' : 'bg-gray-600 text-gray-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-900/20 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 bg-gray-800 text-gray-300 hover:text-white rounded-lg border border-gray-700"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-white">
                {tabs.find(t => t.id === activeTab)?.label}
              </h2>
              <p className="text-gray-400 text-sm lg:text-base hidden sm:block">
                {activeTab === 'dashboard' && 'Platform overview and statistics'}
                {activeTab === 'users' && 'Manage all platform users'}
                {activeTab === 'streams' && 'Monitor and control live streams'}
                {activeTab === 'reports' && 'Review and handle user reports'}
                {activeTab === 'applications' && 'Approve or reject room applications'}
                {activeTab === 'rooms' && 'Manage Coming Soon rooms and their images'}
                {activeTab === 'roles' && 'Manage App Admins and Room Roles'}
                {activeTab === 'gifts' && 'Manage gift types and coin packs'}
                {activeTab === 'transactions' && 'View all platform transactions'}
                {activeTab === 'analytics' && 'Platform analytics and insights'}
                {activeTab === 'settings' && 'Platform configuration'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <button
              onClick={loadAllData}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <a
              href="/"
              className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">View Site</span>
            </a>
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-4 lg:space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
              <div className="bg-gray-800 rounded-xl p-3 lg:p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-2 lg:mb-4">
                  <Users className="w-6 h-6 lg:w-8 lg:h-8 text-blue-400" />
                  <span className="text-green-400 text-xs lg:text-sm flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4" />
                    <span className="hidden sm:inline">+{stats.newUsersToday} today</span>
                    <span className="sm:hidden">+{stats.newUsersToday}</span>
                  </span>
                </div>
                <p className="text-xl lg:text-3xl font-bold text-white">{stats.totalUsers.toLocaleString()}</p>
                <p className="text-gray-400 text-xs lg:text-sm">Total Users</p>
              </div>

              <div className="bg-gray-800 rounded-xl p-3 lg:p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-2 lg:mb-4">
                  <Radio className="w-6 h-6 lg:w-8 lg:h-8 text-red-400" />
                  <span className="relative flex h-2 w-2 lg:h-3 lg:w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 lg:h-3 lg:w-3 bg-red-500"></span>
                  </span>
                </div>
                <p className="text-xl lg:text-3xl font-bold text-white">{stats.activeStreams}</p>
                <p className="text-gray-400 text-xs lg:text-sm">Live Streams</p>
              </div>

              <div className="bg-gray-800 rounded-xl p-3 lg:p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-2 lg:mb-4">
                  <Gift className="w-6 h-6 lg:w-8 lg:h-8 text-pink-400" />
                  <Activity className="w-4 h-4 lg:w-5 lg:h-5 text-gray-500" />
                </div>
                <p className="text-xl lg:text-3xl font-bold text-white">{stats.totalGiftsSent.toLocaleString()}</p>
                <p className="text-gray-400 text-xs lg:text-sm">Gifts Sent</p>
              </div>

              <div className="bg-gray-800 rounded-xl p-3 lg:p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-2 lg:mb-4">
                  <AlertTriangle className="w-6 h-6 lg:w-8 lg:h-8 text-amber-400" />
                  {stats.pendingReports > 0 && (
                    <span className="px-1.5 lg:px-2 py-0.5 lg:py-1 bg-amber-500/20 text-amber-400 text-[10px] lg:text-xs rounded-full">
                      <span className="hidden sm:inline">Needs attention</span>
                      <span className="sm:hidden">!</span>
                    </span>
                  )}
                </div>
                <p className="text-xl lg:text-3xl font-bold text-white">{stats.pendingReports}</p>
                <p className="text-gray-400 text-xs lg:text-sm">Pending Reports</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
              <h3 className="text-base lg:text-lg font-semibold text-white mb-3 lg:mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-2 lg:gap-3">
                <button
                  onClick={() => setActiveTab('reports')}
                  className="px-3 lg:px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center gap-2 text-sm lg:text-base"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span className="hidden sm:inline">Review Reports</span>
                  <span className="sm:hidden">Reports</span> ({stats.pendingReports})
                </button>
                <button
                  onClick={() => setActiveTab('applications')}
                  className="px-3 lg:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm lg:text-base"
                >
                  <FileCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Review Applications</span>
                  <span className="sm:hidden">Apps</span> ({stats.pendingApplications})
                </button>
                <button
                  onClick={handleEndAllStreams}
                  disabled={actionLoading === 'all-streams' || stats.activeStreams === 0}
                  className="px-3 lg:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 text-sm lg:text-base disabled:opacity-50"
                >
                  <VideoOff className="w-4 h-4" />
                  <span className="hidden sm:inline">End All Streams</span>
                  <span className="sm:hidden">End All</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Recent Streams */}
              <div className="bg-gray-800 rounded-xl p-4 lg:p-6 border border-gray-700">
                <h3 className="text-base lg:text-lg font-semibold text-white mb-3 lg:mb-4 flex items-center gap-2">
                  <Radio className="w-4 h-4 lg:w-5 lg:h-5 text-red-400" />
                  Live Now
                </h3>
                {liveStreams.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No active streams</p>
                ) : (
                  <div className="space-y-3">
                    {liveStreams.slice(0, 5).map((stream) => (
                      <div key={stream.id} className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden">
                          {stream.profile?.avatar_url ? (
                            <img src={stream.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Video className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">{stream.profile?.display_name || stream.profile?.username}</p>
                          <p className="text-xs text-gray-400">{stream.viewer_count} viewers</p>
                        </div>
                        <button
                          onClick={() => handleEndStream(stream.id)}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          End
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Reports */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Recent Reports
                </h3>
                {reports.filter(r => r.status === 'pending').length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No pending reports</p>
                ) : (
                  <div className="space-y-3">
                    {reports.filter(r => r.status === 'pending').slice(0, 5).map((report) => (
                      <div key={report.id} className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-white">{report.report_reason.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-gray-400">
                            @{report.reported_user?.username} • {formatTimeAgo(report.created_at)}
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab('reports')}
                          className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500"
                        >
                          Review
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'banned', 'muted', 'streamers', 'verified'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setUserFilter(filter)}
                    className={`px-4 py-2 rounded-lg capitalize transition ${
                      userFilter === filter
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Balance</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Joined</th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredUsers.slice(0, 50).map((user) => (
                      <tr key={user.id} className="hover:bg-gray-700/30">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <Users className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white">{user.display_name || user.username}</span>
                                {user.is_verified && <Star className="w-4 h-4 text-blue-400" />}
                                {user.can_stream && <Video className="w-4 h-4 text-green-400" />}
                              </div>
                              <p className="text-sm text-gray-400">@{user.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-yellow-400">
                              <Coins className="w-4 h-4" />
                              <span>{(user.coin_balance || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1 text-purple-400">
                              <Gem className="w-4 h-4" />
                              <span>{(user.earnings_balance || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {user.is_banned && (
                              <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">Banned</span>
                            )}
                            {user.is_muted && (
                              <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded">Muted</span>
                            )}
                            {!user.is_banned && !user.is_muted && (
                              <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">Active</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {formatTimeAgo(user.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <a
                              href={`/${user.username}`}
                              target="_blank"
                              className="p-2 text-blue-400 hover:bg-blue-500/20 rounded transition"
                              title="View Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            <a
                              href={`/owner/users/${user.id}/analytics`}
                              className="p-2 text-purple-400 hover:bg-purple-500/20 rounded transition"
                              title="View Analytics"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleAddCoins(user.id)}
                              disabled={actionLoading === user.id}
                              className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded transition"
                              title="Add Coins"
                            >
                              <Coins className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleVerifyUser(user.id, !user.is_verified)}
                              disabled={actionLoading === user.id}
                              className={`p-2 rounded transition ${user.is_verified ? 'text-blue-400 hover:bg-blue-500/20' : 'text-gray-400 hover:bg-gray-600'}`}
                              title={user.is_verified ? 'Remove Verification' : 'Verify User'}
                            >
                              <Star className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStreaming(user.id, !user.can_stream)}
                              disabled={actionLoading === user.id}
                              className={`p-2 rounded transition ${user.can_stream ? 'text-green-400 hover:bg-green-500/20' : 'text-gray-400 hover:bg-gray-600'}`}
                              title={user.can_stream ? 'Revoke Streaming' : 'Allow Streaming'}
                            >
                              <Video className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMuteUser(user.id, !user.is_muted, 60)}
                              disabled={actionLoading === user.id}
                              className={`p-2 rounded transition ${user.is_muted ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-gray-400 hover:bg-gray-600'}`}
                              title={user.is_muted ? 'Unmute' : 'Mute 1hr'}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleBanUser(user.id, !user.is_banned)}
                              disabled={actionLoading === user.id}
                              className={`p-2 rounded transition ${user.is_banned ? 'text-red-400 hover:bg-red-500/20' : 'text-gray-400 hover:bg-gray-600'}`}
                              title={user.is_banned ? 'Unban' : 'Ban'}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length > 50 && (
                <div className="px-6 py-4 bg-gray-700/30 text-center text-gray-400 text-sm">
                  Showing 50 of {filteredUsers.length} users. Use search to find specific users.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Streams Tab */}
        {activeTab === 'streams' && (
          <div className="space-y-6">
            {/* Actions */}
            <div className="flex justify-between items-center">
              <p className="text-gray-400">{liveStreams.length} active streams</p>
              <button
                onClick={handleEndAllStreams}
                disabled={actionLoading === 'all-streams' || liveStreams.length === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                <VideoOff className="w-4 h-4" />
                End All Streams
              </button>
            </div>

            {/* Streams Grid */}
            {liveStreams.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-16 text-center border border-gray-700">
                <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No active streams</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveStreams.map((stream) => (
                  <div key={stream.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                    <div className="aspect-video bg-gray-700 relative flex items-center justify-center">
                      <Video className="w-12 h-12 text-gray-600" />
                      <div className="absolute top-3 left-3 px-2 py-1 bg-red-600 text-white text-xs font-medium rounded flex items-center gap-1">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        LIVE
                      </div>
                      <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 text-white text-xs rounded">
                        {stream.viewer_count} viewers
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden">
                          {stream.profile?.avatar_url ? (
                            <img src={stream.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">{stream.profile?.display_name || stream.profile?.username}</p>
                          <p className="text-sm text-gray-400">Started {formatTimeAgo(stream.started_at)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`/live?stream=${stream.id}`}
                          target="_blank"
                          className="flex-1 px-3 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 transition text-center"
                        >
                          Watch
                        </a>
                        <button
                          onClick={() => handleEndStream(stream.id)}
                          disabled={actionLoading === stream.id}
                          className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                        >
                          End Stream
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex gap-2">
              {(['all', 'pending', 'resolved', 'dismissed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setReportFilter(filter)}
                  className={`px-4 py-2 rounded-lg capitalize transition ${
                    reportFilter === filter
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {filter}
                  {filter === 'pending' && (
                    <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                      {reports.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Reports List */}
            <div className="space-y-4">
              {filteredReports.length === 0 ? (
                <div className="bg-gray-800 rounded-xl p-16 text-center border border-gray-700">
                  <AlertTriangle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No {reportFilter !== 'all' ? reportFilter : ''} reports</p>
                </div>
              ) : (
                filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className={`bg-gray-800 rounded-xl p-6 border ${
                      report.status === 'pending' ? 'border-amber-500/50' : 'border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            report.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-400'
                              : report.status === 'resolved'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-600 text-gray-400'
                          }`}>
                            {report.status.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">{report.report_type}</span>
                          <span className="text-sm text-gray-500">{formatDate(report.created_at)}</span>
                        </div>
                        <p className="font-medium text-white mb-1">
                          {report.report_reason.replace(/_/g, ' ')}
                        </p>
                        {report.report_details && (
                          <p className="text-sm text-gray-400 mb-2">"{report.report_details}"</p>
                        )}
                        <div className="text-sm text-gray-500">
                          <span>From: @{report.reporter?.username || 'unknown'}</span>
                          {report.reported_user && (
                            <span className="ml-4">
                              Against: <a href={`/${report.reported_user.username}`} target="_blank" className="text-blue-400 hover:underline">@{report.reported_user.username}</a>
                            </span>
                          )}
                        </div>
                      </div>
                      {report.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolveReport(report.id, 'resolved')}
                            disabled={actionLoading === report.id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Resolve
                          </button>
                          <button
                            onClick={() => handleResolveReport(report.id, 'dismissed')}
                            disabled={actionLoading === report.id}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition disabled:opacity-50 flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Dismiss
                          </button>
                          {report.reported_user && (
                            <button
                              onClick={() => handleBanUser(report.reported_user!.id, true)}
                              disabled={actionLoading === report.reported_user.id}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
                            >
                              <Ban className="w-4 h-4" />
                              Ban User
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="space-y-6">
            {applications.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-16 text-center border border-gray-700">
                <FileCheck className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No applications</p>
              </div>
            ) : (
              applications.map((app) => (
                <div
                  key={app.id}
                  className={`bg-gray-800 rounded-xl p-6 border ${
                    app.status === 'pending' ? 'border-amber-500/50' : 'border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                      {app.profile?.avatar_url ? (
                        <img src={app.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <Users className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-white">{app.display_name}</h3>
                        <a href={`/${app.profile?.username}`} target="_blank" className="text-sm text-blue-400 hover:underline flex items-center gap-1">
                          @{app.profile?.username}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          app.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-400'
                            : app.status === 'approved'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {app.status.toUpperCase()}
                        </span>
                      </div>
                      {app.bio && (
                        <p className="text-gray-400 mb-3">{app.bio}</p>
                      )}
                      <p className="text-sm text-gray-500">Applied {formatDate(app.created_at)}</p>
                    </div>
                    {app.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApplicationStatus(app.id, app.profile_id, 'approved')}
                          disabled={actionLoading === app.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleApplicationStatus(app.id, app.profile_id, 'rejected')}
                          disabled={actionLoading === app.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Rooms Tab */}
        {activeTab === 'rooms' && (
          <div className="space-y-6">
            {/* New Rooms Management Banner */}
            <a
              href="/owner/rooms"
              className="block p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl hover:border-purple-500/50 transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-600/30 rounded-lg">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Room Templates & Advanced Management</h4>
                    <p className="text-sm text-gray-400">Create room templates for quick setup, manage roles, and preview cards</p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-white transition" />
              </div>
            </a>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <p className="text-gray-400">{rooms.length} rooms configured</p>
              <button
                onClick={() => {
                  setIsCreatingRoom(true);
                  setEditingRoom({
                    id: '',
                    room_key: '',
                    name: '',
                    description: '',
                    category: 'gaming',
                    image_url: '',
                    fallback_gradient: 'from-purple-600 to-pink-600',
                    interest_threshold: 5000,
                    current_interest_count: 0,
                    status: 'interest',
                    display_order: rooms.length + 1,
                    disclaimer_required: false,
                    disclaimer_text: '',
                    special_badge: '',
                    created_at: '',
                    updated_at: '',
                  });
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Room
              </button>
            </div>

            {/* Room Editor Modal */}
            {(editingRoom || isCreatingRoom) && editingRoom && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                      {isCreatingRoom ? 'Create New Room' : 'Edit Room'}
                    </h3>
                    <button
                      onClick={() => {
                        setEditingRoom(null);
                        setIsCreatingRoom(false);
                      }}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    {/* Preview */}
                    <div className="rounded-xl overflow-hidden h-40 relative">
                      {editingRoom.image_url ? (
                        <img
                          src={editingRoom.image_url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${editingRoom.fallback_gradient || 'from-purple-600 to-pink-600'}`} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4">
                        <p className="text-white font-bold text-xl">{editingRoom.name || 'Room Name'}</p>
                        <p className="text-white/80 text-sm">{editingRoom.category}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Room Key (URL slug)</label>
                        <input
                          type="text"
                          value={editingRoom.room_key}
                          onChange={(e) => setEditingRoom({ ...editingRoom, room_key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                          placeholder="e.g., call-of-duty-room"
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                        <input
                          type="text"
                          value={editingRoom.name}
                          onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                          placeholder="Call of Duty Room"
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                      <textarea
                        value={editingRoom.description || ''}
                        onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })}
                        placeholder="Describe what this room is about..."
                        rows={2}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        <Image className="w-4 h-4 inline mr-1" />
                        Image URL
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          ref={roomImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleRoomImageSelected}
                          disabled={roomImageUploading}
                          className="hidden"
                          id="room-image-upload"
                        />

                        <label
                          htmlFor="room-image-upload"
                          className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
                            roomImageUploading
                              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-700 text-white hover:bg-gray-600 cursor-pointer'
                          }`}
                        >
                          {roomImageUploading ? 'Uploading...' : 'Upload Photo'}
                        </label>

                        {editingRoom.image_url ? (
                          <button
                            type="button"
                            onClick={() => setEditingRoom({ ...editingRoom, image_url: null })}
                            disabled={roomImageUploading}
                            className="px-4 py-2 bg-red-600/20 text-red-400 text-sm rounded-lg hover:bg-red-600/30 transition disabled:opacity-50"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>

                      {roomImageUploadError ? (
                        <p className="text-xs text-red-400 mt-1">{roomImageUploadError}</p>
                      ) : null}

                      {editingRoom.image_url ? (
                        <p className="text-xs text-gray-500 mt-1 break-all">{editingRoom.image_url}</p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">Recommended: 600x400px.</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                        <select
                          value={editingRoom.category}
                          onChange={(e) => setEditingRoom({ ...editingRoom, category: e.target.value as any })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="gaming">Gaming</option>
                          <option value="music">Music</option>
                          <option value="entertainment">Entertainment</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                        <select
                          value={editingRoom.status}
                          onChange={(e) => setEditingRoom({ ...editingRoom, status: e.target.value as any })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="draft">Draft (Hidden)</option>
                          <option value="interest">Collecting Interest</option>
                          <option value="opening_soon">Opening Soon</option>
                          <option value="live">Live</option>
                          <option value="paused">Paused</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Interest Threshold</label>
                        <input
                          type="number"
                          value={editingRoom.interest_threshold}
                          onChange={(e) => setEditingRoom({ ...editingRoom, interest_threshold: parseInt(e.target.value) || 5000 })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Display Order</label>
                        <input
                          type="number"
                          value={editingRoom.display_order}
                          onChange={(e) => setEditingRoom({ ...editingRoom, display_order: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Fallback Gradient (Tailwind classes)</label>
                      <input
                        type="text"
                        value={editingRoom.fallback_gradient}
                        onChange={(e) => setEditingRoom({ ...editingRoom, fallback_gradient: e.target.value })}
                        placeholder="from-purple-600 to-pink-600"
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Special Badge</label>
                        <input
                          type="text"
                          value={editingRoom.special_badge || ''}
                          onChange={(e) => setEditingRoom({ ...editingRoom, special_badge: e.target.value })}
                          placeholder="e.g., Comedy / Roast"
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingRoom.disclaimer_required}
                            onChange={(e) => setEditingRoom({ ...editingRoom, disclaimer_required: e.target.checked })}
                            className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                          />
                          <span className="text-gray-300">Requires Disclaimer</span>
                        </label>
                      </div>
                    </div>

                    {editingRoom.disclaimer_required && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Disclaimer Text</label>
                        <input
                          type="text"
                          value={roomDisclaimerDraft}
                          onChange={(e) => setRoomDisclaimerDraft(e.target.value)}
                          onBlur={() => setEditingRoom({ ...editingRoom, disclaimer_text: roomDisclaimerDraft })}
                          placeholder="All participants must provide consent..."
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    )}
                  </div>
                  <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setEditingRoom(null);
                        setIsCreatingRoom(false);
                      }}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() =>
                        handleSaveRoom(
                          isCreatingRoom
                            ? { ...editingRoom, id: undefined, disclaimer_text: roomDisclaimerDraft }
                            : { ...editingRoom, disclaimer_text: roomDisclaimerDraft }
                        )
                      }
                      disabled={actionLoading === (editingRoom.id || 'new-room')}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {isCreatingRoom ? 'Create Room' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Rooms Grid */}
            {!editingRoom && !isCreatingRoom && (
              rooms.length === 0 ? (
                <div className="bg-gray-800 rounded-xl p-16 text-center border border-gray-700">
                  <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No rooms yet</p>
                  <p className="text-gray-500 text-sm mt-2">Add your first Coming Soon room above</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rooms.map((room) => (
                    <div key={room.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                      {/* Room Image */}
                      <div className="h-36 relative">
                        {room.image_url ? (
                          <img
                            src={room.image_url}
                            alt={room.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full bg-gradient-to-br ${room.fallback_gradient} ${room.image_url ? 'hidden' : ''} absolute inset-0`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-800 via-transparent to-transparent" />
                        
                        {/* Status Badge */}
                        <div className={`absolute top-3 right-3 px-2 py-1 text-xs font-medium rounded ${
                          room.status === 'draft' ? 'bg-gray-600 text-gray-300' :
                          room.status === 'interest' ? 'bg-amber-500/80 text-white' :
                          room.status === 'opening_soon' ? 'bg-green-500/80 text-white' :
                          room.status === 'live' ? 'bg-red-500 text-white' :
                          'bg-gray-500 text-white'
                        }`}>
                          {room.status === 'interest' ? 'Collecting Interest' : room.status.replace('_', ' ').toUpperCase()}
                        </div>

                        {/* Category Badge */}
                        <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 text-xs font-medium text-white rounded capitalize">
                          {room.category}
                        </div>
                      </div>

                      {/* Room Info */}
                      <div className="p-4">
                        <h3 className="font-bold text-white text-lg mb-1">{room.name}</h3>
                        <p className="text-gray-400 text-sm line-clamp-2 mb-3">{room.description}</p>
                        
                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                          <span className="flex items-center gap-1">
                            <Heart className="w-4 h-4 text-pink-400" />
                            {room.current_interest_count.toLocaleString()}
                          </span>
                          <span>/ {room.interest_threshold.toLocaleString()} to open</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                            style={{ width: `${Math.min((room.current_interest_count / room.interest_threshold) * 100, 100)}%` }}
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingRoom(room);
                              setIsCreatingRoom(false);
                            }}
                            className="flex-1 px-3 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 transition flex items-center justify-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(room.id)}
                            disabled={actionLoading === room.id}
                            className="px-3 py-2 bg-red-600/20 text-red-400 text-sm rounded-lg hover:bg-red-600/30 transition disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="flex gap-2 border-b border-gray-700 pb-4">
              <button
                onClick={() => { setRolesSubTab('app'); setSelectedRoomForRoles(null); }}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  rolesSubTab === 'app'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  App Admins
                </div>
              </button>
              <button
                onClick={() => { setRolesSubTab('rooms'); setSelectedRoomForRoles(null); }}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  rolesSubTab === 'rooms'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Room Roles
                </div>
              </button>
            </div>

            {/* App Admins Sub-tab */}
            {rolesSubTab === 'app' && (
              <div className="space-y-6">
                {/* Info Banner */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                  <Crown className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-400 font-medium">Owner has full privileges everywhere</p>
                    <p className="text-amber-400/70 text-sm mt-1">
                      The Owner account cannot be removed and has admin + moderation privileges across all rooms.
                    </p>
                  </div>
                </div>

                {/* App Admins List */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-purple-400" />
                      <h4 className="font-semibold text-white">App Admins</h4>
                      <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full">
                        {appAdmins.length}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowAddAppAdminModal(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
                    >
                      <Plus className="w-4 h-4" />
                      Add App Admin
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    {appAdmins.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No app admins yet</p>
                        <p className="text-sm mt-1">Add admins to help manage the platform</p>
                      </div>
                    ) : (
                      appAdmins.map((admin) => (
                        <RoleUserRow
                          key={admin.id}
                          user={admin}
                          onRemove={() => handleRemoveAppAdmin(admin.id)}
                          canRemove={admin.role !== 'owner'}
                          isLoading={actionLoading === admin.id}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Role Permissions Info */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h5 className="font-medium text-white mb-4">Role Permissions</h5>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-5 h-5 text-amber-400" />
                        <span className="font-medium text-amber-400">Owner</span>
                      </div>
                      <ul className="text-sm text-gray-400 space-y-1">
                        <li>• Full access to all features</li>
                        <li>• Can add/remove App Admins</li>
                        <li>• Admin + moderation everywhere</li>
                        <li>• Cannot be removed</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-5 h-5 text-purple-400" />
                        <span className="font-medium text-purple-400">App Admin</span>
                      </div>
                      <ul className="text-sm text-gray-400 space-y-1">
                        <li>• Manage app-level settings</li>
                        <li>• Manage all rooms globally</li>
                        <li>• Add/remove Room Admins & Mods</li>
                        <li>• Cannot remove Owner</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Room Roles Sub-tab */}
            {rolesSubTab === 'rooms' && !selectedRoomForRoles && (
              <div className="space-y-6">
                <p className="text-gray-400">
                  Select a room to manage its admins and moderators.
                </p>

                {/* Rooms Grid */}
                {rooms.length === 0 ? (
                  <div className="bg-gray-800 rounded-xl p-16 text-center border border-gray-700">
                    <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No rooms available</p>
                    <p className="text-gray-500 text-sm mt-2">Create rooms first in the "Coming Soon Rooms" tab</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rooms.map((room) => {
                      const roles = roomRoles.get(room.id) || { admins: [], moderators: [] };
                      const totalRoles = roles.admins.length + roles.moderators.length;
                      
                      return (
                        <button
                          key={room.id}
                          onClick={() => setSelectedRoomForRoles(room)}
                          className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-purple-500/50 transition text-left"
                        >
                          {/* Room Image */}
                          <div className="h-24 relative">
                            {room.image_url ? (
                              <img
                                src={room.image_url}
                                alt={room.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${room.fallback_gradient}`} />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-800 via-transparent to-transparent" />
                            
                            {/* Status Badge */}
                            <div className={`absolute top-2 right-2 px-2 py-0.5 text-[10px] font-medium rounded ${
                              room.status === 'live' ? 'bg-red-500 text-white' :
                              room.status === 'interest' ? 'bg-amber-500/80 text-white' :
                              'bg-gray-600 text-gray-300'
                            }`}>
                              {room.status.replace('_', ' ').toUpperCase()}
                            </div>
                          </div>

                          {/* Room Info */}
                          <div className="p-4">
                            <h4 className="font-medium text-white truncate">{room.name}</h4>
                            <div className="flex items-center gap-3 mt-2 text-sm">
                              <span className="text-blue-400 flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5" />
                                {roles.admins.length} admins
                              </span>
                              <span className="text-green-400 flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {roles.moderators.length} mods
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-gray-400 text-sm capitalize">{room.category}</span>
                              <span className="text-purple-400 text-sm font-medium">Manage →</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Selected Room Roles Panel */}
            {rolesSubTab === 'rooms' && selectedRoomForRoles && (
              <RoomRolesPanel
                room={{
                  id: selectedRoomForRoles.id,
                  name: selectedRoomForRoles.name,
                  image_url: selectedRoomForRoles.image_url,
                  status: selectedRoomForRoles.status,
                  category: selectedRoomForRoles.category,
                }}
                roomAdmins={roomRoles.get(selectedRoomForRoles.id)?.admins || []}
                roomModerators={roomRoles.get(selectedRoomForRoles.id)?.moderators || []}
                onBack={() => setSelectedRoomForRoles(null)}
                onAddAdmin={handleAddRoomAdmin}
                onAddModerator={handleAddRoomModerator}
                onRemoveAdmin={handleRemoveRoomAdmin}
                onRemoveModerator={handleRemoveRoomModerator}
                canManageAdmins={true}
                canManageModerators={true}
                isLoading={actionLoading !== null}
              />
            )}

            {/* Add App Admin Modal */}
            <AddRoleModal
              isOpen={showAddAppAdminModal}
              onClose={() => setShowAddAppAdminModal(false)}
              onConfirm={handleAddAppAdmin}
              roleType="app_admin"
              existingUserIds={appAdmins.map((a) => a.profile_id)}
              isLoading={actionLoading === 'add-app-admin'}
            />
          </div>
        )}

        {/* Gifts & Coins Tab */}
        {activeTab === 'gifts' && (
          <div className="space-y-8">
            {/* Gift Types */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-pink-400" />
                  Gift Types
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {giftTypes.map((gift) => (
                    <div
                      key={gift.id}
                      className={`p-4 rounded-xl border text-center ${
                        gift.is_active ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-800 border-gray-700 opacity-50'
                      }`}
                    >
                      <div className="text-4xl mb-2">{gift.emoji}</div>
                      <p className="font-medium text-white text-sm">{gift.name}</p>
                      <p className="text-yellow-400 text-sm">🪙 {gift.coin_cost}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <a href="/admin/gifts" className="text-blue-400 hover:underline text-sm">
                    Manage Gift Types →
                  </a>
                </div>
              </div>
            </div>

            {/* Coin Packs */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-400" />
                  Coin Packs
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {coinPacks.map((pack) => (
                    <div
                      key={pack.id}
                      className={`p-4 rounded-xl border ${
                        pack.is_active ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-800 border-gray-700 opacity-50'
                      } ${pack.is_popular ? 'ring-2 ring-purple-500' : ''}`}
                    >
                      {pack.is_popular && (
                        <div className="text-xs text-purple-400 font-medium mb-2">POPULAR</div>
                      )}
                      <p className="font-bold text-white">{pack.name}</p>
                      <p className="text-2xl font-bold text-yellow-400">🪙 {pack.coins.toLocaleString()}</p>
                      {pack.bonus_coins > 0 && (
                        <p className="text-green-400 text-sm">+{pack.bonus_coins.toLocaleString()} bonus</p>
                      )}
                      <p className="text-gray-400 text-lg mt-2">${pack.price_usd}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <a href="/admin/gifts" className="text-blue-400 hover:underline text-sm">
                    Manage Coin Packs →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">From</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">To</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-700/30">
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs bg-pink-500/20 text-pink-400 rounded capitalize">
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-300">@{tx.from_user || 'unknown'}</td>
                        <td className="px-6 py-4 text-gray-300">@{tx.to_user || 'unknown'}</td>
                        <td className="px-6 py-4 text-yellow-400">🪙 {tx.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-400 text-sm">{formatDate(tx.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-16 text-center border border-gray-700">
              <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">Analytics Coming Soon</p>
              <p className="text-gray-500 text-sm">Detailed charts and insights will be available here</p>
            </div>

            {/* Basic Stats */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h4 className="text-gray-400 text-sm mb-2">User Growth</h4>
                  <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
                  <p className="text-green-400 text-sm mt-1">+{stats.newUsersToday} today</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h4 className="text-gray-400 text-sm mb-2">Total Gifts</h4>
                  <p className="text-3xl font-bold text-white">{stats.totalGiftsSent.toLocaleString()}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h4 className="text-gray-400 text-sm mb-2">Active Streamers</h4>
                  <p className="text-3xl font-bold text-white">{users.filter(u => u.can_stream).length}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Platform Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-white">Maintenance Mode</p>
                    <p className="text-sm text-gray-400">Disable all streams and show maintenance message</p>
                  </div>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition">
                    Disabled
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-white">New Registrations</p>
                    <p className="text-sm text-gray-400">Allow new users to sign up</p>
                  </div>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                    Enabled
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-white">Require Application</p>
                    <p className="text-sm text-gray-400">New streamers must apply before going live</p>
                  </div>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                    Enabled
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <a href="/admin/moderation" className="p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition text-center">
                  <Shield className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-white text-sm">Moderation</p>
                </a>
                <a href="/admin/applications" className="p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition text-center">
                  <FileCheck className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-white text-sm">Applications</p>
                </a>
                <a href="/admin/gifts" className="p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition text-center">
                  <Gift className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                  <p className="text-white text-sm">Gifts & Coins</p>
                </a>
                <a href="/wallet" className="p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition text-center">
                  <Wallet className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <p className="text-white text-sm">Wallet</p>
                </a>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-gray-800 rounded-xl p-6 border border-red-500/50">
              <h3 className="text-lg font-semibold text-red-400 mb-4">⚠️ Danger Zone</h3>
              <div className="space-y-4">
                <button
                  onClick={handleEndAllStreams}
                  disabled={actionLoading === 'all-streams'}
                  className="w-full flex items-center justify-between p-4 bg-red-900/20 border border-red-500/30 rounded-lg hover:bg-red-900/30 transition disabled:opacity-50"
                >
                  <div className="text-left">
                    <p className="font-medium text-white">End All Streams</p>
                    <p className="text-sm text-gray-400">Immediately terminate all active streams</p>
                  </div>
                  <VideoOff className="w-5 h-5 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

