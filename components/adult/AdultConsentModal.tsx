'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Lock, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface AdultConsentModalProps {
  onAccept: () => void;
  onCancel: () => void;
  linkTitle?: string;
}

/**
 * Adult Content Consent Modal
 * 
 * SAFETY FEATURES:
 * - Explicit warning about adult content
 * - Age confirmation checkbox
 * - External content disclaimer
 * - Cannot proceed without both checkboxes
 * - Consent expires after 30 days
 */
export default function AdultConsentModal({
  onAccept,
  onCancel,
  linkTitle
}: AdultConsentModalProps) {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [externalConfirmed, setExternalConfirmed] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const supabase = createClient();
  
  const canProceed = ageConfirmed && externalConfirmed;
  
  const handleAccept = async () => {
    if (!canProceed) return;
    
    setAccepting(true);
    try {
      // Accept disclaimer server-side
      const response = await fetch('/api/adult/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'web' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store consent in localStorage as well (for quick checks)
        localStorage.setItem('adult_consent_expires', data.expires_at);
        localStorage.setItem('adult_consent_accepted', 'true');
        
        onAccept();
      } else {
        alert(data.error || 'Failed to accept disclaimer');
      }
    } catch (error) {
      console.error('Consent error:', error);
      alert('Failed to accept disclaimer');
    } finally {
      setAccepting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-amber-50 to-red-50 dark:from-gray-900 dark:to-red-950 rounded-2xl shadow-2xl max-w-md w-full border-2 border-amber-500 dark:border-red-700">
        {/* Header */}
        <div className="bg-amber-600 dark:bg-red-900 p-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-white" />
            <h2 className="text-xl font-bold text-white">Adult Content Warning</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-white/20 transition"
          >
            <X size={20} className="text-white" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-100 dark:bg-red-950/50 rounded-lg border border-amber-300 dark:border-red-800">
            <Lock size={20} className="text-amber-700 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 dark:text-red-200">
              <p className="font-semibold mb-2">
                {linkTitle ? `"${linkTitle}"` : 'This link'} may contain adult or sensitive material.
              </p>
              <p>
                By continuing, you confirm that you are legally allowed to view such content in your jurisdiction.
              </p>
            </div>
          </div>
          
          {/* Age Confirmation */}
          <label className="flex items-start gap-3 p-4 border-2 border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-white/50 dark:hover:bg-gray-800/50 transition">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="w-5 h-5 mt-0.5 accent-amber-600"
            />
            <span className="text-sm font-medium">
              I confirm that I am <strong>18 years of age or older</strong> and wish to proceed.
            </span>
          </label>
          
          {/* External Content */}
          <label className="flex items-start gap-3 p-4 border-2 border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-white/50 dark:hover:bg-gray-800/50 transition">
            <input
              type="checkbox"
              checked={externalConfirmed}
              onChange={(e) => setExternalConfirmed(e.target.checked)}
              className="w-5 h-5 mt-0.5 accent-amber-600"
            />
            <span className="text-sm font-medium">
              I understand this link leads to <strong>external content</strong> not hosted or controlled by MyLiveLinks.
            </span>
          </label>
          
          {/* Consent Duration Notice */}
          <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
            Your consent will be remembered for 30 days on this device.
          </div>
        </div>
        
        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-semibold bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={!canProceed || accepting}
            className="flex-1 py-3 rounded-xl font-semibold bg-amber-600 hover:bg-amber-700 text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {accepting ? (
              'Processing...'
            ) : (
              <>
                Continue
                <ExternalLink size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}



