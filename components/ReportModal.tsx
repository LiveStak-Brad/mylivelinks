'use client';

import { useState } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'user' | 'stream' | 'profile' | 'chat';
  reportedUserId?: string;
  reportedUsername?: string;
  contextDetails?: string; // e.g., stream ID, chat message ID
}

const REPORT_REASONS = {
  user: [
    { value: 'sexual_services', label: 'Sexual services / solicitation (prostitution, escorting, sugaring)' },
    { value: 'grooming_exploitation', label: 'Grooming / exploitation' },
    { value: 'minor_safety', label: 'Minor safety (under 18)' },
    { value: 'fraud_scams', label: 'Fraud / scams' },
    { value: 'harassment_hate', label: 'Harassment / hate' },
    { value: 'spam', label: 'Spam' },
    { value: 'inappropriate_content', label: 'Inappropriate content' },
    { value: 'impersonation', label: 'Impersonation' },
    { value: 'other', label: 'Other' },
  ],
  stream: [
    { value: 'sexual_services', label: 'Sexual services / solicitation (prostitution, escorting, sugaring)' },
    { value: 'grooming_exploitation', label: 'Grooming / exploitation' },
    { value: 'minor_safety', label: 'Minor safety (under 18)' },
    { value: 'fraud_scams', label: 'Fraud / scams' },
    { value: 'harassment_hate', label: 'Harassment / hate' },
    { value: 'spam', label: 'Spam' },
    { value: 'inappropriate_content', label: 'Inappropriate content' },
    { value: 'violence_threats', label: 'Violence / threats' },
    { value: 'copyright', label: 'Copyright Violation' },
    { value: 'other', label: 'Other' },
  ],
  profile: [
    { value: 'sexual_services', label: 'Sexual services / solicitation (prostitution, escorting, sugaring)' },
    { value: 'grooming_exploitation', label: 'Grooming / exploitation' },
    { value: 'minor_safety', label: 'Minor safety (under 18)' },
    { value: 'fraud_scams', label: 'Fraud / scams' },
    { value: 'harassment_hate', label: 'Harassment / hate' },
    { value: 'spam', label: 'Spam' },
    { value: 'inappropriate_content', label: 'Inappropriate content' },
    { value: 'impersonation', label: 'Impersonation' },
    { value: 'other', label: 'Other' },
  ],
  chat: [
    { value: 'sexual_services', label: 'Sexual services / solicitation (prostitution, escorting, sugaring)' },
    { value: 'grooming_exploitation', label: 'Grooming / exploitation' },
    { value: 'minor_safety', label: 'Minor safety (under 18)' },
    { value: 'fraud_scams', label: 'Fraud / scams' },
    { value: 'harassment_hate', label: 'Harassment / hate' },
    { value: 'spam', label: 'Spam' },
    { value: 'inappropriate_content', label: 'Inappropriate content' },
    { value: 'violence_threats', label: 'Violence / threats' },
    { value: 'other', label: 'Other' },
  ],
};

export default function ReportModal({
  isOpen,
  onClose,
  reportType,
  reportedUserId,
  reportedUsername,
  contextDetails,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const reasons = REPORT_REASONS[reportType] || REPORT_REASONS.user;

  const handleSubmit = async () => {
    if (!selectedReason) {
      alert('Please select a reason for reporting');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        report_type: reportType,
        reported_user_id: reportedUserId,
        report_reason: selectedReason,
        report_details: details.trim() || null,
        context_details: contextDetails || null,
      };

      console.log('[REPORT_MODAL] submit', {
        ...payload,
        reported_user_id: payload.reported_user_id ? '<redacted>' : null,
      });

      const response = await fetch('/api/reports/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          alert('Please log in to submit a report');
          return;
        } else if (response.status === 429) {
          alert('You have submitted too many reports recently. Please try again later.');
          return;
        } else {
          alert(data.error || 'Failed to submit report. Please try again.');
          return;
        }
      }

      setSubmitted(true);
      setTimeout(() => {
        onClose();
        // Reset state after modal closes
        setTimeout(() => {
          setSubmitted(false);
          setSelectedReason('');
          setDetails('');
        }, 300);
      }, 2000);
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
      // Reset state after modal closes
      setTimeout(() => {
        setSubmitted(false);
        setSelectedReason('');
        setDetails('');
      }, 300);
    }
  };

  const getTitle = () => {
    switch (reportType) {
      case 'user':
        return reportedUsername ? `Report ${reportedUsername}` : 'Report User';
      case 'stream':
        return 'Report Stream';
      case 'profile':
        return reportedUsername ? `Report ${reportedUsername}'s Profile` : 'Report Profile';
      case 'chat':
        return 'Report Chat Message';
      default:
        return 'Submit Report';
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-scale-in flex flex-col modal-fullscreen-mobile"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success State */}
        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Report Submitted
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Thank you for helping keep MyLiveLinks safe. Our moderation team will review this report.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 mobile-safe-top">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {getTitle()}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition mobile-touch-target"
                disabled={submitting}
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Reports are reviewed by our moderation team. False reports may result in account restrictions.
              </p>

              {/* Report Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for reporting <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  disabled={submitting}
                  required
                >
                  <option value="">Select a reason...</option>
                  {reasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Additional Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional details (optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  placeholder="Provide any additional context that might help our moderation team..."
                  maxLength={500}
                  disabled={submitting}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {details.length}/500 characters
                </p>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  ⚠️ <strong>Important:</strong> Submitting false or malicious reports may result in your account being restricted.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-3 flex-shrink-0 mobile-safe-bottom">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting || !selectedReason}
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}



