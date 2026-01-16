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
// ONLY hero and footer are truly locked (core shell)
// ALL other modules can be toggled on/off by any user regardless of profile type
// This allows maximum flexibility - a streamer can show music, a musician can show streaming stats, etc.

interface ModuleMetadata {
  id: ProfileSection;
  label: string;
  description: string;
  category: string;
}

// AUTHORITATIVE ORDER from Brad's notepad (1-15):
// 1. Social Links, 2. Custom Links, 3. Top Friends, 4. Tab Bar (not a module),
// 5. Info/About (always on, profile_stats inside), 6. Top Supporters, 7. Top Streamers,
// 8. Merchandise, 9. Business Info, 10. Products, 11. Events, 12. Music Tracks,
// 13. Music Videos/Streaming Stats, 14. Connections, 15. Referral Network
// NOTE: social_counts belongs in TOP BANNER (not in module list)
// NOTE: profile_stats is included inside Info/About (not a separate module position)
const OPTIONAL_MODULES: Record<string, ModuleMetadata> = {
  // 1. Social Links
  social_media: {
    id: 'social_media',
    label: 'Social Links',
    description: 'Instagram, Twitter, TikTok icons',
    category: 'Profile',
  },
  // 2. Custom Links
  links: {
    id: 'links',
    label: 'Custom Links',
    description: 'Your Linktree-style link section',
    category: 'Profile',
  },
  // 3. Top Friends
  top_friends: {
    id: 'top_friends',
    label: 'Top Friends',
    description: 'Your favorite people',
    category: 'Community',
  },
  // 6. Top Supporters
  top_supporters: {
    id: 'top_supporters',
    label: 'Top Supporters',
    description: 'Users who gifted you',
    category: 'Stats',
  },
  // 7. Top Streamers
  top_streamers: {
    id: 'top_streamers',
    label: 'Top Streamers',
    description: 'Streamers you support',
    category: 'Stats',
  },
  // 8. Merchandise
  merchandise: {
    id: 'merchandise',
    label: 'Merchandise',
    description: 'Your merch store',
    category: 'Business',
  },
  // 9. Business Info
  business_info: {
    id: 'business_info',
    label: 'Business Info',
    description: 'Hours, location, contact',
    category: 'Business',
  },
  // 10. Products
  portfolio: {
    id: 'portfolio',
    label: 'Products',
    description: 'Your work showcase',
    category: 'Business',
  },
  // 11. Events
  upcoming_events: {
    id: 'upcoming_events',
    label: 'Events',
    description: 'Your event schedule',
    category: 'Content',
  },
  // 12. Music Tracks
  music_showcase: {
    id: 'music_showcase',
    label: 'Music Tracks',
    description: 'Your music library',
    category: 'Content',
  },
  // 13. Streaming Stats (placed after Music Videos per note)
  streaming_stats: {
    id: 'streaming_stats',
    label: 'Streaming Stats',
    description: 'Live hours, viewer counts',
    category: 'Stats',
  },
  // 15. Referral Network
  referral_network: {
    id: 'referral_network',
    label: 'Referral Network',
    description: 'Your referral stats and network tree',
    category: 'Community',
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
    }
  }, [profileType, currentEnabledModules]); // Re-run when profileType or current selection changes

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
          <h2 className="text-xl font-semibold">Profile Modules</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Customize which sections appear on your profile. Profile type is just a starting point - add or remove ANY module!
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          variant="primary"
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Customize Modules
        </Button>
      </div>

      {/* Enabled Modules (Chips) */}
      {enabledList.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {enabledList.map((moduleId) => {
            const moduleMeta = OPTIONAL_MODULES[moduleId];
            if (!moduleMeta) return null;
            return (
              <div
                key={moduleId}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full text-sm"
              >
                <span className="text-blue-900 dark:text-blue-100 font-medium">
                  {moduleMeta.label}
                </span>
                <button
                  onClick={() => removeModule(moduleId)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  title="Remove module"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-amber-900 dark:text-amber-100 text-sm font-medium mb-1">
            ⚠️ No modules enabled
          </p>
          <p className="text-amber-700 dark:text-amber-300 text-sm">
            Your profile will only show the header and footer. Click "Customize Modules" to add sections.
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold">Customize Profile Modules</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Add or remove ANY module - profile type doesn't limit you!
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4">
              {/* Group modules by category */}
              {['Profile', 'Content', 'Stats', 'Community', 'Business'].map((category) => {
                const categoryModules = availableModules.filter(
                  (id) => OPTIONAL_MODULES[id]?.category === category
                );
                if (categoryModules.length === 0) return null;

                return (
                  <div key={category} className="mb-6 last:mb-0">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                      {category}
                    </h4>
                    <div className="space-y-2">
                      {categoryModules.map((moduleId) => {
                        const moduleMeta = OPTIONAL_MODULES[moduleId];
                        if (!moduleMeta) return null;
                        const isEnabled = enabledModules.has(moduleId);

                        return (
                          <label
                            key={moduleId}
                            className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => toggleModule(moduleId)}
                              className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {moduleMeta.label}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {moduleMeta.description}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {enabledModules.size} {enabledModules.size === 1 ? 'module' : 'modules'} enabled
                </span>
                <button
                  onClick={() => {
                    setEnabledModules(new Set());
                    onChange([]);
                  }}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                >
                  Clear All
                </button>
              </div>
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

