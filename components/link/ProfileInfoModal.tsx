'use client';

import { useMemo, useState } from 'react';
import { Flag } from 'lucide-react';
import ReportModal from '@/components/ReportModal';

interface ProfileInfoModalProps {
  open: boolean;
  onClose: () => void;
  displayName: string;
  profileId?: string;
  username?: string;
  bio: string;
  photos?: string[];
  location?: string;
  tags?: string[];
  orientationLabel?: string;
}

export function ProfileInfoModal({
  open,
  onClose,
  displayName,
  profileId,
  username,
  bio,
  photos = [],
  location,
  tags = [],
  orientationLabel,
}: ProfileInfoModalProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const profileUrl = useMemo(() => {
    if (typeof window === 'undefined') return null;
    if (!username) return null;
    return `${window.location.origin}/${encodeURIComponent(username)}`;
  }, [username]);

  const reportContextDetails = useMemo(() => {
    return JSON.stringify({
      content_kind: 'profile',
      profile_id: profileId || null,
      username: username || null,
      url: profileUrl,
      surface: 'link_profile_info_modal',
    });
  }, [profileId, profileUrl, username]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Profile</h2>
          <div className="flex items-center gap-2">
            {username && (
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold text-sm"
                aria-label="Report"
                title="Report"
              >
                <Flag className="w-4 h-4" />
                Report
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo, idx) => (
                <img key={idx} src={photo} alt={`Photo ${idx + 1}`} className="w-full aspect-square object-cover rounded-xl" />
              ))}
            </div>
          )}

          <div>
            <h3 className="text-2xl font-bold">{displayName}</h3>
            {username && <p className="text-gray-600 dark:text-gray-400">@{username}</p>}
            {location && <p className="text-sm text-gray-500 mt-1">{location}</p>}
            {orientationLabel && (
              <p className="text-sm font-semibold text-pink-600 dark:text-pink-300 mt-1">
                Orientation: {orientationLabel}
              </p>
            )}
          </div>

          <p className="text-gray-700 dark:text-gray-300">{bio}</p>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {reportOpen && username && (
        <ReportModal
          isOpen={true}
          onClose={() => setReportOpen(false)}
          reportType="profile"
          reportedUserId={profileId}
          reportedUsername={username}
          contextDetails={reportContextDetails}
        />
      )}
    </div>
  );
}
