'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, Share2, Link2, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface InviteLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteLinkModal({ isOpen, onClose }: InviteLinkModalProps) {
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteUrl, setInviteUrl] = useState<string>('https://mylivelinks.com/join');

  useEffect(() => {
    if (isOpen) {
      loadReferralCode();
    }
  }, [isOpen]);

  const loadReferralCode = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Prefer DB-backed referral codes (stable + unique)
        const { data: referralData, error: referralErr } = await supabase.rpc('get_or_create_referral_code');
        if (!referralErr && referralData?.code) {
          setReferralCode(referralData.code);

          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .maybeSingle();

          const uname = typeof (profile as any)?.username === 'string' ? String((profile as any).username).trim() : '';
          if (uname) {
            setInviteUrl(`https://mylivelinks.com/invite/${encodeURIComponent(uname)}`);
          } else {
            setInviteUrl(`https://mylivelinks.com/join?ref=${referralData.code}`);
          }
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load referral code:', error);
      setReferralCode(null);
      setInviteUrl('https://mylivelinks.com/join');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // inviteUrl is set during loadReferralCode; default is /join.

  const shareTitle = 'Join MyLiveLinks - Live Streaming Platform';
  const shareText = `Join me on MyLiveLinks! Live streaming, exclusive content, and real connections. Sign up with my link and get started! 🚀`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy link. Please try again.');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: inviteUrl,
        });
      } catch (error) {
        // User cancelled or share failed - no alert needed
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback to copy link
      handleCopyLink();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Your Invite Link
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Explainer Section */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-5 border border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex-shrink-0 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Grow Your Network
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Share your unique invite link to bring quality members to MyLiveLinks. 
                  Every signup and their activity is tracked to your referral.
                </p>
              </div>
            </div>
          </div>

          {/* Link Display */}
          {loading ? (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <Link2 className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Your Referral Link
                </span>
              </div>
              <p className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">
                {inviteUrl}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Copy Link Button */}
            <button
              onClick={handleCopyLink}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            {/* Native Share (Mobile) */}
            {typeof window !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Share2 className="w-5 h-5" />
                <span>Share</span>
              </button>
            )}
          </div>

          {/* Quality Note */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
              <span className="font-semibold">💎 Quality matters:</span> Focus on inviting engaged 
              creators and viewers who'll actively participate in the community.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Build your network. Grow together. 🚀
          </p>
        </div>
      </div>
    </div>
  );
}


