'use client';

import { useState } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import Image from 'next/image';

interface ShareStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareStreamModal({ isOpen, onClose }: ShareStreamModalProps) {
  const [copied, setCopied] = useState(false);
  
  if (!isOpen) return null;

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/live` : 'https://mylivelinks.com/live';
  const shareTitle = 'Join the Live Stream on MyLiveLinks!';
  const shareText = 'Watch live streams from creators around the world. Join the fun! 🎥✨';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
          url: shareUrl,
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

  const shareToSocial = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);
    
    let shareLink = '';
    
    switch (platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'reddit':
        shareLink = `https://reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(shareTitle)}`;
        break;
      case 'whatsapp':
        shareLink = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'telegram':
        shareLink = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
    }
    
    if (shareLink) {
      window.open(shareLink, '_blank', 'noopener,noreferrer,width=600,height=600');
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
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Share Live Stream
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
          {/* Share Preview */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex-shrink-0 flex items-center justify-center">
                <span className="text-2xl">🎥</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {shareTitle}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {shareText}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                  {shareUrl}
                </p>
              </div>
            </div>
          </div>

          {/* Copy Link Button */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
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
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              <Share2 className="w-5 h-5" />
              <span>Share...</span>
            </button>
          )}

          {/* Social Media Buttons */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Share to social media
            </p>
            <div className="grid grid-cols-3 gap-3">
              {/* Twitter/X */}
              <button
                onClick={() => shareToSocial('twitter')}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition"
                title="Share on Twitter/X"
              >
                <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center">
                  <span className="text-white dark:text-black font-bold text-lg">𝕏</span>
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Twitter</span>
              </button>

              {/* Facebook */}
              <button
                onClick={() => shareToSocial('facebook')}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition"
                title="Share on Facebook"
              >
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">f</span>
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Facebook</span>
              </button>

              {/* WhatsApp */}
              <button
                onClick={() => shareToSocial('whatsapp')}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition"
                title="Share on WhatsApp"
              >
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-xl">💬</span>
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">WhatsApp</span>
              </button>

              {/* Telegram */}
              <button
                onClick={() => shareToSocial('telegram')}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition"
                title="Share on Telegram"
              >
                <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center">
                  <span className="text-white text-xl">✈️</span>
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Telegram</span>
              </button>

              {/* Reddit */}
              <button
                onClick={() => shareToSocial('reddit')}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition"
                title="Share on Reddit"
              >
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                  <span className="text-white text-xl">👽</span>
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Reddit</span>
              </button>

              {/* LinkedIn */}
              <button
                onClick={() => shareToSocial('linkedin')}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition"
                title="Share on LinkedIn"
              >
                <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">in</span>
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">LinkedIn</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Share this link with friends to invite them to watch! 🎉
          </p>
        </div>
      </div>
    </div>
  );
}

