import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Users, UserPlus, Info } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { PageHeader, PageSection, PageShell } from '@/components/layout';
import { Badge } from '@/components/ui';
import TeamInviteActions from './TeamInviteActions';

type PageProps = {
  params: {
    inviteId: string;
  };
};

type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired';

interface InviteRecord {
  id: number;
  team_id: string;
  inviter_id: string;
  invitee_id: string;
  status: InviteStatus;
  message: string | null;
  created_at: string;
  team: {
    id: string;
    name: string;
    slug: string;
    icon_url: string | null;
    tagline: string | null;
  } | null;
  inviter: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

const statusBadgeStyles: Record<InviteStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  accepted: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  declined: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
  expired: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
};

const statusCopy: Record<InviteStatus, string> = {
  pending: 'Pending response',
  accepted: 'Invite accepted',
  declined: 'Invite declined',
  expired: 'Invite expired',
};

export default async function TeamInvitePage({ params }: PageProps) {
  const inviteId = Number(params.inviteId);
  if (!Number.isFinite(inviteId)) {
    notFound();
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?returnUrl=${encodeURIComponent(`/teams/invite/${inviteId}`)}`);
  }

  const { data: invite, error } = await supabase
    .from('team_invites')
    .select(
      `
        id,
        team_id,
        inviter_id,
        invitee_id,
        status,
        message,
        created_at,
        team:teams!team_invites_team_id_fkey (
          id,
          name,
          slug,
          icon_url,
          tagline
        ),
        inviter:profiles!team_invites_inviter_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `
    )
    .eq('id', inviteId)
    .maybeSingle<InviteRecord>();

  if (error || !invite) {
    notFound();
  }

  const isInvitee = invite.invitee_id === user.id;
  const isInviter = invite.inviter_id === user.id;

  const { data: membership } = await supabase
    .from('team_memberships')
    .select('status')
    .eq('team_id', invite.team_id)
    .eq('profile_id', user.id)
    .maybeSingle<{ status: string }>();

  const membershipStatus = membership?.status ?? null;
  const alreadyMember = membershipStatus === 'approved';
  const waitingApproval = membershipStatus === 'pending';
  const canRespond = isInvitee && invite.status === 'pending' && !alreadyMember;

  const team = invite.team;
  const inviter = invite.inviter;
  const teamName = team?.name ?? 'Team unavailable';
  const inviterName = inviter?.display_name || inviter?.username || 'A teammate';
  const inviteSentAt = new Date(invite.created_at);
  const readableDate = inviteSentAt.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const statusLabel = statusCopy[invite.status];
  const helperMessage = !isInvitee
    ? 'Only the invited member can respond to this request.'
    : invite.status === 'accepted'
      ? 'You already accepted this invite.'
      : invite.status === 'declined'
        ? 'You declined this invite. Ask the team to resend if you change your mind.'
        : invite.status === 'expired'
          ? 'This invite has expired. Ask the team to send a new one.'
          : alreadyMember
            ? 'You are already approved in this team.'
            : waitingApproval
              ? 'You already have a membership request pending.'
              : '';

  return (
    <PageShell maxWidth="md" padding="lg">
      <PageHeader
        title="Team invite"
        description="Accept or decline the invitation below. Teams are additive—you can be in multiple crews."
        icon={<Users className="w-6 h-6 text-primary" />}
        backLink="/teams"
        backLabel="Back to Teams"
      />

      <PageSection card>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 rounded-2xl bg-muted flex items-center justify-center overflow-hidden">
                {team?.icon_url ? (
                  <Image
                    src={team.icon_url}
                    alt={teamName}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <span className="text-2xl font-semibold text-primary">{teamName[0] ?? '?'}</span>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Invite to</p>
                <h2 className="text-2xl font-semibold text-foreground">{teamName}</h2>
                {team?.tagline && <p className="text-sm text-muted-foreground mt-1">{team.tagline}</p>}
              </div>
            </div>

            <Badge className={statusBadgeStyles[invite.status]}>
              {statusLabel}
            </Badge>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Invited by</p>
                <p className="text-base font-medium text-foreground flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-muted-foreground" />
                  {inviterName}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                Sent {readableDate}
              </div>
            </div>

            {invite.message && (
              <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                “{invite.message}”
              </div>
            )}
          </div>

          {!canRespond && helperMessage && (
            <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
              <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <p>{helperMessage}</p>
            </div>
          )}

          {canRespond && (
            <TeamInviteActions
              inviteId={invite.id}
              teamName={teamName}
              teamSlug={team?.slug}
            />
          )}

          {invite.status === 'accepted' && team?.slug && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/teams/${team.slug}`}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary-hover"
              >
                Go to team space
              </Link>
            </div>
          )}

          <div className="flex flex-wrap gap-3 border-t border-border/40 pt-2">
            <Link
              href="/teams"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-transparent px-4 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Browse my teams
            </Link>
            {team?.slug && (
              <Link
                href={`/teams/${team.slug}`}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                View team profile
              </Link>
            )}
          </div>
        </div>
      </PageSection>
    </PageShell>
  );
}

