'use client';

import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { 
  ProfileTab, 
  ProfileType, 
  PROFILE_TYPE_CONFIG 
} from '@/lib/profileTypeConfig';

// ============================================================================
// TAB METADATA
// ============================================================================

interface TabMetadata {
  id: ProfileTab;
  label: string;
  description?: string;
}

// Core tabs that always appear (cannot be removed)
const CORE_TABS: ProfileTab[] = ['info'];

// Optional tabs that users can add/remove
const OPTIONAL_TABS: Record<string, TabMetadata> = {
  // Content Tabs
  feed: {
    id: 'feed',
    label: 'Feed',
    description: 'Photo/video feed grid',
  },
  reels: {
    id: 'reels',
    label: 'Reels',
    description: 'Short-form video content',
  },
  photos: {
    id: 'photos',
    label: 'Photos',
    description: 'Photo gallery',
  },
  videos: {
    id: 'videos',
    label: 'Videos',
    description: 'Video gallery',
  },
  
  // Feature Tabs
  music: {
    id: 'music',
    label: 'Music',
    description: 'Music tracks & playlists',
  },
  events: {
    id: 'events',
    label: 'Events',
    description: 'Shows & performances',
  },
  products: {
    id: 'products',
    label: 'Products',
    description: 'Merchandise & portfolio',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

interface ProfileTabPickerProps {
  profileType: ProfileType;
  currentEnabledTabs?: ProfileTab[] | null;
  onChange: (enabledTabs: ProfileTab[]) => void;
}

export default function ProfileTabPicker({
  profileType,
  currentEnabledTabs,
  onChange,
}: ProfileTabPickerProps) {
  const [showModal, setShowModal] = useState(false);
  const [enabledTabs, setEnabledTabs] = useState<Set<ProfileTab>>(
    new Set(currentEnabledTabs || [])
  );

  // Get ALL optional tabs (not filtered by profile type)
  // Users can mix and match any tabs from any profile type
  const availableTabs = Object.keys(OPTIONAL_TABS) as ProfileTab[];

  // Initialize defaults when component mounts OR when profile type changes (if no custom selection)
  useEffect(() => {
    if (currentEnabledTabs && currentEnabledTabs.length > 0) {
      // User has custom selection - keep it
      setEnabledTabs(new Set(currentEnabledTabs));
    } else {
      // No custom selection - use profile_type defaults
      const defaults = PROFILE_TYPE_CONFIG[profileType].tabs
        .filter((t) => t.enabled && OPTIONAL_TABS[t.id])
        .map((t) => t.id);
      setEnabledTabs(new Set(defaults));
      onChange(Array.from(defaults));
    }
  }, [profileType]); // Re-run when profileType changes

  const handleToggle = (tabId: ProfileTab) => {
    setEnabledTabs((prev) => {
      const next = new Set(prev);
      if (next.has(tabId)) {
        next.delete(tabId);
      } else {
        next.add(tabId);
      }
      return next;
    });
  };

  const handleSave = () => {
    onChange(Array.from(enabledTabs));
    setShowModal(false);
  };

  const handleRemoveChip = (tabId: ProfileTab) => {
    const next = new Set(enabledTabs);
    next.delete(tabId);
    setEnabledTabs(next);
    onChange(Array.from(next));
  };

  // Sort tabs alphabetically for display
  const sortedTabs = [...availableTabs].sort((a, b) => {
    const labelA = OPTIONAL_TABS[a]?.label || '';
    const labelB = OPTIONAL_TABS[b]?.label || '';
    return labelA.localeCompare(labelB);
  });

  const sortedEnabledTabs = Array.from(enabledTabs).sort((a, b) => {
    const labelA = OPTIONAL_TABS[a]?.label || '';
    const labelB = OPTIONAL_TABS[b]?.label || '';
    return labelA.localeCompare(labelB);
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Choose which tabs appear on your profile. Visitors can navigate between enabled tabs.
      </p>

      {/* Enabled Tabs (Chips) */}
      <div className="flex flex-wrap gap-2">
        {sortedEnabledTabs.map((tabId) => {
          const tab = OPTIONAL_TABS[tabId];
          if (!tab) return null;
          return (
            <div
              key={tabId}
              className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1.5 rounded-full text-sm font-medium"
            >
              <span>{tab.label}</span>
              <button
                type="button"
                onClick={() => handleRemoveChip(tabId)}
                className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${tab.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Tabs Button */}
      <Button
        type="button"
        variant="secondary"
        onClick={() => setShowModal(true)}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Add / Manage Tabs
      </Button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Manage Profile Tabs</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Select which tabs appear on your profile
              </p>
            </div>

            {/* Tab List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-3">
                {sortedTabs.map((tabId) => {
                  const tab = OPTIONAL_TABS[tabId];
                  if (!tab) return null;
                  const isEnabled = enabledTabs.has(tabId);
                  return (
                    <label
                      key={tabId}
                      className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-md transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => handleToggle(tabId)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{tab.label}</div>
                        {tab.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {tab.description}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  // Reset to current saved state
                  setEnabledTabs(new Set(currentEnabledTabs || []));
                  setShowModal(false);
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSave}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

