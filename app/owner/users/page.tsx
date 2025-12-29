'use client';

import { useEffect, useMemo, useState } from 'react';
import { 
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  Shield,
  Ban,
  Mail,
  Calendar,
  Coins,
  Gem,
  ExternalLink,
  MoreVertical,
  Eye,
  Radio,
} from 'lucide-react';
import {
  StatCard,
  Table,
  TableCell,
  TableToolbar,
  EmptyState,
  Skeleton,
  Button,
  Drawer,
  Badge,
  RowActions,
} from '@/components/owner/ui-kit';

// UI-only mock data structure (wire-ready)
interface User {
  id: string;
  username: string;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  isBanned: boolean;
  isVerified: boolean;
  hasLiveAccess: boolean;
  coinBalance: number;
  diamondBalance: number;
  createdAt: string;
  lastActiveAt: string;
  followerCount: number;
  followingCount: number;
}

type AdminUsersApi = {
  users: any[];
  limit: number;
  offset: number;
};

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isTruthy(v: unknown) {
  return v === true || String(v).toLowerCase() === 'true';
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'banned' | 'verified'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [users, setUsers] = useState<User[]>([]);

  const loadUsers = async (q: string) => {
    setLoading(true);
    try {
      const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}&limit=100&offset=0` : `?limit=100&offset=0`;
      const res = await fetch(`/api/admin/users${qs}`, { method: 'GET', credentials: 'include', cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
      const json = (await res.json()) as AdminUsersApi;

      const mapped: User[] = (json.users ?? []).map((p: any) => {
        const username = String(p?.username ?? 'unknown');

        const coinBalance = safeNumber(p?.coin_balance ?? p?.coinBalance);
        const earningsBalance = safeNumber(p?.earnings_balance ?? p?.earningsBalance);

        const bannedUntil = p?.banned_until ?? p?.user_sanctions?.banned_until ?? null;
        const isBanned = Boolean(bannedUntil);

        const isVerified = isTruthy(p?.is_verified ?? p?.verified ?? p?.adult_verified ?? p?.is_adult_verified);

        const liveAccessRow = p?.live_access_grants;
        const hasLiveAccess = Array.isArray(liveAccessRow) ? liveAccessRow.length > 0 : Boolean(liveAccessRow);

        return {
          id: String(p?.id ?? ''),
          username,
          displayName: p?.display_name ?? null,
          email: String(p?.email ?? ''),
          avatarUrl: p?.avatar_url ?? null,
          isBanned,
          isVerified,
          hasLiveAccess,
          coinBalance,
          diamondBalance: earningsBalance,
          createdAt: String(p?.created_at ?? new Date().toISOString()),
          lastActiveAt: String(p?.last_seen_at ?? p?.updated_at ?? p?.created_at ?? new Date().toISOString()),
          followerCount: safeNumber(p?.follower_count),
          followingCount: safeNumber(p?.following_count),
        };
      });

      setUsers(mapped);
    } catch (e) {
      console.error('[Owner Users] load failed:', e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers('');
  }, []);

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        if (filterStatus === 'banned') return u.isBanned;
        if (filterStatus === 'verified') return u.isVerified;
        if (filterStatus === 'active') return !u.isBanned;
        return true;
      })
      .filter((u) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          u.username.toLowerCase().includes(q) ||
          (u.displayName || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
        );
      });
  }, [users, filterStatus, searchQuery]);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => !u.isBanned).length;
  const bannedUsers = users.filter((u) => u.isBanned).length;
  const verifiedUsers = users.filter((u) => u.isVerified).length;

  const columns = [
    { key: 'user', label: 'User', width: 'flex-1' },
    { key: 'email', label: 'Email', width: 'w-48' },
    { key: 'status', label: 'Status', width: 'w-32' },
    { key: 'live', label: 'Live', width: 'w-24' },
    { key: 'coins', label: 'Coins', width: 'w-24' },
    { key: 'diamonds', label: 'Diamonds', width: 'w-24' },
    { key: 'joined', label: 'Joined', width: 'w-32' },
    { key: 'actions', label: '', width: 'w-16' },
  ];

  const setUserLiveAccess = async (userId: string, enabled: boolean) => {
    const res = await fetch('/api/admin/users/live-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ profileId: userId, enabled }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.error || `Failed (${res.status})`);
    }
  };

  const renderRow = (user: User) => (
    <>
      <TableCell className="flex-1">
        <div className="flex items-center gap-3">
          <img
            src={user.avatarUrl || '/no-profile-pic.png'}
            alt={user.username}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {user.displayName || user.username}
              </span>
              {user.isVerified && (
                <Shield className="w-4 h-4 text-primary" />
              )}
            </div>
            <span className="text-sm text-muted-foreground">@{user.username}</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="w-48">
        <span className="text-sm text-muted-foreground">{user.email}</span>
      </TableCell>
      <TableCell className="w-32">
        {user.isBanned ? (
          <Badge variant="destructive">Banned</Badge>
        ) : (
          <Badge variant="success">Active</Badge>
        )}
      </TableCell>
      <TableCell className="w-24">
        {user.hasLiveAccess ? (
          <Badge variant="info">Enabled</Badge>
        ) : (
          <Badge variant="default">Off</Badge>
        )}
      </TableCell>
      <TableCell className="w-24">
        <span className="text-sm font-mono">{user.coinBalance.toLocaleString()}</span>
      </TableCell>
      <TableCell className="w-24">
        <span className="text-sm font-mono">{user.diamondBalance.toLocaleString()}</span>
      </TableCell>
      <TableCell className="w-32">
        <span className="text-xs text-muted-foreground">
          {new Date(user.createdAt).toLocaleDateString()}
        </span>
      </TableCell>
      <TableCell className="w-16">
        <RowActions
          actions={[
            { label: 'View Details', icon: Eye, onClick: () => setSelectedUser(user) },
            { label: 'View Profile', icon: ExternalLink, onClick: () => window.open(`/${user.username}`, '_blank'), disabled: false },
            {
              label: user.hasLiveAccess ? 'Revoke Live Access' : 'Grant Live Access',
              icon: Radio,
              variant: user.hasLiveAccess ? 'destructive' : 'default',
              onClick: async () => {
                const next = !user.hasLiveAccess;
                const ok = window.confirm(
                  next
                    ? `Grant Live access to @${user.username}?`
                    : `Revoke Live access from @${user.username}?`
                );
                if (!ok) return;

                try {
                  await setUserLiveAccess(user.id, next);
                  setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, hasLiveAccess: next } : u)));
                } catch (e) {
                  console.error('[Owner Users] live access toggle failed:', e);
                  alert('Failed to update live access');
                }
              },
            },
            { label: 'Send Message', icon: Mail, onClick: () => {}, disabled: true, tooltip: 'Coming soon' },
            { label: user.isBanned ? 'Unban User' : 'Ban User', icon: Ban, onClick: () => {}, disabled: true, tooltip: 'Wire to ban RPC' },
          ]}
        />
      </TableCell>
    </>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          Users
        </h1>
        <p className="text-muted-foreground">
          Manage all platform users, balances, and permissions.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={totalUsers.toLocaleString()}
          icon={Users}
        />
        <StatCard
          title="Active Users"
          value={activeUsers.toLocaleString()}
          icon={UserCheck}
        />
        <StatCard
          title="Banned Users"
          value={bannedUsers.toLocaleString()}
          icon={UserX}
        />
        <StatCard
          title="Verified Users"
          value={verifiedUsers.toLocaleString()}
          icon={Shield}
        />
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredUsers}
        renderRow={renderRow}
        loading={loading}
        emptyState={{
          icon: Users,
          title: 'No Users Found',
          description: 'No users match your search criteria.',
        }}
        toolbar={
          <TableToolbar
            searchPlaceholder="Search users by name, email, or username..."
            searchValue={searchQuery}
            onSearchChange={(v) => {
              setSearchQuery(v);
              void loadUsers(v);
            }}
            filters={[
              {
                label: 'All Users',
                active: filterStatus === 'all',
                onClick: () => setFilterStatus('all'),
              },
              {
                label: 'Active',
                active: filterStatus === 'active',
                onClick: () => setFilterStatus('active'),
              },
              {
                label: 'Banned',
                active: filterStatus === 'banned',
                onClick: () => setFilterStatus('banned'),
              },
              {
                label: 'Verified',
                active: filterStatus === 'verified',
                onClick: () => setFilterStatus('verified'),
              },
            ]}
            actions={[
              {
                label: 'Export CSV',
                onClick: () => {},
                disabled: true,
                tooltip: 'Coming soon',
              },
            ]}
          />
        }
      />

      {/* User Detail Drawer */}
      {selectedUser && (
        <Drawer
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title={`${selectedUser.displayName || selectedUser.username}`}
          subtitle={`@${selectedUser.username}`}
        >
          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex justify-center">
              <img
                src={selectedUser.avatarUrl || '/no-profile-pic.png'}
                alt={selectedUser.username}
                className="w-24 h-24 rounded-full object-cover"
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Coins className="w-4 h-4" />
                  <span className="text-sm">Coins</span>
                </div>
                <p className="text-2xl font-bold">{selectedUser.coinBalance.toLocaleString()}</p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Gem className="w-4 h-4" />
                  <span className="text-sm">Diamonds</span>
                </div>
                <p className="text-2xl font-bold">{selectedUser.diamondBalance.toLocaleString()}</p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <p className="text-foreground">{selectedUser.email}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Joined</label>
                <p className="text-foreground">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Last Active</label>
                <p className="text-foreground">{new Date(selectedUser.lastActiveAt).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Followers</label>
                <p className="text-foreground">{selectedUser.followerCount.toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Following</label>
                <p className="text-foreground">{selectedUser.followingCount.toLocaleString()}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button variant="outline" className="w-full" disabled>
                Send Message
              </Button>
              <Button variant="outline" className="w-full" disabled>
                View Transaction History
              </Button>
              <Button variant="destructive" className="w-full" disabled>
                {selectedUser.isBanned ? 'Unban User' : 'Ban User'}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Actions are wire-ready placeholders. Connect to backend RPCs.
            </p>
          </div>
        </Drawer>
      )}
    </div>
  );
}

