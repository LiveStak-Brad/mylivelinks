// ============================================================================
// DATING UI INTEGRATION GUIDE
// Quick reference for wiring backend to frontend components
// ============================================================================

import { useState } from 'react';

import { 
  upsertDatingProfile, 
  getMyDatingProfile,
  getDatingCandidates,
  submitDatingDecision,
  getMyDatingMatches 
} from '@/lib/link/api';

import type { 
  DatingProfile, 
  DatingProfilePrefs,
  DatingCandidate,
  DatingMatch 
} from '@/lib/link/dating-types';
import { heightToDisplay, buildToDisplay } from '@/lib/link/dating-types';

// ============================================================================
// EXAMPLE 1: Dating Profile Setup Page
// ============================================================================

async function loadDatingProfile() {
  try {
    const profile = await getMyDatingProfile();
    
    if (!profile) {
      // Initialize defaults for new user
      return {
        enabled: false,
        photos: [],
        prefs: {
          age: 0, // User must fill
          show_me: 'everyone',
          age_min: 18,
          age_max: 99,
          smoker_ok: 'doesnt_matter',
          drinker_ok: 'doesnt_matter',
          // ... other defaults
        }
      };
    }
    
    return profile;
  } catch (error) {
    console.error('Failed to load dating profile:', error);
    throw error;
  }
}

