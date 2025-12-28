'use client';

import { useState } from 'react';
import { Users, UserPlus, Activity, Trophy, Share2, ExternalLink, TrendingUp, Award } from 'lucide-react';
import { Button } from '@/components/ui';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

interface ReferralProgressModuleProps {
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
  accentColor?: string;
  className?: string;
}

export default function ReferralProgressModule({ 
  cardStyle = {},
  borderRadiusClass = 'rounded-xl',
  accentColor = '#8B5CF6',
  className = '' 
}: ReferralProgressModuleProps) {
  const [copied, setCopied] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loadingInviteUrl, setLoadingInviteUrl] = useState(false);
  
  // Mock data - in production, fetch from API/database
  const referralStats = {
    joinedCount: 12,
    activeCount: 8,
    rank: 247,
    totalReferrers: 1853
  };

  const ensureInviteUrl = async () => {
    if (inviteUrl) return inviteUrl;
    setLoadingInviteUrl(true);
    try {
      const supabase = createClient();
      const { data: referralData, error: referralErr } = await supabase.rpc('get_or_create_referral_code');
      const code = (referralData as any)?.code as string | undefined;
      const nextUrl = !referralErr && code ? `https://mylivelinks.com/join?ref=${code}` : 'https://mylivelinks.com/join';
      setInviteUrl(nextUrl);
      return nextUrl;
    } catch (err) {
      console.warn('[referrals] get_or_create_referral_code failed (non-blocking):', err);
      const nextUrl = 'https://mylivelinks.com/join';
      setInviteUrl(nextUrl);
      return nextUrl;
    } finally {
      setLoadingInviteUrl(false);
    }
  };

  const handleShareLink = async () => {
    const url = await ensureInviteUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join MyLiveLinks!',
          text: 'Join me on MyLiveLinks - Live streaming, links, and more!',
          url
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const activePercentage = referralStats.joinedCount > 0 
    ? Math.round((referralStats.activeCount / referralStats.joinedCount) * 100)
    : 0;

  return (
    <div 
      className={`${borderRadiusClass} overflow-hidden shadow-lg ${className}`}
      style={cardStyle}
    >
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <Users className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Referral Network
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Track your invite progress
              </p>
            </div>
          </div>
          
          {/* Rank Badge */}
          <div 
            className="px-3 py-1 rounded-full flex items-center gap-1.5"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <Trophy className="w-4 h-4" style={{ color: accentColor }} />
            <span className="text-sm font-bold" style={{ color: accentColor }}>
              #{referralStats.rank}
            </span>
          </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Joined Count */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Joined
              </span>
            </div>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {referralStats.joinedCount}
            </p>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
              Total signups
            </p>
          </div>
          
          {/* Active Count */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">
                Active
              </span>
            </div>
            <p className="text-3xl font-bold text-green-900 dark:text-green-100">
              {referralStats.activeCount}
            </p>
            <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
              {activePercentage}% active rate
            </p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Active Conversion
            </span>
            <span className="text-sm font-bold" style={{ color: accentColor }}>
              {activePercentage}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${activePercentage}%`,
                backgroundColor: accentColor
              }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {referralStats.activeCount} out of {referralStats.joinedCount} referrals are active users
          </p>
        </div>
        
        {/* Rank Info */}
        <div 
          className="p-4 rounded-xl mb-6"
          style={{ backgroundColor: `${accentColor}08` }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <Award className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                Ranked #{referralStats.rank}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Out of {referralStats.totalReferrers.toLocaleString()} total referrers
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleShareLink}
            className="flex-1"
            style={{ backgroundColor: accentColor }}
            disabled={loadingInviteUrl}
          >
            <Share2 className="w-4 h-4 mr-2" />
            {loadingInviteUrl ? 'Loading…' : copied ? 'Link Copied!' : 'Share Link'}
          </Button>
          
          <Link href="/referrals" className="flex-1">
            <Button
              variant="outline"
              className="w-full"
            >
              View Details
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
        
        {/* Hint Text */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
            <Trophy className="w-3.5 h-3.5" />
            Top referrers unlock exclusive perks 👀
          </p>
        </div>
      </div>
    </div>
  );
}

