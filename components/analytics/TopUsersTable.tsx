'use client';

import { ReactNode } from 'react';

export interface TopUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  primaryValue: number;
  secondaryValue?: number;
  badge?: ReactNode;
}

export interface TopUsersTableProps {
  title: string;
  users: TopUser[];
  columns: {
    primary: { label: string; prefix?: string; suffix?: string };
    secondary?: { label: string; prefix?: string; suffix?: string };
  };
  loading?: boolean;
  emptyMessage?: string;
  maxRows?: number;
  onUserClick?: (userId: string) => void;
}

export default function TopUsersTable({
  title,
  users,
  columns,
  loading = false,
  emptyMessage = 'No users to display',
  maxRows = 10,
  onUserClick,
}: TopUsersTableProps) {
  const formatValue = (value: number, prefix = '', suffix = '') => {
    if (value >= 1000000) return `${prefix}${(value / 1000000).toFixed(2)}M${suffix}`;
    if (value >= 1000) return `${prefix}${(value / 1000).toFixed(1)}K${suffix}`;
    return `${prefix}${value.toLocaleString()}${suffix}`;
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="h-5 w-32 bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-gray-700">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700">
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      
      {users.length === 0 ? (
        <div className="px-6 py-12 text-center text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-700/30 text-xs font-medium text-gray-400 uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-5">User</div>
            <div className="col-span-3 text-right">{columns.primary.label}</div>
            {columns.secondary && (
              <div className="col-span-3 text-right">{columns.secondary.label}</div>
            )}
          </div>
          
          {/* Rows */}
          <div className="divide-y divide-gray-700">
            {users.slice(0, maxRows).map((user, index) => (
              <div
                key={user.id}
                onClick={() => onUserClick?.(user.id)}
                className={`grid grid-cols-12 gap-4 px-6 py-4 items-center ${
                  onUserClick ? 'cursor-pointer hover:bg-gray-700/50 transition' : ''
                }`}
              >
                {/* Rank */}
                <div className="col-span-1">
                  <span className={`font-bold ${
                    index === 0 ? 'text-yellow-400' :
                    index === 1 ? 'text-gray-300' :
                    index === 2 ? 'text-amber-600' :
                    'text-gray-500'
                  }`}>
                    {index + 1}
                  </span>
                </div>
                
                {/* User */}
                <div className="col-span-5 flex items-center gap-3">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                      {(user.displayName || user.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.displayName || user.username}
                    </p>
                    {user.displayName && (
                      <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                    )}
                  </div>
                  {user.badge}
                </div>
                
                {/* Primary value */}
                <div className="col-span-3 text-right">
                  <span className="text-sm font-semibold text-white">
                    {formatValue(
                      user.primaryValue,
                      columns.primary.prefix,
                      columns.primary.suffix
                    )}
                  </span>
                </div>
                
                {/* Secondary value */}
                {columns.secondary && (
                  <div className="col-span-3 text-right">
                    <span className="text-sm text-gray-400">
                      {formatValue(
                        user.secondaryValue ?? 0,
                        columns.secondary.prefix,
                        columns.secondary.suffix
                      )}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}





