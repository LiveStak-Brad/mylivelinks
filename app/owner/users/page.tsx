'use client';

import { useState } from 'react';
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
  coinBalance: number;
  diamondBalance: number;
  createdAt: string;
  lastActiveAt: string;
  followerCount: number;
  followingCount: number;
}

export default function UsersPage() {
  const [loading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'banned' | 'verified'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // UI-only placeholders - ready for wiring
  const totalUsers = 0;
  const activeUsers = 0;
  const bannedUsers = 0;
  const verifiedUsers = 0;
  const users: User[] = [];

  const columns = [
    { key: 'user', label: 'User', width: 'flex-1' },
    { key: 'email', label: 'Email', width: 'w-48' },
    { key: 'status', label: 'Status', width: 'w-32' },
    { key: 'coins', label: 'Coins', width: 'w-24' },
    { key: 'diamonds', label: 'Diamonds', width: 'w-24' },
    { key: 'joined', label: 'Joined', width: 'w-32' },
    { key: 'actions', label: '', width: 'w-16' },
  ];

  const renderRow = (user: User) => (
    <>
      <TableCell width="flex-1">
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
      <TableCell width="w-48">
        <span className="text-sm text-muted-foreground">{user.email}</span>
      </TableCell>
      <TableCell width="w-32">
        {user.isBanned ? (
          <Badge variant="destructive">Banned</Badge>
        ) : (
          <Badge variant="success">Active</Badge>
        )}
      </TableCell>
      <TableCell width="w-24">
        <span className="text-sm font-mono">{user.coinBalance.toLocaleString()}</span>
      </TableCell>
      <TableCell width="w-24">
        <span className="text-sm font-mono">{user.diamondBalance.toLocaleString()}</span>
      </TableCell>
      <TableCell width="w-32">
        <span className="text-xs text-muted-foreground">
          {new Date(user.createdAt).toLocaleDateString()}
        </span>
      </TableCell>
      <TableCell width="w-16">
        <RowActions
          actions={[
            { label: 'View Details', icon: Eye, onClick: () => setSelectedUser(user) },
            { label: 'View Profile', icon: ExternalLink, onClick: () => window.open(`/${user.username}`, '_blank'), disabled: false },
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
        data={users}
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
            onSearchChange={setSearchQuery}
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

