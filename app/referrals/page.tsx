'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Gift,
  TrendingUp,
  Award,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Crown,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button, Badge, Skeleton } from '@/components/ui';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

/* =============================================================================
   REFERRALS PAGE
   
   Route: /referrals
   
   User-facing referral tracking page. Shows:
   - Personal referral code
   - Referral stats (clicks, signups, earnings)
   - Leaderboard position
   - How the referral system works
   
   UI is real with placeholder data where backend isn't wired yet.
   Referenced by: ReferralProgressModule and various referral entry points
============================================================================= */

interface ReferralStats {
  referralCode: string;
  clicks: number;
  signups: number;
  earningsCoins: number;
  rank: number | null;
  totalReferrers: number;
}

export default function ReferralsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [inviteUrl, setInviteUrl] = useState<string>('');

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      setLoading(true);

      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Get profile for username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (profile?.username) {
        setUsername(profile.username);
      }

      // Fetch referral stats
      const [codeRes, statsRes, rankRes] = await Promise.all([
        fetch('/api/referrals/me/code'),
        fetch('/api/referrals/me/stats'),
        fetch('/api/referrals/me/rank'),
      ]);

      const codeData = codeRes.ok ? await codeRes.json() : null;
      const statsData = statsRes.ok ? await statsRes.json() : null;
      const rankData = rankRes.ok ? await rankRes.json() : null;

      const apiInviteUrl = typeof codeData?.url === 'string' ? String(codeData.url).trim() : '';
      if (apiInviteUrl) {
        setInviteUrl(apiInviteUrl);
      } else {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.mylivelinks.com';
        const uname = typeof profile?.username === 'string' ? String(profile.username).trim() : '';
        if (uname) setInviteUrl(`${origin}/invite/${encodeURIComponent(uname)}`);
      }

      setStats({
        referralCode: codeData?.code || profile?.username || 'loading',
        clicks: statsData?.clicks || 0,
        signups: statsData?.signups || 0,
        earningsCoins: statsData?.earnings_coins || 0,
        rank: rankData?.rank || null,
        totalReferrers: rankData?.total_referrers || 0,
      });
    } catch (error) {
      console.error('Error loading referral data:', error);
      // Show placeholder data on error
      setStats({
        referralCode: username || 'loading',
        clicks: 0,
        signups: 0,
        earningsCoins: 0,
        rank: null,
        totalReferrers: 0,
      });

      if (!inviteUrl) {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.mylivelinks.com';
        if (username) setInviteUrl(`${origin}/invite/${encodeURIComponent(username)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getReferralUrl = () => {
    if (inviteUrl) return inviteUrl;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.mylivelinks.com';
    if (username) return `${origin}/invite/${encodeURIComponent(username)}`;
    return '';
  };

  const handleCopyLink = () => {
    const url = getReferralUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const url = getReferralUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join MyLiveLinks!',
          text: 'Check out MyLiveLinks - Live streaming, links, and exclusive content!',
          url,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <main 
      id="main"
      className="min-h-[calc(100vh-7rem)] bg-background pb-24 md:pb-8"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Page Header */}
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600">
              <Users className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Referral Program
              </h1>
              <p className="text-sm text-muted-foreground">
                Invite friends and earn rewards
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          
          {/* Referral Link Card */}
          <Card className="animate-slide-up">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Share2 className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  Your Referral Link
                </h2>
              </div>

              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-muted/50 rounded-lg p-4 mb-3 font-mono text-sm text-foreground break-all">
                    {getReferralUrl()}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCopyLink}
                      variant={copied ? 'primary' : 'secondary'}
                      className="flex-1"
                      leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    >
                      {copied ? 'Copied!' : 'Copy Link'}
                    </Button>
                    <Button
                      onClick={handleShare}
                      variant="primary"
                      leftIcon={<Share2 className="w-4 h-4" />}
                    >
                      Share
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <Card>
              <CardContent className="p-4 text-center">
                {loading ? (
                  <>
                    <Skeleton className="h-8 w-16 mx-auto mb-2" />
                    <Skeleton className="h-4 w-20 mx-auto" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground mb-1">
                      {stats?.clicks || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Link Clicks
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                {loading ? (
                  <>
                    <Skeleton className="h-8 w-16 mx-auto mb-2" />
                    <Skeleton className="h-4 w-20 mx-auto" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-success mb-1">
                      {stats?.signups || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Signups
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                {loading ? (
                  <>
                    <Skeleton className="h-8 w-16 mx-auto mb-2" />
                    <Skeleton className="h-4 w-20 mx-auto" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-warning mb-1">
                      {stats?.earningsCoins.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Coins Earned
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                {loading ? (
                  <>
                    <Skeleton className="h-8 w-16 mx-auto mb-2" />
                    <Skeleton className="h-4 w-20 mx-auto" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-primary mb-1">
                      {stats?.rank ? `#${stats.rank}` : '—'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Your Rank
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* How It Works */}
          <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  How It Works
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Share Your Link</h3>
                    <p className="text-sm text-muted-foreground">
                      Share your unique referral link with friends on social media, messages, or anywhere you like.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Friends Sign Up</h3>
                    <p className="text-sm text-muted-foreground">
                      When someone signs up using your link, they become your referral and you both get rewarded.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Earn Rewards</h3>
                    <p className="text-sm text-muted-foreground">
                      Get coins for each successful referral and climb the leaderboard for bonus rewards!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard CTA */}
          <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/30 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Compete on the Leaderboard
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    See how you rank against other top referrers and compete for exclusive prizes.
                  </p>
                  <Link href="/leaderboards">
                    <Button
                      variant="primary"
                      leftIcon={<Award className="w-4 h-4" />}
                      rightIcon={<ExternalLink className="w-4 h-4" />}
                    >
                      View Leaderboard
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </main>
  );
}

