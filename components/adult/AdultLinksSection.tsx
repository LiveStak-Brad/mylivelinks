'use client';

import { useState } from 'react';
import { Lock, AlertTriangle, Flag, ExternalLink } from 'lucide-react';
import AdultConsentModal from '@/components/adult/AdultConsentModal';

interface AdultLink {
  id: number;
  title: string;
  url: string;
  icon?: string;
  click_count: number;
  display_order: number;
  adult_category?: string;
  requires_warning: boolean;
}

interface AdultLinksSectionProps {
  links: AdultLink[];
  show: boolean; // Server determined eligibility
  cardStyle: React.CSSProperties;
  borderRadiusClass: string;
  accentColor: string;
}

/**
 * Adult Links Section (WEB ONLY)
 * 
 * SAFETY FEATURES:
 * - Only renders if server says user is eligible (18+, web, consent)
 * - Shows warning modal before opening any link
 * - All links open in new tab with security attributes
 * - Report link functionality
 * - Visual distinction from regular links (darker, warning colors)
 * - No previews or thumbnails
 */
export default function AdultLinksSection({
  links,
  show,
  cardStyle,
  borderRadiusClass,
  accentColor
}: AdultLinksSectionProps) {
  const [showConsent, setShowConsent] = useState(false);
  const [pendingLink, setPendingLink] = useState<AdultLink | null>(null);
  
  // Server says user is not eligible - don't render anything
  if (!show || links.length === 0) {
    return null;
  }
  
  const handleLinkClick = (link: AdultLink) => {
    // Always show consent modal before opening
    setPendingLink(link);
    setShowConsent(true);
  };
  
  const handleAcceptConsent = async () => {
    if (!pendingLink) return;
    
    // Log click for audit trail
    try {
      await fetch('/api/adult/link-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId: pendingLink.id })
      });
    } catch (error) {
      console.error('Failed to log adult link click:', error);
    }
    
    // Open link in new tab with security attributes
    const newWindow = window.open(pendingLink.url, '_blank', 'noopener,noreferrer');
    if (newWindow) {
      newWindow.opener = null; // Additional security
    }
    
    setShowConsent(false);
    setPendingLink(null);
  };
  
  const handleCancelConsent = () => {
    setShowConsent(false);
    setPendingLink(null);
  };
  
  const handleFlagLink = async (linkId: number) => {
    const reason = prompt('Why are you reporting this link? (Required)');
    if (!reason || reason.trim().length === 0) return;
    
    try {
      const response = await fetch('/api/adult/flag-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId, reason: reason.trim() })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Link reported for review. Thank you for helping keep our community safe.');
      } else {
        alert('Failed to report link. Please try again.');
      }
    } catch (error) {
      console.error('Failed to flag link:', error);
      alert('Failed to report link. Please try again.');
    }
  };
  
  return (
    <>
      <div 
        className={`${borderRadiusClass} shadow-lg overflow-hidden border-2 border-amber-500 dark:border-red-700`}
        style={{
          ...cardStyle,
          backgroundColor: '#2D2416', // Dark brown/amber background
          opacity: 0.95
        }}
      >
        <div className="p-6">
          {/* Section Header with Warning */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Lock size={20} className="text-amber-500" />
              <h3 className="text-lg font-bold text-amber-100">18+ Links</h3>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-900/50 rounded-full">
              <AlertTriangle size={14} className="text-amber-400" />
              <span className="text-xs font-semibold text-amber-300">Sensitive Content</span>
            </div>
          </div>
          
          {/* Warning Notice */}
          <div className="mb-4 p-3 bg-amber-950/50 border border-amber-800 rounded-lg">
            <p className="text-xs text-amber-200">
              <strong>Warning:</strong> These links may contain adult or sensitive material. 
              You must confirm you are 18+ before viewing. All links open externally.
            </p>
          </div>
          
          {/* Adult Links */}
          <div className="space-y-2">
            {links.map((link) => (
              <div key={link.id} className="group relative">
                <button
                  onClick={() => handleLinkClick(link)}
                  className="w-full p-4 rounded-xl font-semibold transition transform hover:scale-[1.02] hover:shadow-xl bg-gradient-to-r from-amber-700 to-red-700 hover:from-amber-600 hover:to-red-600 text-white flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Lock size={18} />
                    {link.icon && <span className="text-xl">{link.icon}</span>}
                    <span>{link.title}</span>
                  </div>
                  <ExternalLink size={18} />
                </button>
                
                {/* Report Button */}
                <button
                  onClick={() => handleFlagLink(link.id)}
                  className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition opacity-0 group-hover:opacity-100"
                  title="Report this link"
                >
                  <Flag size={14} className="text-amber-300" />
                </button>
              </div>
            ))}
          </div>
          
          {/* Footer Notice */}
          <div className="mt-4 text-center text-xs text-amber-400/70">
            MyLiveLinks does not host or control this external content
          </div>
        </div>
      </div>
      
      {/* Consent Modal */}
      {showConsent && pendingLink && (
        <AdultConsentModal
          linkTitle={pendingLink.title}
          onAccept={handleAcceptConsent}
          onCancel={handleCancelConsent}
        />
      )}
    </>
  );
}




