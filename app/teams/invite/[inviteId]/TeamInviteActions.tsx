'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, useToast } from '@/components/ui';
import { acceptTeamInvite, declineTeamInvite } from '@/lib/teamInvites';

interface TeamInviteActionsProps {
  inviteId: number;
  teamName: string;
  teamSlug?: string | null;
}

export default function TeamInviteActions({ inviteId, teamName, teamSlug }: TeamInviteActionsProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const redirectToTeam = (slug?: string | null) => {
    if (slug) {
      router.push(`/teams/${slug}`);
    } else {
      router.push('/teams');
    }
    router.refresh();
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const result = await acceptTeamInvite(inviteId);
      if (!result?.success) {
        throw new Error(result?.error || 'Unable to accept this invite right now.');
      }

      toast({
        title: `Welcome to ${teamName}`,
        description: "You're all set. We'll take you to the team space.",
        variant: 'success',
      });

      redirectToTeam(result.team_slug ?? teamSlug);
    } catch (error: any) {
      toast({
        title: 'Could not accept invite',
        description: error?.message || 'Please try again in a moment.',
        variant: 'error',
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      const result = await declineTeamInvite(inviteId);
      if (!result?.success) {
        throw new Error(result?.error || 'Unable to decline this invite right now.');
      }

      toast({
        title: 'Invite declined',
        description: 'We let the team know. You can always join later if they resend.',
        variant: 'info',
      });

      redirectToTeam(teamSlug);
    } catch (error: any) {
      toast({
        title: 'Could not decline invite',
        description: error?.message || 'Please try again in a moment.',
        variant: 'error',
      });
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-4">
        <p className="text-sm font-semibold text-teal-900 dark:text-teal-100 sm:text-base">Unlimited teams</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Accepting this invite does not remove you from other teams. You can be part of as many crews as you like
          and switch between them anytime.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleAccept}
          isLoading={isAccepting}
          size="lg"
          className="flex-1"
        >
          Accept & Join
        </Button>
        <Button
          onClick={handleDecline}
          isLoading={isDeclining}
          variant="outline"
          size="lg"
          className="flex-1"
        >
          Decline
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Need a moment? You can leave this page and come back later—your invite stays pending until you respond.
      </p>
    </div>
  );
}

