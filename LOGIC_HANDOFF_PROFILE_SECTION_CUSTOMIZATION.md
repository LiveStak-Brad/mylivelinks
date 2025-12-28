# LOGIC HANDOFF TICKET — Profile Section Customization Persistence

## Overview
UI Agent #1 has implemented the **Profile Section Customization** feature for both Web and Mobile. This feature allows users to toggle which sections appear on their profile across all profile types (streamer, musician, comedian, business, creator).

The UI is complete and functional, but currently saves to `profiles.enabled_sections` as a simple array. This ticket defines the persistence requirements for the Logic Manager.

---

## Database Schema

### Table: `profiles`

**Add column:**

```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS enabled_sections text[] DEFAULT NULL;
```

**Description:**
- `enabled_sections` is a `text[]` (array of text) column
- Stores the list of section IDs the user has chosen to enable
- If `NULL`, the profile falls back to `profile_type` defaults
- If `[]` (empty array), all sections are disabled (must enforce at least one core section in RPC)

**Valid values (ProfileSection enum):**
```
hero
social_counts
top_supporters
top_streamers
social_media
connections
links
profile_stats
streaming_stats
music_showcase
upcoming_events
merchandise
portfolio
business_info
footer
```

---

## RPC Endpoints

### 1. `get_enabled_sections(p_profile_id uuid)`

**Purpose:** Get the enabled sections for a profile

**Returns:**
```sql
TABLE (
  enabled_sections text[]
)
```

**Logic:**
```sql
CREATE OR REPLACE FUNCTION public.get_enabled_sections(
  p_profile_id uuid
)
RETURNS TABLE (
  enabled_sections text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT p.enabled_sections
  FROM public.profiles p
  WHERE p.id = p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_enabled_sections(uuid) TO anon, authenticated;
```

---

### 2. `set_enabled_sections(p_sections text[])`

**Purpose:** Set the enabled sections for the authenticated user's profile

**Parameters:**
- `p_sections text[]` - Array of section IDs to enable (or `NULL` to reset to profile_type defaults)

**Returns:** `void`

**Logic:**
```sql
CREATE OR REPLACE FUNCTION public.set_enabled_sections(
  p_sections text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_core_sections text[] := ARRAY['hero', 'links', 'footer'];
  v_has_core boolean;
BEGIN
  v_uid := auth.uid();
  
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  -- If p_sections is NULL, reset to profile_type defaults
  IF p_sections IS NULL THEN
    UPDATE public.profiles
    SET enabled_sections = NULL,
        updated_at = now()
    WHERE id = v_uid;
    RETURN;
  END IF;
  
  -- Ensure at least one core section is enabled
  v_has_core := EXISTS (
    SELECT 1
    FROM unnest(p_sections) AS s
    WHERE s = ANY(v_core_sections)
  );
  
  IF NOT v_has_core THEN
    RAISE EXCEPTION 'At least one core section (hero, links, or footer) must be enabled';
  END IF;
  
  -- Update enabled_sections
  UPDATE public.profiles
  SET enabled_sections = p_sections,
      updated_at = now()
  WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_enabled_sections(text[]) TO authenticated;
```

---

## Client Integration (Already Implemented by UI Agent #1)

### Web Implementation

**File:** `app/settings/profile/page.tsx`

```typescript
// State
const [enabledSections, setEnabledSections] = useState<ProfileSection[] | null>(null);

// Load
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

if (profile.enabled_sections && Array.isArray(profile.enabled_sections)) {
  setEnabledSections(profile.enabled_sections as ProfileSection[]);
} else {
  setEnabledSections(null); // null = use profile_type defaults
}

// Save
const updatePayload: any = {
  enabled_sections: enabledSections || null,
  // ... other fields
};

await supabase
  .from('profiles')
  .update(updatePayload)
  .eq('id', userId);
```

### Mobile Implementation

**File:** `mobile/screens/EditProfileScreen.tsx`

```typescript
// State
const [enabledSections, setEnabledSections] = useState<ProfileSection[] | null>(null);

// Load
const { data } = await supabase
  .from('profiles')
  .select('id, username, display_name, bio, profile_type, enabled_sections')
  .eq('id', userId)
  .single();

if (row.enabled_sections && Array.isArray(row.enabled_sections)) {
  setEnabledSections(row.enabled_sections as ProfileSection[]);
} else {
  setEnabledSections(null);
}

// Save
const updatePayload: any = {
  enabled_sections: enabledSections || null,
  // ... other fields
};

await supabase
  .from('profiles')
  .update(updatePayload)
  .eq('id', userId);
```

---

## Section Rendering Logic (Already Implemented)

### Web: `app/[username]/modern-page.tsx`

```typescript
import { isSectionEnabled } from '@/lib/profileTypeConfig';

interface ProfileData {
  profile: {
    // ...
    profile_type?: ProfileType;
    enabled_sections?: string[] | null;
  };
}

// Render sections conditionally
{isSectionEnabled('music_showcase', profile.profile_type, profile.enabled_sections) && (
  <MusicShowcase />
)}
```

### Mobile: `mobile/screens/ProfileScreen.tsx`

