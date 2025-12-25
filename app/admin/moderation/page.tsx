'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Search, AlertTriangle, Ban, Clock, MessageSquare, ArrowLeft, Eye, Check, X } from 'lucide-react';

interface Report {
  id: string;
  report_type: string;
  report_reason: string;
  report_details: string | null;
  status: string;
  created_at: string;
  reporter: {
    username: string;
    display_name: string | null;
  } | null;
  reported_user: {
    id: string;
    username: string;
    display_name: string | null;
  } | null;
}

interface User {
  id: string;
  username: string;
  display_name: string | null;
  email?: string;
  is_banned: boolean;
  is_muted: boolean;
  muted_until: string | null;
  created_at: string;
}

export default function ModerationPage() {
  const router = useRouter();
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'reports' | 'users'>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const isAllowedAdmin = (userId?: string | null, email?: string | null) => {
    const envIds = (process.env.NEXT_PUBLIC_ADMIN_PROFILE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
    const envEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const hardcodedIds = ['2b4a1178-3c39-4179-94ea-314dd824a818'];
    const hardcodedEmails = ['wcba.mo@gmail.com'];
    const idMatch = userId && (envIds.includes(userId) || hardcodedIds.includes(userId));
    const emailMatch = email && (envEmails.includes(email.toLowerCase()) || hardcodedEmails.includes(email.toLowerCase()));
    return !!(idMatch || emailMatch);
  };

  const checkAdminAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const adminStatus = isAllowedAdmin(user.id, user.email);
      setIsAdmin(adminStatus);

      if (adminStatus) {
        await Promise.all([loadReports(), loadUsers()]);
      }
    } catch (error) {
      console.error('Error checking admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          report_type,
          report_reason,
          report_details,
          status,
          created_at,
          reporter:profiles!reports_reporter_id_fkey(username, display_name),
          reported_user:profiles!reports_reported_user_id_fkey(id, username, display_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setReports(data);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, is_banned, is_muted, muted_until, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleBanUser = async (userId: string, ban: boolean) => {
    if (!confirm(`Are you sure you want to ${ban ? 'ban' : 'unban'} this user?`)) return;

    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: ban })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, is_banned: ban } : u));
      alert(`User ${ban ? 'banned' : 'unbanned'} successfully`);
    } catch (error) {
      console.error('Error updating ban status:', error);
      alert('Failed to update ban status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMuteUser = async (userId: string, mute: boolean, duration?: number) => {
    setActionLoading(userId);
    try {
      const mutedUntil = mute && duration 
        ? new Date(Date.now() + duration * 60000).toISOString()
        : null;

      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_muted: mute,
          muted_until: mutedUntil,
        })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, is_muted: mute, muted_until: mutedUntil } : u));
      alert(`User ${mute ? 'muted' : 'unmuted'} successfully`);
    } catch (error) {
      console.error('Error updating mute status:', error);
      alert('Failed to update mute status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    setActionLoading(reportId);
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status })
        .eq('id', reportId);

      if (error) throw error;

      setReports(reports.map(r => r.id === reportId ? { ...r, status } : r));
    } catch (error) {
      console.error('Error resolving report:', error);
      alert('Failed to update report');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">You don't have permission to access this page.</p>
          <button onClick={goBack} className="text-blue-500 hover:underline">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={goBack} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Shield className="w-8 h-8 text-purple-500" />
                Moderation Panel
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Manage reports and user moderation</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'reports'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Reports ({reports.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Ban className="w-4 h-4 inline mr-2" />
            Users
          </button>
        </div>

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center">
                <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No reports yet</p>
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow ${
                    report.status === 'pending' ? 'border-l-4 border-amber-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          report.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            : report.status === 'resolved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {report.status.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">{report.report_type}</span>
                        <span className="text-sm text-gray-400">{formatDate(report.created_at)}</span>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white mb-1">
                        Reason: {report.report_reason.replace(/_/g, ' ')}
                      </p>
                      {report.report_details && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          "{report.report_details}"
                        </p>
                      )}
                      <div className="text-sm text-gray-500">
                        <span>Reported by: @{report.reporter?.username || 'unknown'}</span>
                        {report.reported_user && (
                          <span className="ml-4">
                            Against: <a href={`/${report.reported_user.username}`} className="text-blue-500 hover:underline">@{report.reported_user.username}</a>
                          </span>
                        )}
                      </div>
                    </div>
                    {report.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolveReport(report.id, 'resolved')}
                          disabled={actionLoading === report.id}
                          className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition disabled:opacity-50"
                          title="Resolve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResolveReport(report.id, 'dismissed')}
                          disabled={actionLoading === report.id}
                          className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                          title="Dismiss"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* User List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.display_name || user.username}
                          </p>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {user.is_banned && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded">
                              Banned
                            </span>
                          )}
                          {user.is_muted && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                              Muted
                            </span>
                          )}
                          {!user.is_banned && !user.is_muted && (
                            <span className="text-sm text-gray-500">Active</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <a
                            href={`/${user.username}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                          {!user.is_muted ? (
                            <button
                              onClick={() => handleMuteUser(user.id, true, 60)}
                              disabled={actionLoading === user.id}
                              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded transition disabled:opacity-50"
                              title="Mute (1 hour)"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMuteUser(user.id, false)}
                              disabled={actionLoading === user.id}
                              className="p-2 text-green-600 hover:bg-green-50 rounded transition disabled:opacity-50"
                              title="Unmute"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}
                          {!user.is_banned ? (
                            <button
                              onClick={() => handleBanUser(user.id, true)}
                              disabled={actionLoading === user.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                              title="Ban User"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBanUser(user.id, false)}
                              disabled={actionLoading === user.id}
                              className="p-2 text-green-600 hover:bg-green-50 rounded transition disabled:opacity-50"
                              title="Unban User"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

