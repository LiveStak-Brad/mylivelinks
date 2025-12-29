'use client';

import { useEffect, useState } from 'react';
import { Link2, Copy, Check, Users, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
import { createClient } from '@/lib/supabase';

interface ReferralCardProps {
  className?: string;
}

export default function ReferralCard({ className = '' }: ReferralCardProps) {
  const [copied, setCopied] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (!showInviteLink) return;
    if (inviteUrl) return;

    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mylivelinks.com';

        try {
          const res = await fetch('/api/referrals/me/code', { cache: 'no-store' });
          const json = await res.json().catch(() => null);
          const url = typeof json?.url === 'string' ? String(json.url) : '';
          if (res.ok && url) {
            if (mounted) setInviteUrl(url);
            return;
          }
        } catch {
          // best-effort
        }

        const { data: userData } = await supabase.auth.getUser();
        const metaUsername =
          typeof (userData?.user as any)?.user_metadata?.username === 'string'
            ? String((userData?.user as any).user_metadata.username).trim()
            : '';
        const userId = userData?.user?.id ?? null;

        if (userId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', userId)
            .maybeSingle();

          const unameRaw = typeof (profile as any)?.username === 'string' ? String((profile as any).username).trim() : '';
          const uname = unameRaw || metaUsername;
          if (uname) {
            if (mounted) setInviteUrl(`${origin}/invite/${encodeURIComponent(uname)}`);
            return;
          }
        }

        const { data: referralData, error: referralErr } = await supabase.rpc('get_or_create_referral_code');
        const row = Array.isArray(referralData) ? referralData[0] : referralData;
        const code = typeof (row as any)?.code === 'string' ? String((row as any).code).trim() : '';

        if (!referralErr && code) {
          if (mounted) setInviteUrl(`${origin}/join?ref=${encodeURIComponent(code)}`);
          return;
        }

        if (mounted) setInviteUrl(`${origin}/join`);
      } catch (err) {
        console.warn('[referrals] get_or_create_referral_code failed (non-blocking):', err);
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mylivelinks.com';
        if (mounted) setInviteUrl(`${origin}/join`);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [inviteUrl, showInviteLink]);

  const handleGetLink = () => {
    setShowInviteLink(true);
  };

  const handleCopyLink = async () => {
    try {
      if (!inviteUrl) return;
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-2xl shadow-2xl ${className}`}>
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
      </div>
      
      {/* Content */}
      <div className="relative p-6 sm:p-8">
        {/* Icon Badge */}
        <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
          <Users className="w-7 h-7 text-white" />
        </div>
        
        {/* Title & Description */}
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
          Build Your Network
        </h2>
        
        <p className="text-white/90 text-base sm:text-lg mb-1 leading-relaxed">
          Invite friends and grow together. Every referral is tracked, and quality connections matter.
        </p>
        
        <div className="flex items-center gap-2 text-white/80 text-sm mb-6">
          <Sparkles className="w-4 h-4" />
          <span>Top referrers unlock perks 👀</span>
        </div>
        
        {/* CTA Section */}
        {!showInviteLink ? (
          <Button
            onClick={handleGetLink}
            size="lg"
            className="w-full sm:w-auto bg-white text-purple-600 hover:bg-gray-100 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            <Link2 className="w-5 h-5 mr-2" />
            Get My Invite Link
          </Button>
        ) : (
          <div className="space-y-3">
            {/* Invite Link Display */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-2">
                Your Invite Link
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-white text-sm font-mono bg-black/20 px-3 py-2 rounded-lg truncate">
                  {loading ? 'Loading…' : inviteUrl || 'https://mylivelinks.com/join'}
                </code>
                <button
                  onClick={handleCopyLink}
                  disabled={loading || !inviteUrl}
                  className="flex-shrink-0 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Copy link"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-300" />
                  ) : (
                    <Copy className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Share Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Join MyLiveLinks!',
                      text: 'Join me on MyLiveLinks - Live streaming, links, and more!',
                      url: inviteUrl || 'https://mylivelinks.com/join'
                    }).catch(() => {});
                  }
                }}
                size="sm"
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                Share Link
              </Button>
              
              <Button
                onClick={handleCopyLink}
                size="sm"
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
        
        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-white/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Track Growth</p>
              <p className="text-white/70 text-xs">Real-time analytics</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Earn Rewards</p>
              <p className="text-white/70 text-xs">Quality matters</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}






