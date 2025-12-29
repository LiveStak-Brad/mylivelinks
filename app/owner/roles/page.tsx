'use client';

import { useState } from 'react';
import {
  UserCog,
  Shield,
  Plus,
  Edit,
  Trash2,
  Users,
  Check,
  X,
} from 'lucide-react';
import {
  StatCard,
  Card,
  CardHeader,
  CardBody,
  Table,
  TableCell,
  EmptyState,
  Button,
  Badge,
  RowActions,
} from '@/components/owner/ui-kit';

// UI-only mock data structure (wire-ready)
interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

const PERMISSION_CATEGORIES = [
  { id: 'users', name: 'User Management' },
  { id: 'content', name: 'Content Moderation' },
  { id: 'live', name: 'Live Operations' },
  { id: 'monetization', name: 'Monetization' },
  { id: 'system', name: 'System Settings' },
];

const ALL_PERMISSIONS: Permission[] = [
  { id: 'users.view', name: 'View Users', description: 'View user profiles and information', category: 'users' },
  { id: 'users.edit', name: 'Edit Users', description: 'Edit user profiles and settings', category: 'users' },
  { id: 'users.ban', name: 'Ban Users', description: 'Ban or unban users', category: 'users' },
  { id: 'content.view', name: 'View Reports', description: 'View content reports', category: 'content' },
  { id: 'content.moderate', name: 'Moderate Content', description: 'Take action on reports', category: 'content' },
  { id: 'live.view', name: 'View Live Streams', description: 'Monitor live streams', category: 'live' },
  { id: 'live.moderate', name: 'Moderate Streams', description: 'End streams, shadow mute, etc.', category: 'live' },
  { id: 'monetization.view', name: 'View Revenue', description: 'View revenue analytics', category: 'monetization' },
  { id: 'monetization.manage', name: 'Manage Economy', description: 'Edit coin packs, gift types', category: 'monetization' },
  { id: 'system.view', name: 'View Settings', description: 'View system settings', category: 'system' },
  { id: 'system.edit', name: 'Edit Settings', description: 'Modify system settings', category: 'system' },
];

export default function RolesPage() {
  const [loading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // UI-only placeholders - ready for wiring
  const totalRoles = 0;
  const totalUsers = 0;
  const roles: Role[] = [];

  const columns = [
    { key: 'name', label: 'Role Name', width: 'flex-1' },
    { key: 'users', label: 'Users', width: 'w-24' },
    { key: 'permissions', label: 'Permissions', width: 'w-32' },
    { key: 'type', label: 'Type', width: 'w-32' },
    { key: 'actions', label: '', width: 'w-16' },
  ];

  const renderRow = (role: Role) => (
    <>
      <TableCell className="flex-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{role.name}</span>
            {role.isSystem && (
              <Badge variant="default">System</Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{role.description}</span>
        </div>
      </TableCell>
      <TableCell className="w-24">
        <span className="text-sm font-mono">{role.userCount}</span>
      </TableCell>
      <TableCell width="w-32">
        <span className="text-sm text-muted-foreground">{role.permissions.length} permissions</span>
      </TableCell>
      <TableCell width="w-32">
        {role.isSystem ? (
          <Badge variant="default">System</Badge>
        ) : (
          <Badge variant="secondary">Custom</Badge>
        )}
      </TableCell>
      <TableCell width="w-16">
        <RowActions
          actions={[
            { label: 'View Details', icon: UserCog, onClick: () => setSelectedRole(role) },
            { label: 'Edit Role', icon: Edit, onClick: () => {}, disabled: role.isSystem, tooltip: role.isSystem ? 'System roles cannot be edited' : undefined },
            { label: 'Delete Role', icon: Trash2, onClick: () => {}, disabled: role.isSystem || role.userCount > 0, tooltip: role.isSystem ? 'System roles cannot be deleted' : role.userCount > 0 ? 'Role has assigned users' : undefined },
          ]}
        />
      </TableCell>
    </>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <UserCog className="w-8 h-8 text-primary" />
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground">
            Manage staff roles and access permissions.
          </p>
        </div>
        <Button variant="primary" disabled>
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Total Roles"
          value={totalRoles.toLocaleString()}
          icon={Shield}
        />
        <StatCard
          title="Staff Members"
          value={totalUsers.toLocaleString()}
          icon={Users}
        />
      </div>

      {/* Roles Table */}
      <Card>
        <CardHeader
          title="Roles"
          subtitle="Manage role assignments and permissions"
        />
        <CardBody>
          <Table
            columns={columns}
            data={roles}
            renderRow={renderRow}
            loading={loading}
            emptyState={{
              icon: UserCog,
              title: 'No Roles Found',
              description: 'Create your first role to get started.',
              action: (
                <Button variant="primary" disabled>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Role
                </Button>
              ),
            }}
          />
        </CardBody>
      </Card>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader
          title="Permissions Matrix"
          subtitle="Overview of all available permissions"
        />
        <CardBody>
          <div className="space-y-6">
            {PERMISSION_CATEGORIES.map((category) => {
              const categoryPermissions = ALL_PERMISSIONS.filter(p => p.category === category.id);
              
              return (
                <div key={category.id}>
                  <h3 className="text-sm font-semibold text-foreground mb-3">{category.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryPermissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-start gap-3 p-3 border border-border rounded-lg bg-card"
                      >
                        <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm">{permission.name}</p>
                          <p className="text-xs text-muted-foreground">{permission.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> This is a UI-only placeholder. Wire to backend to manage actual role permissions and assignments.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

