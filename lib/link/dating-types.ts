// ============================================================================
// DATING PREFS TYPE DEFINITIONS
// For use in frontend UI components
// ============================================================================

/**
 * Dating "About You" fields
 */
export interface DatingAboutYou {
  age?: number;  // INT (temporary - will derive from DOB later)
  height?: HeightEnum;
  build?: BuildEnum;
  religion?: ReligionEnum;
  smoker?: SmokerEnum;
  drinker?: DrinkerEnum;
  interests?: string[];  // Free-form tags
  dating_bio?: string;  // Replaces top-level bio
}

/**
 * Dating Preferences
 */
export interface DatingPreferences {
  show_me: ShowMeEnum;
  age_min: number;
  age_max: number;
  smoker_ok: PreferenceEnum;
  drinker_ok: PreferenceEnum;
  religion_pref: ReligionEnum[] | 'doesnt_matter';
  height_pref: 'doesnt_matter' | { min: HeightEnum; max: HeightEnum };
  build_pref: BuildEnum[] | 'doesnt_matter';
  interests_pref: string[] | 'doesnt_matter';
}

/**
 * Full dating profile prefs object (stored in dating_profiles.prefs jsonb)
 * Includes optional UI metadata fields for convenience.
 */
export interface DatingProfilePrefs extends DatingAboutYou, DatingPreferences {
  looking_for_text?: string;
  looking_for?: string;
  hobbies?: string[];
  smoker_pref?: PreferenceEnum;
  drinker_pref?: PreferenceEnum;
  height_pref_min?: HeightEnum;
  height_pref_max?: HeightEnum;
}

/**
 * Dating profile (complete object from database)
 */
export interface DatingProfile {
  profile_id: string;
  enabled: boolean;
  bio?: string;  // Legacy field
  location_text?: string;
  photos: string[];
  prefs: DatingProfilePrefs;
  created_at: string;
  updated_at: string;
  
  // Joined fields (from profiles table)
  username?: string;
  display_name?: string;
  avatar_url?: string;
  gender?: GenderEnum;  // From profiles.gender (Phase 2)
}

/**
 * Dating candidate (enriched for swipe UI)
 */
export interface DatingCandidate extends DatingProfile {
  age?: number;  // Computed from prefs.age
  height?: HeightEnum;  // From prefs.height
  build?: BuildEnum;  // From prefs.build
  interests?: string[];  // From prefs.interests
}

/**
 * Dating decision result
 */
export interface DatingDecisionResult {
  match: boolean;  // True if both users liked each other
}

/**
 * Dating match (result from rpc_get_my_dating_matches)
 */
export interface DatingMatch {
  matched_profile_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  dating_bio?: string;
  age?: number;
  interests?: string[];
  photos: string[];
  matched_at: string;
}

// ============================================================================
// ENUMS
// ============================================================================

export type ShowMeEnum = 'everyone' | 'men' | 'women';

export type GenderEnum = 
  | 'male' 
  | 'female' 
  | 'nonbinary' 
  | 'other' 
  | 'prefer_not_to_say';

export type HeightEnum = 
  | 'under_5' 
  | '5_0_to_5_3' 
  | '5_4_to_5_7' 
  | '5_8_to_5_11' 
  | '6_0_to_6_3' 
  | 'over_6_3';

export type BuildEnum = 
  | 'slim' 
  | 'athletic' 
  | 'average' 
  | 'curvy' 
  | 'heavyset';

export type ReligionEnum = 
  | 'christian' 
  | 'muslim' 
  | 'jewish' 
  | 'hindu' 
  | 'buddhist' 
  | 'atheist' 
  | 'agnostic' 
  | 'spiritual' 
  | 'other' 
  | 'prefer_not_to_say';

export type SmokerEnum = 'yes' | 'no' | 'occasionally';
export type DrinkerEnum = 'yes' | 'no' | 'socially';
export type PreferenceEnum = 'yes' | 'no' | 'doesnt_matter';

// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================

/**
 * Convert height enum to display string
 */
export function heightToDisplay(height: HeightEnum): string {
  const map: Record<HeightEnum, string> = {
    under_5: 'Under 5\'',
    '5_0_to_5_3': '5\'0" - 5\'3"',
    '5_4_to_5_7': '5\'4" - 5\'7"',
    '5_8_to_5_11': '5\'8" - 5\'11"',
    '6_0_to_6_3': '6\'0" - 6\'3"',
    over_6_3: 'Over 6\'3"',
  };
  return map[height] || height;
}

