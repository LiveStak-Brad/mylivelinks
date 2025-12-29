'use client';

import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { 
  ProfileSection, 
  ProfileType, 
  PROFILE_TYPE_CONFIG 
} from '@/lib/profileTypeConfig';

// ============================================================================
// OPTIONAL MODULES (Customizable)
// ============================================================================
// Core shell (hero, footer, connections, social_media, links) is NOT included
// These are always rendered regardless of user preference

interface ModuleMetadata {
  id: ProfileSection;
  label: string;
  description: string;
}

const OPTIONAL_MODULES: Record<string, ModuleMetadata> = {
  // Network & Community (enabled by default)
  referral_network: {
    id: 'referral_network',
    label: 'Referral Network',
    description: 'Your referral stats and network tree',
  },
  
  // Music & Entertainment
  music_showcase: {
    id: 'music_showcase',
    label: 'Music Tracks',
    description: 'Your music library',
  },
  upcoming_events: {
    id: 'upcoming_events',
    label: 'Events / Shows',
    description: 'Your event schedule',
  },
  
  // Streaming & Stats
  streaming_stats: {
    id: 'streaming_stats',
    label: 'Streaming Stats',
    description: 'Live hours, viewer counts',
  },
  profile_stats: {
    id: 'profile_stats',
    label: 'Profile Stats',
    description: 'Account age, join date',
  },
  social_counts: {
    id: 'social_counts',
    label: 'Social Counts',
    description: 'Follower/following counts',
  },
  top_supporters: {
    id: 'top_supporters',
    label: 'Top Supporters',
    description: 'Users who gifted you',
  },
  top_streamers: {
    id: 'top_streamers',
    label: 'Top Streamers',
    description: 'Streamers you support',
  },
  
  // Products & Business
  merchandise: {
    id: 'merchandise',
    label: 'Merchandise',
    description: 'Your merch store',
  },
  portfolio: {
    id: 'portfolio',
    label: 'Portfolio / Products',
    description: 'Your work showcase',
  },
  business_info: {
    id: 'business_info',
    label: 'Business Info',
    description: 'Hours, location, contact',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

interface ProfileModulePickerProps {
  profileType: ProfileType;
  currentEnabledModules?: ProfileSection[] | null;
  onChange: (enabledModules: ProfileSection[]) => void;
}

export default function ProfileModulePicker({
  profileType,
  currentEnabledModules,
  onChange,
}: ProfileModulePickerProps) {
  const [showModal, setShowModal] = useState(false);
  const [enabledModules, setEnabledModules] = useState<Set<ProfileSection>>(
    new Set(currentEnabledModules || [])
  );

  // Get ALL optional modules (not filtered by profile type)
  // Users can mix and match any modules from any profile type
  const availableModules = Object.keys(OPTIONAL_MODULES) as ProfileSection[];

  // Initialize defaults when component mounts OR when profile type changes (if no custom selection)
  useEffect(() => {
    if (currentEnabledModules && currentEnabledModules.length > 0) {
      // User has custom selection - keep it
      setEnabledModules(new Set(currentEnabledModules));
    } else {
      // No custom selection - use profile_type defaults
      const defaults = PROFILE_TYPE_CONFIG[profileType].sections
        .filter((s) => s.enabled && OPTIONAL_MODULES[s.id])
        .map((s) => s.id);
      setEnabledModules(new Set(defaults));
      onChange(Array.from(defaults));
    }
  }, [profileType]); // Re-run when profileType changes

  const toggleModule = (moduleId: ProfileSection) => {
    const newSet = new Set(enabledModules);
    if (newSet.has(moduleId)) {
      newSet.delete(moduleId);
    } else {
      newSet.add(moduleId);
    }
    setEnabledModules(newSet);
    onChange(Array.from(newSet));
  };

  const removeModule = (moduleId: ProfileSection) => {
    const newSet = new Set(enabledModules);
    newSet.delete(moduleId);
    setEnabledModules(newSet);
    onChange(Array.from(newSet));
  };

  const enabledList = Array.from(enabledModules).filter((id) =>
    availableModules.includes(id)
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Optional Profile Modules</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Choose which modules appear on your profile
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          variant="primary"
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Modules
        </Button>
      </div>

      {/* Enabled Modules (Chips) */}
      {enabledList.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {enabledList.map((moduleId) => {
            const module = OPTIONAL_MODULES[moduleId];
            if (!module) return null;
            return (
              <div
                key={moduleId}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full text-sm"
              >
                <span className="text-blue-900 dark:text-blue-100 font-medium">
                  {module.label}
                </span>
                <button
                  onClick={() => removeModule(moduleId)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No optional modules enabled. Click "Add Modules" to get started.
        </p>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Add / Remove Modules</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-2">
              {availableModules.map((moduleId) => {
                const module = OPTIONAL_MODULES[moduleId];
                if (!module) return null;
                const isEnabled = enabledModules.has(moduleId);

                return (
                  <label
                    key={moduleId}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => toggleModule(moduleId)}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {module.label}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {module.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={() => setShowModal(false)}
                variant="primary"
                className="w-full"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