async function saveDatingProfile(formData: {
  enabled: boolean;
  location_text?: string;
  photos: string[];
  prefs: Partial<DatingProfilePrefs>;
}) {
  try {
    // Validate photos count
    if (formData.photos.length > 5) {
      throw new Error('Maximum 5 photos allowed');
    }
    
    // Validate age range
    if (formData.prefs.age_min && formData.prefs.age_max) {
      if (formData.prefs.age_min > formData.prefs.age_max) {
        throw new Error('Minimum age cannot be greater than maximum age');
      }
    }
    
    const result = await upsertDatingProfile({
      enabled: formData.enabled,
      location_text: formData.location_text,
      photos: formData.photos,
      prefs: formData.prefs,
    });
    
    return result;
  } catch (error) {
    console.error('Failed to save dating profile:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 2: Dating Swipe Page
// ============================================================================

async function loadDatingCandidates(
  limit: number = 20, 
  offset: number = 0
): Promise<DatingCandidate[]> {
  try {
    const candidates = await getDatingCandidates(limit, offset);
    
    // Candidates are already filtered by backend (age range, enabled, etc.)
    // Just display them in the UI
    return candidates;
  } catch (error) {
    console.error('Failed to load dating candidates:', error);
    throw error;
  }
}

async function handleDatingSwipe(
  candidateId: string,
  decision: 'like' | 'nah'
) {
  try {
    // Optimistic UI: advance immediately
    const result = await submitDatingDecision(candidateId, decision);
    
    if (result.match) {
      // Show "It's a match!" modal
      console.log('🎉 Match created!');
      return { match: true };
    }
    
    return { match: false };
  } catch (error) {
    console.error('Failed to submit dating decision:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 3: Dating Matches Page
// ============================================================================

async function loadDatingMatches(): Promise<DatingMatch[]> {
  try {
    const matches = await getMyDatingMatches(50, 0);
    
    // Matches include:
    // - matched_profile_id
    // - username, display_name, avatar_url
    // - dating_bio, age, interests
    // - photos
    // - matched_at timestamp
    
    return matches;
  } catch (error) {
    console.error('Failed to load dating matches:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 4: Form Field Components
// ============================================================================

// Height Selector Component
const HEIGHT_OPTIONS = [
  { value: 'under_5', label: 'Under 5\'' },
  { value: '5_0_to_5_3', label: '5\'0" - 5\'3"' },
  { value: '5_4_to_5_7', label: '5\'4" - 5\'7"' },
  { value: '5_8_to_5_11', label: '5\'8" - 5\'11"' },
  { value: '6_0_to_6_3', label: '6\'0" - 6\'3"' },
  { value: 'over_6_3', label: 'Over 6\'3"' },
];

// Build Selector Component
const BUILD_OPTIONS = [
  { value: 'slim', label: 'Slim' },
  { value: 'athletic', label: 'Athletic' },
  { value: 'average', label: 'Average' },
  { value: 'curvy', label: 'Curvy' },
  { value: 'heavyset', label: 'Heavyset' },
];

// Religion Selector Component
const RELIGION_OPTIONS = [
  { value: 'christian', label: 'Christian' },
  { value: 'muslim', label: 'Muslim' },
  { value: 'jewish', label: 'Jewish' },
  { value: 'hindu', label: 'Hindu' },
  { value: 'buddhist', label: 'Buddhist' },
  { value: 'atheist', label: 'Atheist' },
  { value: 'agnostic', label: 'Agnostic' },
  { value: 'spiritual', label: 'Spiritual' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

// Smoker/Drinker Selector
const YES_NO_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'occasionally', label: 'Occasionally' },
  { value: 'socially', label: 'Socially' }, // For drinker
];

// Preference Selector (with "Doesn't matter")
const PREFERENCE_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'doesnt_matter', label: "Doesn't matter" },
];

// ============================================================================
// EXAMPLE 5: Displaying Candidate Cards
// ============================================================================

function DatingCandidateCard({ candidate }: { candidate: DatingCandidate }) {
  const displayAge = candidate.prefs?.age || candidate.age;
  const displayHeight = candidate.prefs?.height;
  const displayBuild = candidate.prefs?.build;
  const displayInterests = candidate.prefs?.interests || [];
  const displayBio = candidate.prefs?.dating_bio || candidate.bio;
  
  return (
    <div className="candidate-card">
      {/* Photo carousel */}
      <div className="photos">
        {candidate.photos?.map((photo, idx) => (
          <img key={idx} src={photo} alt={`Photo ${idx + 1}`} />
        ))}
      </div>
      
      {/* Profile info */}
      <div className="info">
        <h2>{candidate.display_name || candidate.username}</h2>
        
        {displayAge && <p>Age: {displayAge}</p>}
        {displayHeight && <p>Height: {heightToDisplay(displayHeight)}</p>}
        {displayBuild && <p>Build: {buildToDisplay(displayBuild)}</p>}
        
        {displayBio && <p className="bio">{displayBio}</p>}
        
        {displayInterests.length > 0 && (
          <div className="interests">
            {displayInterests.map((interest, idx) => (
              <span key={idx} className="interest-tag">{interest}</span>
            ))}
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="actions">
        <button onClick={() => handleDatingSwipe(candidate.profile_id, 'nah')}>
          Pass
        </button>
        <button onClick={() => handleDatingSwipe(candidate.profile_id, 'like')}>
          Like
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: Preference Form State Management
// ============================================================================

function useDatingPreferences() {
  const [prefs, setPrefs] = useState<Partial<DatingProfilePrefs>>({
    show_me: 'everyone',
    age_min: 18,
    age_max: 99,
    smoker_ok: 'doesnt_matter',
    drinker_ok: 'doesnt_matter',
    religion_pref: 'doesnt_matter',
    height_pref: 'doesnt_matter',
    build_pref: 'doesnt_matter',
    interests_pref: 'doesnt_matter',
  });
  
  const updatePref = <K extends keyof DatingProfilePrefs>(
    key: K, 
    value: DatingProfilePrefs[K]
  ) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  };
  
  const isMultiSelect = (key: string, value: any): boolean => {
    return Array.isArray(value) && value.length > 0;
  };
  
  return { prefs, updatePref, isMultiSelect };
}

// ============================================================================
// EXAMPLE 7: Multi-Select with "Doesn't Matter" Toggle
// ============================================================================

function ReligionPreferenceSelector({ 
  value, 
  onChange 
}: { 
  value: string[] | 'doesnt_matter'; 
  onChange: (v: string[] | 'doesnt_matter') => void;
}) {
  const [doesntMatter, setDoesntMatter] = useState(value === 'doesnt_matter');
  const [selected, setSelected] = useState<string[]>(
    Array.isArray(value) ? value : []
  );
  
  const handleToggleDoesntMatter = () => {
    if (doesntMatter) {
      // Enable selection
      setDoesntMatter(false);
      onChange([]);
    } else {
      // Disable selection
      setDoesntMatter(true);
      onChange('doesnt_matter');
    }
  };
  
  const handleSelectOption = (option: string) => {
    if (doesntMatter) return;
    
    const newSelected = selected.includes(option)
      ? selected.filter(o => o !== option)
      : [...selected, option];
    
    setSelected(newSelected);
    onChange(newSelected.length > 0 ? newSelected : 'doesnt_matter');
  };
  
  return (
    <div>
      <label>
        <input 
          type="checkbox" 
          checked={doesntMatter}
          onChange={handleToggleDoesntMatter}
        />
        Doesn't matter
      </label>
      
      {!doesntMatter && (
        <div className="multi-select">
          {RELIGION_OPTIONS.map(option => (
            <label key={option.value}>
              <input 
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => handleSelectOption(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 8: Error Handling & Validation
// ============================================================================

function validateDatingForm(formData: {
  enabled: boolean;
  photos: string[];
  prefs: Partial<DatingProfilePrefs>;
}): string[] {
  const errors: string[] = [];
  
  if (formData.enabled && formData.photos.length === 0) {
    errors.push('At least one photo is required to enable your profile');
  }
  
  if (formData.photos.length > 5) {
    errors.push('Maximum 5 photos allowed');
  }
  
  if (formData.prefs.age && formData.prefs.age < 18) {
    errors.push('You must be at least 18 to use Dating');
  }
  
  if (formData.prefs.age_min && formData.prefs.age_max) {
    if (formData.prefs.age_min > formData.prefs.age_max) {
      errors.push('Minimum age cannot be greater than maximum age');
    }
  }
  
  if (formData.prefs.dating_bio && formData.prefs.dating_bio.length > 500) {
    errors.push('Dating bio must be 500 characters or less');
  }
  
  return errors;
}

// ============================================================================
// REFERENCE: Full Prefs Object Example
// ============================================================================

const EXAMPLE_FULL_PREFS: DatingProfilePrefs = {
  // About You
  age: 28,
  height: '5_8_to_5_11',
  build: 'athletic',
  religion: 'agnostic',
  smoker: 'no',
  drinker: 'socially',
  interests: ['music', 'fitness', 'travel', 'photography'],
  dating_bio: 'Looking for meaningful connections with someone who shares my passions for adventure and growth.',
  
  // Preferences
  show_me: 'everyone',
  age_min: 24,
  age_max: 35,
  smoker_ok: 'doesnt_matter',
  drinker_ok: 'doesnt_matter',
  religion_pref: ['agnostic', 'atheist', 'spiritual'],
  height_pref: 'doesnt_matter',
  build_pref: ['athletic', 'slim', 'average'],
  interests_pref: ['music', 'fitness'], // Optional
};

// ============================================================================
// NOTES
// ============================================================================

/*
1. **Photo Upload**
   - Use existing `uploadLinkPhoto` from `lib/link/storage.ts`
   - Same bucket (`link-photos`) works for both Link and Dating
   
2. **Age Field**
   - Currently stored as INT in prefs.age
   - Will migrate to DOB-based calculation later
   - Users must update manually for now
   
3. **Gender Filtering**
   - `show_me` preference exists but not yet filtering
   - Waiting for gender field location from schema
   
4. **Multi-Select Preferences**
   - Store as arrays when multiple values selected
   - Store as 'doesnt_matter' when toggle is ON
   - Never store empty arrays (use 'doesnt_matter' instead)
   
5. **Error Messages**
   - Backend returns PostgreSQL errors via Supabase
   - Parse error.message, error.details, error.hint, error.code
   - Display user-friendly messages in UI
   
6. **Optimistic UI**
   - Swipe advances immediately (don't wait for RPC)
   - Revert on error
   - Show match modal only after RPC confirms
*/
