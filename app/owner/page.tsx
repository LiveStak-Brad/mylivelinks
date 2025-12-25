'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';

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

interface DashboardStats {
  totalUsers: number;
  newUsersToday: number;
  activeStreams: number;
  totalGiftsSent: number;
  totalRevenue: number;
  pendingReports: number;
  pendingApplications: number;
}

type TabType = 'dashboard' | 'users' | 'streams' | 'reports' | 'applications' | 'gifts' | 'transactions' | 'analytics' | 'settings';

export default function OwnerPanel() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([]);
  const [coinPacks, setCoinPacks] = useState<CoinPack[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userFilter, setUserFilter] = useState<'all' | 'banned' | 'muted' | 'streamers' | 'verified'>('all');
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('pending');

  // Owner IDs
  const OWNER_IDS = ['2b4a1178-3c39-4179-94ea-314dd824a818'];
  const OWNER_EMAILS = ['wcba.mo@gmail.com'];

  useEffect(() => {
    checkOwnerAndLoad();
  }, []);

  const checkOwnerAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const ownerStatus = OWNER_IDS.includes(user.id) || OWNER_EMAILS.includes(user.email?.toLowerCase() || '');
      setIsOwner(ownerStatus);

      if (ownerStatus) {
        await loadAllData();
      }
    } catch (error) {
      console.error('Error checking owner:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    setRefreshing(true);
    await Promise.all([
      loadStats(),
      loadUsers(),
      loadLiveStreams(),
      loadReports(),
      loadApplications(),
      loadGiftTypes(),
      loadCoinPacks(),
      loadTransactions(),
    ]);
    setRefreshing(false);
  };

  const loadStats = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get new users today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: newUsersToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Get active streams
      const { count: activeStreams } = await supabase
        .from('live_streams')
        .select('*', { count: 'exact', head: true })
        .eq('live_available', true);

      // Get total gifts
      const { count: totalGiftsSent } = await supabase
        .from('gifts')
        .select('*', { count: 'exact', head: true });

      // Get pending reports
      const { count: pendingReports } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get pending applications
      const { count: pendingApplications } = await supabase
        .from('room_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setStats({
        totalUsers: totalUsers || 0,
        newUsersToday: newUsersToday || 0,
        activeStreams: activeStreams || 0,
        totalGiftsSent: totalGiftsSent || 0,
        totalRevenue: 0, // Would need to calculate from Stripe
        pendingReports: pendingReports || 0,
        pendingApplications: pendingApplications || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!error && data) {
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadLiveStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select(`
          *,
          profile:profiles(username, display_name, avatar_url)
        `)
        .eq('live_available', true)
        .order('started_at', { ascending: false });

      if (!error && data) {
        setLiveStreams(data);
      }
    } catch (error) {
      console.error('Error loading streams:', error);
    }
  };

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(username),
          reported_user:profiles!reports_reported_user_id_fkey(id, username)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && data) {
        setReports(data);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const loadApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('room_applications')
        .select(`
          *,
          profile:profiles(username, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setApplications(data);
      }
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
      const { data, error } = await supabase
        .from('coin_packs')
        .select('*')
        .order('price_usd', { ascending: true });

      if (!error && data) {
        setCoinPacks(data);
      }
    } catch (error) {
      console.error('Error loading coin packs:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('gifts')
        .select(`
          id,
          coins_spent,
          diamonds_awarded,
          created_at,
          from_profile:profiles!gifts_from_profile_id_fkey(username),
          to_profile:profiles!gifts_to_profile_id_fkey(username)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setTransactions(data.map((g: any) => ({
          id: g.id,
          type: 'gift',
          amount: g.coins_spent,
          created_at: g.created_at,
          from_user: g.from_profile?.username,
          to_user: g.to_profile?.username,
        })));
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
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
      await supabase.from('live_streams').update({ live_available: false, ended_at: new Date().toISOString() }).eq('id', streamId);
      setLiveStreams(liveStreams.filter(s => s.id !== streamId));
      if (stats) setStats({ ...stats, activeStreams: stats.activeStreams - 1 });
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
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('No session');
      
      await fetch('/api/admin/end-streams', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      setLiveStreams([]);
      if (stats) setStats({ ...stats, activeStreams: 0 });
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
      await supabase.from('reports').update({ status }).eq('id', reportId);
      setReports(reports.map(r => r.id === reportId ? { ...r, status } : r));
      if (stats) setStats({ ...stats, pendingReports: Math.max(0, stats.pendingReports - 1) });
    } catch (error) {
      alert('Failed to update report');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApplicationStatus = async (appId: string, profileId: string, status: 'approved' | 'rejected') => {
    setActionLoading(appId);
    try {
      await supabase.from('room_applications').update({ status, reviewed_at: new Date().toISOString() }).eq('id', appId);
      if (status === 'approved') {
        await supabase.from('profiles').update({ can_stream: true, room_approved: true }).eq('id', profileId);
      }
      setApplications(applications.map(a => a.id === appId ? { ...a, status } : a));
      if (stats) setStats({ ...stats, pendingApplications: Math.max(0, stats.pendingApplications - 1) });
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

  // Access denied
  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">This panel is restricted to the platform owner.</p>
          <button
            onClick={() => router.push('/live')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Back to Live
          </button>
        </div>
      </div>
    );
  }

  // Tabs configuration
  const tabs: { id: TabType; label: string; icon: any; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users, badge: users.length },
    { id: 'streams', label: 'Live Streams', icon: Radio, badge: liveStreams.length },
    { id: 'reports', label: 'Reports', icon: AlertTriangle, badge: stats?.pendingReports },
    { id: 'applications', label: 'Applications', icon: FileCheck, badge: stats?.pendingApplications },
    { id: 'gifts', label: 'Gifts & Coins', icon: Gift },
    { id: 'transactions', label: 'Transactions', icon: Wallet },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col fixed h-full">
        {/* Logo */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white">Owner Panel</h1>
              <p className="text-xs text-gray-400">MyLiveLinks</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <p className="text-gray-400">
              {activeTab === 'dashboard' && 'Platform overview and statistics'}
              {activeTab === 'users' && 'Manage all platform users'}
              {activeTab === 'streams' && 'Monitor and control live streams'}
              {activeTab === 'reports' && 'Review and handle user reports'}
              {activeTab === 'applications' && 'Approve or reject room applications'}
              {activeTab === 'gifts' && 'Manage gift types and coin packs'}
              {activeTab === 'transactions' && 'View all platform transactions'}
              {activeTab === 'analytics' && 'Platform analytics and insights'}
              {activeTab === 'settings' && 'Platform configuration'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadAllData}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <a
              href="/live"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              <ExternalLink className="w-4 h-4" />
              View Site
            </a>
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 text-blue-400" />
                  <span className="text-green-400 text-sm flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    +{stats.newUsersToday} today
                  </span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalUsers.toLocaleString()}</p>
                <p className="text-gray-400 text-sm">Total Users</p>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <Radio className="w-8 h-8 text-red-400" />
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.activeStreams}</p>
                <p className="text-gray-400 text-sm">Live Streams</p>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <Gift className="w-8 h-8 text-pink-400" />
                  <Activity className="w-5 h-5 text-gray-500" />
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalGiftsSent.toLocaleString()}</p>
                <p className="text-gray-400 text-sm">Gifts Sent</p>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <AlertTriangle className="w-8 h-8 text-amber-400" />
                  {stats.pendingReports > 0 && (
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                      Needs attention
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-white">{stats.pendingReports}</p>
                <p className="text-gray-400 text-sm">Pending Reports</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setActiveTab('reports')}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Review Reports ({stats.pendingReports})
                </button>
                <button
                  onClick={() => setActiveTab('applications')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  Review Applications ({stats.pendingApplications})
                </button>
                <button
                  onClick={handleEndAllStreams}
                  disabled={actionLoading === 'all-streams' || stats.activeStreams === 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <VideoOff className="w-4 h-4" />
                  End All Streams
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Streams */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Radio className="w-5 h-5 text-red-400" />
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
                          href="/live"
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

