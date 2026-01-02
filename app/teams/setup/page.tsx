'use client';

/**
 * TeamsSetupPage - First-time Teams onboarding (Web)
 * 
 * Flow:
 * 1. Initial state: "Set up Teams" with Create Team or Skip
 * 2. After creating: "Invite Friends" to share team link
 * 3. Then redirects to /teams
 */

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Share2, PlusCircle, Check, Copy, ArrowRight } from 'lucide-react';
import { PageShell, PageHeader, PageSection } from '@/components/layout';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { createClient } from '@/lib/supabase';

const ONBOARDING_KEY = 'mylivelinks_teams_onboarding_completed';

interface CreatedTeam {
  id: string;
  name: string;
  slug: string;
  team_tag: string;
}

export default function TeamsSetupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  
  const [step, setStep] = useState<'setup' | 'invite'>('setup');
  const [createdTeam, setCreatedTeam] = useState<CreatedTeam | null>(null);
  
  // Form fields
  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [description, setDescription] = useState('');
  
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const markOnboardingComplete = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }
  }, []);

  const navigateToTeamPage = useCallback((slug?: string) => {
    if (slug) {
      router.push(`/teams/${slug}`);
    } else {
      router.push('/teams');
    }
  }, [router]);

  const generateSlug = (name: string): string => {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${base}-${randomSuffix}`.substring(0, 64);
  };

  const generateTeamTag = (name: string): string => {
    const words = name.trim().split(/\s+/);
    let tag = words.map(w => w[0]?.toUpperCase() || '').join('').substring(0, 5);
    while (tag.length < 3) {
      tag += Math.random().toString(36).substring(2, 3).toUpperCase();
    }
    return tag.replace(/[^A-Z0-9]/g, 'X').substring(0, 5);
  };

  const validateTag = (tag: string): boolean => {
    // Tag must be 3-5 uppercase alphanumeric characters
    return /^[A-Z0-9]{3,5}$/.test(tag);
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    // Use provided tag or generate one
    const finalTag = teamTag.trim().toUpperCase() || generateTeamTag(teamName.trim());
    
    if (!validateTag(finalTag)) {
      setError('Team tag must be 3-5 uppercase letters or numbers');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const slug = generateSlug(teamName.trim());

      const { data, error: rpcError } = await supabase.rpc('rpc_create_team', {
        p_name: teamName.trim(),
        p_slug: slug,
        p_team_tag: finalTag,
        p_description: description.trim() || null,
      });

      if (rpcError) {
        if (rpcError.message?.includes('one_team_per_creator')) {
          setError('You can only create one team');
        } else if (rpcError.message?.includes('unauthorized')) {
          setError('Please log in to create a team');
        } else {
          setError(rpcError.message || 'Failed to create team');
        }
        return;
      }

      // Team created successfully - show invite step
      setCreatedTeam({
        id: data?.id || '',
        name: teamName.trim(),
        slug: slug,
        team_tag: finalTag,
      });
      setStep('invite');
      markOnboardingComplete();
    } catch (err: any) {
      setError(err?.message || 'Failed to create team');
    } finally {
      setIsCreating(false);
    }
  };

  const getInviteUrl = () => {
    if (!createdTeam) return 'https://www.mylivelinks.com/join';
    return `https://www.mylivelinks.com/teams/${createdTeam.slug}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getInviteUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
    }
  };

  const handleShare = async () => {
    const inviteUrl = getInviteUrl();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${createdTeam?.name || 'my team'} on MyLiveLinks!`,
          text: `Hey! Join my team "${createdTeam?.name}" on MyLiveLinks. Let's build something together! 🚀`,
          url: inviteUrl,
        });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          // Fallback to copy
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleSkip = () => {
    markOnboardingComplete();
    navigateToTeamPage();
  };

  const handleDone = () => {
    // Navigate to the created team's page
    navigateToTeamPage(createdTeam?.slug);
  };

  // Step 2: Invite Friends (after creating team)
  if (step === 'invite' && createdTeam) {
    return (
      <PageShell maxWidth="sm" padding="lg" centerVertical>
        <div className="space-y-6">
          {/* Success Header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Team Created!
            </h1>
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">{createdTeam.name}</span> is ready. Now invite your friends to join.
            </p>
          </div>

          {/* Team Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-foreground">{createdTeam.team_tag}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">{createdTeam.name}</p>
                  <p className="text-sm text-muted-foreground">1 member</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invite Link */}
          <PageSection card title="Invite Link">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={getInviteUrl()}
                  readOnly
                  className="flex-1 text-sm font-mono"
                />
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <Button
                variant="primary"
                onClick={handleShare}
                className="w-full"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Invite Link
              </Button>
            </div>
          </PageSection>

          {/* Continue Button */}
          <Button
            variant="outline"
            onClick={handleDone}
            className="w-full"
          >
            Continue to Teams
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </PageShell>
    );
  }

  // Step 1: Create Team or Skip
  return (
    <PageShell maxWidth="sm" padding="lg" centerVertical>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Set up Teams"
          icon={<Users className="w-6 h-6 text-primary" />}
          description="Create your team and invite friends to build your first group."
        />

        {/* Create Team Card */}
        <PageSection card title="Create Your Team">
          <div className="space-y-4">
            {/* Team Name */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Team Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. The Night Owls"
                disabled={isCreating}
              />
            </div>

            {/* Team Tag */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Team Tag
              </label>
              <Input
                value={teamTag}
                onChange={(e) => {
                  // Only allow uppercase alphanumeric, max 5 chars
                  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 5);
                  setTeamTag(val);
                  setError(null);
                }}
                placeholder="e.g. OWLS"
                disabled={isCreating}
                maxLength={5}
              />
              <p className="text-xs text-muted-foreground mt-1">
                3-5 letters/numbers. Shown on badges and leaderboards.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's your team about?"
                disabled={isCreating}
                rows={3}
                maxLength={200}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {description.length}/200 characters
              </p>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            
            {/* Submit */}
            <Button
              variant="primary"
              onClick={handleCreateTeam}
              disabled={isCreating || !teamName.trim()}
              className="w-full"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              {isCreating ? 'Creating...' : 'Create Team'}
            </Button>
          </div>
        </PageSection>

        {/* Skip Link */}
        <div className="text-center">
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            You can create a team later from the Teams page.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