```typescript
import { isSectionEnabled } from '../config/profileTypeConfig';

interface ProfileData {
  profile: {
    // ...
    profile_type?: ProfileType;
    enabled_sections?: string[] | null;
  };
}

// Render sections conditionally
{isSectionEnabled('music_showcase', profileType, profile.enabled_sections as any) && (
  <MusicSection />
)}
```

---

## Helper Functions (Already Implemented)

### `lib/profileTypeConfig.ts` (Web) and `mobile/config/profileTypeConfig.ts` (Mobile)

```typescript
/**
 * Check if a specific section is enabled for a profile type
 * If customEnabledSections is provided, check that instead
 */
export function isSectionEnabled(
  section: ProfileSection, 
  profileType?: ProfileType,
  customEnabledSections?: ProfileSection[] | null
): boolean {
  // If custom list exists, use it
  if (customEnabledSections && customEnabledSections.length > 0) {
    return customEnabledSections.includes(section);
  }
  
  // Fallback to profile_type defaults
  const config = getProfileTypeConfig(profileType);
  const sectionConfig = config.sections.find(s => s.id === section);
  return sectionConfig?.enabled ?? false;
}
```

---

## UI Components (Already Implemented)

### Web: `components/profile/ProfileSectionToggle.tsx`
- Toggle UI for enabling/disabling sections
- Prevents disabling all core sections
- Auto-selects profile_type defaults when no custom selection exists

### Mobile: `mobile/components/ProfileSectionToggle.tsx`
- Native mobile version with identical functionality
- Uses Alert.alert for validation messages

---

## Testing Requirements

### Unit Tests
1. Test `get_enabled_sections` RPC
   - Returns `NULL` when no custom selection
   - Returns custom array when set
2. Test `set_enabled_sections` RPC
   - Rejects if no core section is enabled
   - Accepts `NULL` (reset to defaults)
   - Accepts valid section arrays

### Integration Tests
1. Web: Toggle sections in Edit Profile, save, verify profile page updates
2. Mobile: Toggle sections in Edit Profile, save, verify profile page updates
3. Verify visitor view respects enabled sections
4. Verify sections without content are hidden even if enabled

---

## Migration Script

```sql
BEGIN;

-- Add enabled_sections column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS enabled_sections text[] DEFAULT NULL;

-- Create get_enabled_sections RPC
CREATE OR REPLACE FUNCTION public.get_enabled_sections(
  p_profile_id uuid
)
RETURNS TABLE (
  enabled_sections text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT p.enabled_sections
  FROM public.profiles p
  WHERE p.id = p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_enabled_sections(uuid) TO anon, authenticated;

-- Create set_enabled_sections RPC
CREATE OR REPLACE FUNCTION public.set_enabled_sections(
  p_sections text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_core_sections text[] := ARRAY['hero', 'links', 'footer'];
  v_has_core boolean;
BEGIN
  v_uid := auth.uid();
  
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  -- If p_sections is NULL, reset to profile_type defaults
  IF p_sections IS NULL THEN
    UPDATE public.profiles
    SET enabled_sections = NULL,
        updated_at = now()
    WHERE id = v_uid;
    RETURN;
  END IF;
  
  -- Ensure at least one core section is enabled
  v_has_core := EXISTS (
    SELECT 1
    FROM unnest(p_sections) AS s
    WHERE s = ANY(v_core_sections)
  );
  
  IF NOT v_has_core THEN
    RAISE EXCEPTION 'At least one core section (hero, links, or footer) must be enabled';
  END IF;
  
  -- Update enabled_sections
  UPDATE public.profiles
  SET enabled_sections = p_sections,
      updated_at = now()
  WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_enabled_sections(text[]) TO authenticated;

COMMIT;
```

---

## Definition of Done

- ✅ `profiles.enabled_sections` column exists (text[])
- ✅ `get_enabled_sections(uuid)` RPC implemented and granted
- ✅ `set_enabled_sections(text[])` RPC implemented and granted
- ✅ RPC enforces at least one core section
- ✅ Migration script tested in Supabase SQL Editor
- ✅ Web Edit Profile saves/loads enabled_sections
- ✅ Mobile Edit Profile saves/loads enabled_sections
- ✅ Profile pages render sections based on enabled_sections
- ✅ Visitor view respects enabled_sections
- ✅ Empty sections are hidden even if enabled

---

## Notes

1. **Core Sections:** At least one of `hero`, `links`, or `footer` must be enabled to prevent blank profiles
2. **Fallback Logic:** If `enabled_sections` is `NULL`, the profile uses `profile_type` defaults from the config
3. **Visitor Behavior:** Visitors only see sections with actual content, regardless of toggle state
4. **No Mock Data:** This system respects the "no mock data" rule—sections without content are hidden

---

## Files Changed by UI Agent #1

### Web
- ✅ `components/profile/ProfileSectionToggle.tsx` (new)
- ✅ `app/settings/profile/page.tsx` (updated)
- ✅ `app/[username]/modern-page.tsx` (updated)
- ✅ `lib/profileTypeConfig.ts` (updated helpers)

### Mobile
- ✅ `mobile/components/ProfileSectionToggle.tsx` (new)
- ✅ `mobile/screens/EditProfileScreen.tsx` (updated)
- ✅ `mobile/screens/ProfileScreen.tsx` (updated)
- ✅ `mobile/config/profileTypeConfig.ts` (updated helpers)

---

**UI Agent #1 Handoff Complete ✅**

