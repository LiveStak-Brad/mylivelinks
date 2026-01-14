'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Search, AlertTriangle, Ban, Clock, MessageSquare, Eye, Check, X, Users } from 'lucide-react';
import { DashboardPage, DashboardSection, type DashboardTab } from '@/components/layout';
import { Button, IconButton, Input, Badge, Skeleton } from '@/components/ui';

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
    const idMatch = userId && envIds.includes(userId);
    const emailMatch = email && envEmails.includes(email.toLowerCase());
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
        type RawReport = Omit<Report, 'reporter' | 'reported_user'> & {
          reporter: Report['reporter'] | Array<NonNullable<Report['reporter']>> | null;
          reported_user: Report['reported_user'] | Array<NonNullable<Report['reported_user']>> | null;
        };

        const normalized = (data as unknown as RawReport[]).map((r) => {
          const reporter = Array.isArray(r.reporter) ? r.reporter[0] ?? null : r.reporter ?? null;
          const reported_user = Array.isArray(r.reported_user) ? r.reported_user[0] ?? null : r.reported_user ?? null;
          return {
            ...r,
            reporter,
            reported_user,
          } satisfies Report;
        });

        setReports(normalized);
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

  const pendingReports = reports.filter(r => r.status === 'pending');

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading moderation panel...</p>
        </div>
      </div>
    );
  }

  // Access denied state
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You don't have permission to access this page.</p>
          <Button variant="ghost" onClick={() => router.back()}>
            ← Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Build tabs
  const tabs: DashboardTab[] = [
    {
      id: 'reports',
      label: `Reports (${pendingReports.length})`,
      icon: <AlertTriangle className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <DashboardSection className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No reports yet</p>
            </DashboardSection>
          ) : (
            reports.map((report) => (
              <DashboardSection
                key={report.id}
                className={report.status === 'pending' ? 'border-l-4 border-l-warning' : ''}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge
                        variant={
                          report.status === 'pending' ? 'warning' :
                          report.status === 'resolved' ? 'success' :
                          'default'
                        }
                        size="sm"
                      >
                        {report.status.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{report.report_type}</span>
                      <span className="text-sm text-muted-foreground">{formatDate(report.created_at)}</span>
                    </div>
                    <p className="font-medium text-foreground mb-1">
                      Reason: {report.report_reason.replace(/_/g, ' ')}
                    </p>
                    {report.report_details && (
                      <p className="text-sm text-muted-foreground mb-2 italic">
                        "{report.report_details}"
                      </p>
                    )}
                    <div className="text-sm text-muted-foreground">
                      <span>Reported by: @{report.reporter?.username || 'unknown'}</span>
                      {report.reported_user && (
                        <span className="ml-4">
                          Against:{' '}
                          <Link href={`/${report.reported_user.username}`} className="text-primary hover:underline">
                            @{report.reported_user.username}
                          </Link>
                        </span>
                      )}
                    </div>
                  </div>
                  {report.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <IconButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResolveReport(report.id, 'resolved')}
                        disabled={actionLoading === report.id}
                        aria-label="Resolve report"
                        className="text-success hover:bg-success/10"
                      >
                        <Check className="w-4 h-4" />
                      </IconButton>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResolveReport(report.id, 'dismissed')}
                        disabled={actionLoading === report.id}
                        aria-label="Dismiss report"
                        className="text-muted-foreground hover:bg-muted"
                      >
                        <X className="w-4 h-4" />
                      </IconButton>
                    </div>
                  )}
                </div>
              </DashboardSection>
            ))
          )}
        </div>
      ),
    },
    {
      id: 'users',
      label: 'Users',
      icon: <Users className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          {/* Search */}
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            inputSize="lg"
          />

          {/* User Table */}
          <DashboardSection>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Joined</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {user.display_name || user.username}
                          </p>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {user.is_banned && (
                            <Badge variant="destructive" size="sm">Banned</Badge>
                          )}
                          {user.is_muted && (
                            <Badge variant="warning" size="sm">Muted</Badge>
                          )}
                          {!user.is_banned && !user.is_muted && (
                            <span className="text-sm text-muted-foreground">Active</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <IconButton
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/${user.username}`)}
                            aria-label="View profile"
                            className="text-primary"
                          >
                            <Eye className="w-4 h-4" />
                          </IconButton>
                          <IconButton
                            variant="ghost"
                            size="sm"
                            onClick={() => user.is_muted 
                              ? handleMuteUser(user.id, false) 
                              : handleMuteUser(user.id, true, 60)
                            }
                            disabled={actionLoading === user.id}
                            aria-label={user.is_muted ? 'Unmute user' : 'Mute user (1 hour)'}
                            className={user.is_muted ? 'text-success' : 'text-warning'}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </IconButton>
                          <IconButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleBanUser(user.id, !user.is_banned)}
                            disabled={actionLoading === user.id}
                            aria-label={user.is_banned ? 'Unban user' : 'Ban user'}
                            className={user.is_banned ? 'text-success' : 'text-destructive'}
                          >
                            <Ban className="w-4 h-4" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DashboardSection>
        </div>
      ),
    },
  ];

  return (
    <DashboardPage
      title="Moderation Panel"
      description="Manage reports and user moderation"
      icon={<Shield className="w-6 h-6" />}
      tabs={tabs}
      defaultTab="reports"
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as 'reports' | 'users')}
      showRefresh={false}
    />
  );
}