/**
 * Convert gender enum to display string
 */
export function genderToDisplay(gender: GenderEnum): string {
  const map: Record<GenderEnum, string> = {
    male: 'Male',
    female: 'Female',
    nonbinary: 'Non-binary',
    other: 'Other',
    prefer_not_to_say: 'Prefer not to say',
  };
  return map[gender] || gender;
}

/**
 * Convert build enum to display string
 */
export function buildToDisplay(build: BuildEnum): string {
  const map: Record<BuildEnum, string> = {
    slim: 'Slim',
    athletic: 'Athletic',
    average: 'Average',
    curvy: 'Curvy',
    heavyset: 'Heavyset',
  };
  return map[build] || build;
}

/**
 * Convert religion enum to display string
 */
export function religionToDisplay(religion: ReligionEnum): string {
  const map: Record<ReligionEnum, string> = {
    christian: 'Christian',
    muslim: 'Muslim',
    jewish: 'Jewish',
    hindu: 'Hindu',
    buddhist: 'Buddhist',
    atheist: 'Atheist',
    agnostic: 'Agnostic',
    spiritual: 'Spiritual',
    other: 'Other',
    prefer_not_to_say: 'Prefer not to say',
  };
  return map[religion] || religion;
}

/**
 * Check if preference is "doesn't matter"
 */
export function isDoesntMatter(value: any): boolean {
  return value === 'doesnt_matter' || value === undefined || value === null;
}

/**
 * Get default dating prefs
 */
export function getDefaultDatingPrefs(): Partial<DatingProfilePrefs> {
  return {
    show_me: 'everyone',
    age_min: 18,
    age_max: 99,
    smoker_ok: 'doesnt_matter',
    drinker_ok: 'doesnt_matter',
    religion_pref: 'doesnt_matter',
    height_pref: 'doesnt_matter',
    build_pref: 'doesnt_matter',
    interests_pref: 'doesnt_matter',
  };
}

/**
 * Validate dating prefs
 */
export function validateDatingPrefs(prefs: Partial<DatingProfilePrefs>): string[] {
  const errors: string[] = [];
  
  if (prefs.age_min !== undefined && prefs.age_max !== undefined) {
    if (prefs.age_min > prefs.age_max) {
      errors.push('Minimum age cannot be greater than maximum age');
    }
    if (prefs.age_min < 18) {
      errors.push('Minimum age must be at least 18');
    }
    if (prefs.age_max > 120) {
      errors.push('Maximum age seems unrealistic');
    }
  }
  
  if (prefs.age !== undefined) {
    if (prefs.age < 18) {
      errors.push('You must be at least 18 to use Dating');
    }
    if (prefs.age > 120) {
      errors.push('Age seems invalid');
    }
  }
  
  if (prefs.dating_bio && prefs.dating_bio.length > 500) {
    errors.push('Dating bio must be 500 characters or less');
  }
  
  if (prefs.interests && prefs.interests.length > 20) {
    errors.push('Maximum 20 interests allowed');
  }
  
  return errors;
}

// ============================================================================
// API FUNCTION SIGNATURES (for reference)
// ============================================================================

/**
 * Example usage in lib/link/api.ts:
 * 
 * export async function upsertDatingProfile(data: {
 *   enabled: boolean;
 *   location_text?: string;
 *   photos?: string[];
 *   prefs?: Partial<DatingProfilePrefs>;
 * }): Promise<DatingProfile> {
 *   const { data: result, error } = await supabase.rpc('rpc_upsert_dating_profile', {
 *     p_enabled: data.enabled,
 *     p_bio: null,  // Legacy
 *     p_location_text: data.location_text || null,
 *     p_photos: data.photos || [],
 *     p_prefs: data.prefs || {},
 *   });
 *   
 *   if (error) throw error;
 *   return result as DatingProfile;
 * }
 * 
 * export async function getDatingCandidates(
 *   limit: number = 20,
 *   offset: number = 0
 * ): Promise<DatingCandidate[]> {
 *   const { data, error } = await supabase.rpc('rpc_get_dating_candidates', {
 *     p_limit: limit,
 *     p_offset: offset,
 *   });
 *   
 *   if (error) throw error;
 *   return (data || []) as DatingCandidate[];
 * }
 */
