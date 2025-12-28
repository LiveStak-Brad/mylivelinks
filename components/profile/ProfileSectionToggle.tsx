'use client';

import { useState, useEffect } from 'react';
import { Check, X, Info } from 'lucide-react';
import { 
  ProfileSection, 
  ProfileType, 
  PROFILE_TYPE_CONFIG 
} from '@/lib/profileTypeConfig';

// ============================================================================
// SECTION METADATA
// ============================================================================

interface SectionMetadata {
  id: ProfileSection;
  label: string;
  description: string;
  isCore: boolean; // Core sections must always have at least one enabled
}

const SECTION_METADATA: Record<ProfileSection, SectionMetadata> = {
  hero: {
    id: 'hero',
    label: 'Hero / Banner',
    description: 'Your profile header with avatar, name, and bio',
    isCore: true,
  },
  social_counts: {
    id: 'social_counts',
    label: 'Social Counts',
    description: 'Follower count and engagement stats',
    isCore: false,
  },
  top_supporters: {
    id: 'top_supporters',
    label: 'Top Supporters',
    description: 'Users who have given you the most gifts',
    isCore: false,
  },
  top_streamers: {
    id: 'top_streamers',
    label: 'Top Streamers',
    description: 'Top streamers you support with gifts',
    isCore: false,
  },
  social_media: {
    id: 'social_media',
    label: 'Social Media Links',
    description: 'Instagram, Twitter, TikTok, etc.',
    isCore: false,
  },
  connections: {
    id: 'connections',
    label: 'Connections',
    description: 'Your followers and following list',
    isCore: false,
  },
  links: {
    id: 'links',
    label: 'Featured Links',
    description: 'Your custom link buttons (Linktree-style)',
    isCore: true,
  },
  profile_stats: {
    id: 'profile_stats',
    label: 'Profile Stats',
    description: 'Account age, join date, and other profile info',
    isCore: false,
  },
  streaming_stats: {
    id: 'streaming_stats',
    label: 'Streaming Stats',
    description: 'Live streaming hours, viewer counts, etc.',
    isCore: false,
  },
  music_showcase: {
    id: 'music_showcase',
    label: 'Music Showcase',
    description: 'Your tracks, albums, and music links',
    isCore: false,
  },
  upcoming_events: {
    id: 'upcoming_events',
    label: 'Upcoming Events',
    description: 'Shows, gigs, and event schedule',
    isCore: false,
  },
  merchandise: {
    id: 'merchandise',
    label: 'Merchandise',
    description: 'Your merch store and products',
    isCore: false,
  },
  portfolio: {
    id: 'portfolio',
    label: 'Portfolio / Products',
    description: 'Your work portfolio or product catalog',
    isCore: false,
  },
  business_info: {
    id: 'business_info',
    label: 'Business Info',
    description: 'Hours, location, contact info',
    isCore: false,
  },
  footer: {
    id: 'footer',
    label: 'Footer',
    description: 'Profile footer with branding',
    isCore: true,
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

interface ProfileSectionToggleProps {
  profileType: ProfileType;
  currentEnabledSections?: ProfileSection[] | null;
  onChange: (enabledSections: ProfileSection[]) => void;
}

export default function ProfileSectionToggle({
  profileType,
  currentEnabledSections,
  onChange,
}: ProfileSectionToggleProps) {
  const [enabledSections, setEnabledSections] = useState<Set<ProfileSection>>(
    new Set()
  );

  // Initialize: use custom list if present, else fallback to profile_type defaults
  useEffect(() => {
    if (currentEnabledSections && currentEnabledSections.length > 0) {
      // User has custom selection
      setEnabledSections(new Set(currentEnabledSections));
    } else {
      // Fallback to profile type defaults
      const config = PROFILE_TYPE_CONFIG[profileType];
      const defaults = config.sections
        .filter((s) => s.enabled)
        .map((s) => s.id);
      setEnabledSections(new Set(defaults));
    }
  }, [profileType, currentEnabledSections]);

  // Get all sections available for this profile type
  const availableSections = PROFILE_TYPE_CONFIG[profileType].sections.map(
    (s) => s.id
  );

  const toggleSection = (sectionId: ProfileSection) => {
    const newSet = new Set(enabledSections);
    
    if (newSet.has(sectionId)) {
      // Prevent disabling all core sections
      const coreEnabled = Array.from(newSet).filter(
        (id) => SECTION_METADATA[id]?.isCore
      );
      
      if (SECTION_METADATA[sectionId].isCore && coreEnabled.length <= 1) {
        alert('You must keep at least one core section enabled (Hero, Links, or Footer).');
        return;
      }
      
      newSet.delete(sectionId);
    } else {
      newSet.add(sectionId);
    }
    
    setEnabledSections(newSet);
    onChange(Array.from(newSet));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <Info className="w-5 h-5 text-blue-500 mt-0.5" />
        <div>
          <h2 className="text-xl font-semibold mb-1">Customize Profile Sections</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose which sections appear on your profile. Sections without content will be hidden from visitors.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {availableSections.map((sectionId) => {
          const metadata = SECTION_METADATA[sectionId];
          if (!metadata) return null;

          const isEnabled = enabledSections.has(sectionId);

          return (
            <div
              key={sectionId}
              onClick={() => toggleSection(sectionId)}
              className={`
                flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                ${
                  isEnabled
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <div
                className={`
                  flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                  ${
                    isEnabled
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  }
                `}
              >
                {isEnabled && <Check className="w-4 h-4 text-white" />}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3
                    className={`font-semibold ${
                      isEnabled
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {metadata.label}
                  </h3>
                  {metadata.isCore && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                      CORE
                    </span>
                  )}
                </div>
                <p
                  className={`text-sm mt-1 ${
                    isEnabled
                      ? 'text-blue-700 dark:text-blue-200'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {metadata.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
          <span className="text-base">💡</span>
          <span>
            <strong>Note:</strong> Sections without content (e.g., no tracks, no events) will be automatically hidden from visitors even if enabled. At least one core section must remain enabled.
          </span>
        </p>
      </div>
    </div>
  );
}

