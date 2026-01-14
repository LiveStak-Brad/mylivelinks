'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Shield } from 'lucide-react';
import type { TeamRole } from '@/lib/teamAdmin/types';
import { getTeamAdminCapabilities } from '@/lib/teamAdmin/permissions';
import { getMockRoleFromQuery } from '@/lib/teamAdmin/mockService';
import { createClient } from '@/lib/supabase';
import { Button, Badge } from '@/components/ui';

export interface TeamAdminGateProps {
  children: ReactNode;
}

function RoleBadge({ role }: { role: TeamRole }) {
  const styles: Record<TeamRole, string> = {
    Team_Admin: 'bg-primary/10 text-primary border-primary/20',
    Team_Moderator: 'bg-success/10 text-success border-success/20',
    Team_Member: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${styles[role]}`}>
      {role.replace('Team_', '')}
    </span>
  );
}

export default function TeamAdminGate({ children }: TeamAdminGateProps) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const [isAllowlisted, setIsAllowlisted] = useState<boolean>(false);
  const role = useMemo(() => {
    const q = sp?.get('role') ?? null;
    return getMockRoleFromQuery(q) ?? 'Team_Admin';
  }, [sp]);

  const caps = getTeamAdminCapabilities(role);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const isAllowed = (userId?: string | null, email?: string | null) => {
      const envIds = (process.env.NEXT_PUBLIC_ADMIN_PROFILE_IDS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const envEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const idMatch = !!(userId && envIds.includes(userId));
      const emailMatch = !!(email && envEmails.includes(email.toLowerCase()));
      return idMatch || emailMatch;
    };

    const run = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!mounted) return;
        setIsAllowlisted(isAllowed(user?.id, user?.email));
      } catch {
        if (!mounted) return;
        setIsAllowlisted(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, []);

  const canAccess = caps.canAccessAdminArea || isAllowlisted;

  if (!canAccess) {
    return (
      <div className="min-h-[calc(100vh-7rem)] bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Admin Access Required</h1>
          <p className="text-muted-foreground mb-4">You don&apos;t have permission to access this team console.</p>
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-sm text-muted-foreground">Current role:</span>
            <RoleBadge role={role} />
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-left">
            <p className="text-sm font-medium text-foreground mb-1">UI-only gating</p>
            <p className="text-sm text-muted-foreground mb-3">
              For demo, you can append a query param to simulate roles.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={`${pathname}?role=Team_Admin`}>
                <Button size="sm" variant="outline">Simulate Admin</Button>
              </a>
              <a href={`${pathname}?role=Team_Moderator`}>
                <Button size="sm" variant="outline">Simulate Moderator</Button>
              </a>
              <a href={`${pathname}?role=Team_Member`}>
                <Button size="sm" variant="outline">Simulate Member</Button>
              </a>
            </div>
            <div className="mt-3">
              <a href="/teams">
                <Button size="sm" variant="primary">Back to Teams</Button>
              </a>
            </div>
            <div className="mt-3">
              <Badge variant="secondary" size="sm">No backend changes</Badge>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-muted-foreground">Simulated role:</span>
          <RoleBadge role={role} />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a href={`${pathname}?role=Team_Admin`}>
            <Button size="sm" variant="outline">Admin</Button>
          </a>
          <a href={`${pathname}?role=Team_Moderator`}>
            <Button size="sm" variant="outline">Moderator</Button>
          </a>
          <a href={`${pathname}?role=Team_Member`}>
            <Button size="sm" variant="outline">Member</Button>
          </a>
        </div>
      </div>
      {children}
    </div>
  );
}
