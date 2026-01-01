'use client';

import { useState } from 'react';

interface SafetyModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'link' | 'dating';
  requireCheckbox?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
}

export function SafetyModal({
  open,
  onClose,
  mode,
  requireCheckbox = false,
  onAccept,
  onDecline,
}: SafetyModalProps) {
  const [checked, setChecked] = useState(false);

  if (!open) return null;

  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    } else {
      onClose();
    }
    setChecked(false);
  };

  const handleDecline = () => {
    if (onDecline) {
      onDecline();
    } else {
      onClose();
    }
    setChecked(false);
  };

  const handleBackdropClick = () => {
    if (!requireCheckbox) {
      onClose();
    }
  };

  const isLink = mode === 'link';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" 
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full shadow-2xl transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className={`bg-gradient-to-r ${isLink ? 'from-blue-600 to-purple-600' : 'from-pink-600 to-rose-600'} p-6 rounded-t-3xl`}>
          <div className="flex items-center gap-3 text-white">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h2 className="text-2xl font-bold">
              {isLink ? 'Link Guidelines' : 'Link Dating Guidelines'}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {isLink ? (
            <>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                <strong>Link is for intentional connections.</strong>
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Only mutual links unlock profiles and messaging.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                No spam, no cold DMs.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Block or report anyone who violates community guidelines.
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                <strong>Link Dating is an optional feature for adults 18+.</strong>
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Matches are mutual and messaging unlocks only after both users agree.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                <strong>MyLiveLinks does not conduct background checks.</strong>
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Never share personal or financial information with someone you don't trust.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                You can block or report users at any time.
              </p>
            </>
          )}

          {/* Checkbox for dating mode when required */}
          {!isLink && requireCheckbox && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500 focus:ring-offset-0"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                  I'm 18 or older and agree to follow the guidelines.
                </span>
              </label>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {!isLink && requireCheckbox ? (
              <>
                <button
                  onClick={handleAccept}
                  disabled={!checked}
                  className={`flex-1 py-3 px-6 rounded-xl font-bold text-lg transition-all shadow-md ${
                    checked
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Continue
                </button>
                <button
                  onClick={handleDecline}
                  className="flex-1 py-3 px-6 border-2 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl font-semibold text-lg transition-colors"
                >
                  Not now
                </button>
              </>
            ) : (
              <button
                onClick={handleAccept}
                className={`w-full py-3 px-6 bg-gradient-to-r ${
                  isLink 
                    ? 'from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                    : 'from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700'
                } text-white rounded-xl font-bold text-lg transition-all shadow-md`}
              >
                Got it
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
