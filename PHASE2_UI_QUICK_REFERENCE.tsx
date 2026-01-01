// ============================================================================
// PHASE 2 GENDER FILTERING - UI QUICK REFERENCE
// ============================================================================

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { upsertDatingProfile } from '@/lib/link/api';
import type { DatingCandidate } from '@/lib/link/dating-types';
import { GenderEnum, genderToDisplay } from '@/lib/link/dating-types';

const supabase = createClient();

async function getCurrentUserId() {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) {
    throw new Error('You must be signed in');
  }
  return userId;
}

// ============================================================================
// 1. GENDER SELECTOR COMPONENT (For Profile Edit)
// ============================================================================

const GENDER_OPTIONS: { value: GenderEnum | 'none'; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'nonbinary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  { value: 'none', label: 'Not set' },  // Represents NULL
];

function GenderSelector({ 
  value, 
  onChange 
}: { 
  value: GenderEnum | null; 
  onChange: (gender: GenderEnum | null) => void;
}) {
  return (
    <select 
      value={value || 'none'} 
      onChange={(e) => {
        const val = e.target.value;
        onChange(val === 'none' ? null : val as GenderEnum);
      }}
    >
      {GENDER_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ============================================================================
// 2. SHOW ME PREFERENCE COMPONENT (For Dating Profile)
// ============================================================================

const SHOW_ME_OPTIONS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
];

function ShowMeSelector({ 
  value, 
  onChange 
}: { 
  value: 'everyone' | 'men' | 'women'; 
  onChange: (showMe: 'everyone' | 'men' | 'women') => void;
}) {
  return (
    <div>
      <label>Show me:</label>
      {SHOW_ME_OPTIONS.map(opt => (
        <label key={opt.value}>
          <input 
            type="radio"
            value={opt.value}
            checked={value === opt.value}
            onChange={(e) => onChange(e.target.value as any)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

// ============================================================================
// 3. SAVING GENDER TO PROFILE
// ============================================================================

async function updateProfileGender(gender: GenderEnum | null) {
  // Gender is stored in profiles table, not dating_profiles
  // You'll need an RPC or direct table update
  
  // Option A: Via Supabase client (if RLS allows)
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('profiles')
    .update({ gender })
    .eq('id', userId);
  
  if (error) {
    console.error('Failed to update gender:', error);
    throw error;
  }
  
  // Option B: Via RPC (if you create one)
  // const { error } = await supabase.rpc('rpc_update_profile_gender', {
  //   p_gender: gender
  // });
}

// ============================================================================
// 4. SAVING DOB TO PROFILE
// ============================================================================

async function updateProfileDOB(dateOfBirth: Date | null) {
  // Validate: Must be 18+ years old
  if (dateOfBirth) {
    const age = Math.floor(
      (Date.now() - dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    
    if (age < 18) {
      throw new Error('You must be at least 18 years old');
    }
  }
  
  // Convert to YYYY-MM-DD format
  const dobString = dateOfBirth 
    ? dateOfBirth.toISOString().split('T')[0] 
    : null;
  
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('profiles')
    .update({ date_of_birth: dobString })
    .eq('id', userId);
  
  if (error) {
    console.error('Failed to update DOB:', error);
    throw error;
  }
}

// ============================================================================
// 5. DISPLAYING GENDER ON CANDIDATE CARDS
// ============================================================================

function DatingCandidateCard({ candidate }: { candidate: DatingCandidate }) {
  return (
    <div className="candidate-card">
      <h2>{candidate.display_name}</h2>
      
      {/* Display gender if set and not prefer_not_to_say */}
      {candidate.gender && candidate.gender !== 'prefer_not_to_say' && (
        <p>Gender: {genderToDisplay(candidate.gender)}</p>
      )}
      
      {/* Display age (computed from DOB or stored age) */}
      {candidate.age && (
        <p>Age: {candidate.age}</p>
      )}
      
      {/* Rest of profile... */}
    </div>
  );
}

// ============================================================================
// 6. PROFILE SETUP FLOW (Complete Example)
// ============================================================================

function ProfileSetupPage() {
  const [gender, setGender] = useState<GenderEnum | null>(null);
  const [dob, setDob] = useState<string>(''); // YYYY-MM-DD
  const [showMe, setShowMe] = useState<'everyone' | 'men' | 'women'>('everyone');
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(99);
  
  const handleSave = async () => {
    try {
      // Step 1: Save gender and DOB to profiles table
      const userId = await getCurrentUserId();
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          gender, 
          date_of_birth: dob || null 
        })
        .eq('id', userId);
      
      if (profileError) throw profileError;
      
      // Step 2: Save dating preferences
      await upsertDatingProfile({
        enabled: true,
        prefs: {
          show_me: showMe,
          age_min: ageMin,
          age_max: ageMax,
        }
      });
      
      alert('Profile saved!');
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile');
    }
  };
  
  return (
    <div>
      <h1>Dating Profile Setup</h1>
      
      {/* Gender selector */}
      <div>
        <label>Your Gender:</label>
        <GenderSelector value={gender} onChange={setGender} />
      </div>
      
      {/* DOB input */}
      <div>
        <label>Date of Birth:</label>
        <input 
          type="date" 
          value={dob} 
          onChange={(e) => setDob(e.target.value)}
          max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]
          }
        />
        <small>Must be 18+ to use Dating</small>
      </div>
      
      {/* Show me preference */}
      <div>
        <ShowMeSelector value={showMe} onChange={setShowMe} />
      </div>
      
      {/* Age range preference */}
      <div>
        <label>Age Range:</label>
        <input 
          type="number" 
          value={ageMin} 
          onChange={(e) => setAgeMin(Number(e.target.value))}
          min={18}
          max={ageMax}
        />
        <span> to </span>
        <input 
          type="number" 
          value={ageMax} 
          onChange={(e) => setAgeMax(Number(e.target.value))}
          min={ageMin}
          max={120}
        />
      </div>
      
      <button onClick={handleSave}>Save Profile</button>
    </div>
  );
}

// ============================================================================
// 7. UNDERSTANDING NULL vs prefer_not_to_say
// ============================================================================

/*
gender = NULL
  - User hasn't set their gender yet
  - Will appear in "everyone" searches only
  - Won't appear in "men" or "women" filtered searches

gender = 'prefer_not_to_say'
  - User explicitly chose not to disclose
  - Will appear in "everyone" searches only
  - Won't appear in "men" or "women" filtered searches

Recommendation: Default to NULL, let users choose "prefer_not_to_say" if desired.
*/

// ============================================================================
// 8. ANON USER HANDLING
// ============================================================================

/*
If user is NOT authenticated:
- They can still browse dating candidates
- They get unfiltered results (show_me='everyone' behavior)
- No gender filtering applied
- No exclusion of decided/matched (they have no profile)

This is intentional for growth/discovery.
To change this, modify the RPC to reject anon users.
*/

// ============================================================================
// 9. TESTING GENDER FILTERING
// ============================================================================

async function testGenderFiltering() {
  // Test 1: Set preference to "women"
  await upsertDatingProfile({
    enabled: true,
    prefs: { show_me: 'women', age_min: 24, age_max: 35 }
  });
  
  const candidates = await getDatingCandidates(10, 0);
  console.log('Candidates (should be all female):', candidates);
  
  // Verify: All should have gender='female'
  const allFemale = candidates.every(c => c.gender === 'female');
  console.log('All female?', allFemale);
  
  // Test 2: Set preference to "men"
  await upsertDatingProfile({
    enabled: true,
    prefs: { show_me: 'men', age_min: 24, age_max: 35 }
  });
  
  const menCandidates = await getDatingCandidates(10, 0);
  console.log('Candidates (should be all male):', menCandidates);
  
  const allMale = menCandidates.every(c => c.gender === 'male');
  console.log('All male?', allMale);
  
  // Test 3: Set preference to "everyone"
  await upsertDatingProfile({
    enabled: true,
    prefs: { show_me: 'everyone', age_min: 18, age_max: 99 }
  });
  
  const allCandidates = await getDatingCandidates(20, 0);
  console.log('Candidates (should be mixed):', allCandidates);
  
  const genders = [...new Set(allCandidates.map(c => c.gender))];
  console.log('Unique genders:', genders);
}

// ============================================================================
// 10. COMMON PITFALLS
// ============================================================================

/*
❌ DON'T:
- Store gender in dating_profiles.prefs (it's in profiles table)
- Force users to set gender (allow NULL)
- Show "prefer_not_to_say" in filtered searches (respect privacy)
- Allow users under 18 to set DOB

✅ DO:
- Store gender in profiles table (one source of truth)
- Allow NULL gender (not everyone wants to disclose)
- Respect "prefer_not_to_say" by excluding from filtered searches
- Calculate age from DOB when available
- Fall back to stored age if DOB not set
- Validate DOB is 18+ before saving
*/
