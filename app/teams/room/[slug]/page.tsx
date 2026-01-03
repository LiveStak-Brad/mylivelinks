'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Video, Users, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import LiveRoom from '@/components/LiveRoom';
import LiveRoomErrorBoundary from '@/components/LiveRoomErrorBoundary';
import { createTeamRoomConfig, type RoomConfig } from '@/lib/room-config';
import { Button, Card } from '@/components/ui';

type LoadingState = { status: 'loading' };
type ErrorState = { status: 'error'; message: string };
type LockedState = {
  status: 'locked';
  teamSlug: string;
  teamName: string;
  approvedCount: number;
  unlockThreshold: number;
};
type PrivateState = { status: 'private'; teamSlug: string; teamName: string };
type ReadyState = { status: 'ready'; roomConfig: RoomConfig };
type ViewState = LoadingState | ErrorState | LockedState | PrivateState | ReadyState;

export default function TeamRoomPage() {
  const params = useParams<{ slug: string }>();
  const slug = (params?.slug ?? '').toLowerCase();
  const supabase = createClient();
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    const fetchRoom = async () => {
      if (!slug) {
        setState({ status: 'error', message: 'Team slug missing.' });
        return;
      }

      setState({ status: 'loading' });

      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('rpc_get_team_live_room_config', {
          p_team_slug: slug,
        });
        if (rpcError) throw rpcError;

        const payload = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        if (!payload) {
          throw new Error('team_not_found');
        }

        if (!payload.is_unlocked) {
          if (cancelled) return;
          setState({
            status: 'locked',
            teamSlug: payload.team_slug,
            teamName: payload.team_name,
            approvedCount: payload.approved_member_count ?? 0,
            unlockThreshold: payload.unlock_threshold ?? 100,
          });
          return;
        }

        if (payload.visibility === 'private' && !payload.is_member) {
          if (cancelled) return;
          setState({
            status: 'private',
            teamSlug: payload.team_slug,
            teamName: payload.team_name,
          });
          return;
        }

        const { data: teamRow, error: teamError } = await supabase
          .from('teams')
          .select('id, slug, name, icon_url, banner_url, created_by')
          .eq('slug', payload.team_slug)
          .single();

        if (teamError || !teamRow) {
          throw teamError || new Error('team_not_found');
        }

        let presentedBy: string | undefined;
        if (teamRow.created_by) {
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('display_name, username')
            .eq('id', teamRow.created_by)
            .maybeSingle();
          const ownerName = ownerProfile?.display_name || ownerProfile?.username || undefined;
          presentedBy = ownerName ? `Owner: ${ownerName}` : 'Team Owner';
        }

        const roomConfig = createTeamRoomConfig(
          teamRow.id,
          teamRow.slug,
          teamRow.name,
          teamRow.icon_url ?? undefined,
          teamRow.banner_url ?? undefined,
          presentedBy
        );

        if (cancelled) return;
        setState({ status: 'ready', roomConfig });
      } catch (err: any) {
        console.error('[TeamRoomPage] Failed to load team room', err);
        if (cancelled) return;
        setState({
          status: 'error',
          message: err?.message || 'Failed to load team room.',
        });
      }
    };

    fetchRoom();
    return () => {
      cancelled = true;
    };
  }, [slug, supabase]);

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse">
            <Video className="w-8 h-8 text-white" />
          </div>
          <p className="text-muted-foreground">Loading Team Live room…</p>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <ErrorCard
        title="Unable to load Team Live"
        description={state.message}
        actionLabel="Back to LiveTV"
        actionHref="/liveTV"
        icon={<Video className="w-10 h-10 text-muted-foreground" />}
      />
    );
  }

  if (state.status === 'locked') {
    const progress = Math.min(
      100,
      Math.max(0, Math.round((state.approvedCount / state.unlockThreshold) * 100))
    );

    return (
      <AccessCard
        title={`${state.teamName} Team Live is locked`}
        description={`Team Live unlocks at ${state.unlockThreshold} members. You're at ${state.approvedCount}.`}
        icon={<Users className="w-10 h-10 text-amber-400" />}
        footer={
          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-white/60 text-center">
              {state.approvedCount}/{state.unlockThreshold} members
            </p>
          </div>
        }
        actionLabel="View Team"
        actionHref={`/teams/${state.teamSlug}`}
      />
    );
  }

  if (state.status === 'private') {
    return (
      <AccessCard
        title="Team Live is private"
        description="Only approved team members can view this Team Live room."
        icon={<Lock className="w-10 h-10 text-rose-400" />}
        actionLabel="Back to Team"
        actionHref={`/teams/${state.teamSlug}`}
      />
    );
  }

  return (
    <LiveRoomErrorBoundary>
      <LiveRoom roomConfig={state.roomConfig} />
    </LiveRoomErrorBoundary>
  );
}

function ErrorCard({
  title,
  description,
  actionLabel,
  actionHref,
  icon,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  icon: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center border-0 shadow-2xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-destructive via-destructive/70 to-destructive" />
        <div className="p-8 space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-muted flex items-center justify-center">{icon}</div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
            <p className="text-muted-foreground">{description}</p>
          </div>
          <Link href={actionHref}>
            <Button variant="outline" className="gap-2">
              {actionLabel}
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

function AccessCard({
  title,
  description,
  icon,
  actionLabel,
  actionHref,
  footer,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  actionLabel: string;
  actionHref: string;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center border-0 shadow-2xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500" />
        <div className="p-8 space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-muted flex items-center justify-center">{icon}</div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
            <p className="text-muted-foreground">{description}</p>
          </div>
          {footer}
          <Link href={actionHref}>
            <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90">{actionLabel}</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
