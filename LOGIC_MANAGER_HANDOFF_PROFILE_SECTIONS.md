# 🎯 Logic Manager Handoff — Profile Sections Backend

**From**: UI Agent #2  
**To**: Logic Manager  
**Status**: UI Complete — Backend Implementation Needed  
**Priority**: Medium

---

## 📋 Overview

UI Agent #2 has completed the modal opacity fixes. All edit modals are now fully opaque and readable on both web and mobile platforms.

**Next Step**: Logic Manager needs to implement the backend for **profile sections management** (enabled_sections feature).

---

## 🗄️ Database Schema Changes

### Add Column to `profiles` Table

```sql
-- Add enabled_sections column to profiles table
ALTER TABLE profiles 
ADD COLUMN enabled_sections text[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.enabled_sections IS 
'User-customized list of enabled profile sections. NULL means use profile_type defaults. Empty array [] means no sections shown.';
```

**Column Details**:
- **Type**: `text[]` (array of strings)
- **Default**: `NULL`
- **Nullable**: Yes
- **Purpose**: Store user's custom section preferences

**Behavior**:
- `NULL` → UI uses defaults from `profile_type` (default, business, creator, adult)
- `['about', 'links', 'portfolio']` → UI shows only these sections
- `[]` → UI shows no sections (edge case, but allowed)

---

## 🔌 API Endpoints Required

### 1. GET Enabled Sections

**Endpoint**: `GET /api/profile/sections/enabled`

**Purpose**: Fetch the authenticated user's enabled sections

**Request**:
```http
GET /api/profile/sections/enabled
Authorization: Bearer <token>
```

**Response (Custom Sections)**:
```json
{
  "enabled_sections": ["about", "links", "portfolio", "music"],
  "profile_type": "creator",
  "is_custom": true
}
```

**Response (Using Defaults)**:
```json
{
  "enabled_sections": null,
  "profile_type": "creator",
  "is_custom": false
}
```

**Error Responses**:
- `401 Unauthorized`: Not logged in
- `404 Not Found`: Profile not found
- `500 Internal Server Error`: Database error

**Implementation Notes**:
- Check `auth.uid()` matches profile owner
- Return `enabled_sections` from `profiles` table
- Include `profile_type` for UI to compute defaults if needed

---

### 2. POST Update Enabled Sections

**Endpoint**: `POST /api/profile/sections/enabled`

**Purpose**: Update the authenticated user's enabled sections

**Request**:
```http
POST /api/profile/sections/enabled
Authorization: Bearer <token>
Content-Type: application/json

{
  "enabled_sections": ["about", "links", "portfolio"]
}
```

**Request Body**:
```typescript
{
  enabled_sections: string[] | null;  // null to reset to defaults
}
```

**Response (Success)**:
```json
{
  "success": true,
  "enabled_sections": ["about", "links", "portfolio"],
  "message": "Profile sections updated successfully"
}
```

**Response (Reset to Defaults)**:
```json
{
  "success": true,
  "enabled_sections": null,
  "message": "Profile sections reset to defaults"
}
```

**Error Responses**:
- `401 Unauthorized`: Not logged in
- `400 Bad Request`: Invalid section names
- `422 Unprocessable Entity`: Invalid array format
- `500 Internal Server Error`: Database error

**Validation**:
```typescript
const VALID_SECTIONS = [
  'about',
  'links',
  'portfolio',
  'music',
  'videos',
  'events',
  'products',
  'comedy',
  'posts',
  'social',
  'adult',  // Only if profile_type = 'adult'
];

function validateSections(sections: string[] | null, profileType: string): boolean {
  if (sections === null) return true;  // Reset to defaults is always valid
  if (!Array.isArray(sections)) return false;
  
  // Check each section is valid
  for (const section of sections) {
    if (!VALID_SECTIONS.includes(section)) return false;
    
    // Adult section only for adult profiles
    if (section === 'adult' && profileType !== 'adult') return false;
  }
  
  return true;
}
```

---

## 🔐 RLS Policies

### Read Policy (profiles table)

```sql
-- Allow public to read profiles (enabled_sections doesn't leak sensitive data)
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);
```

**Rationale**: `enabled_sections` is just a list of section names. It doesn't leak sensitive data, and the UI needs it to render the profile correctly. Public read is safe.

---

### Update Policy (profiles table)

```sql
-- Only owner can update their own enabled_sections
CREATE POLICY "Users can update their own profile sections"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

**Rationale**: Only the profile owner should be able to customize which sections are visible.

---

## 🎨 UI Integration (Already Complete)

### Web

**Profile Settings Page** (`app/settings/profile/page.tsx`):
- Already has ProfileSectionToggle component
- User can enable/disable sections visually
- Calls `/api/profile/sections/enabled` on save

**Profile Display** (`components/profile/*.tsx`):
- Reads `enabled_sections` from profile data
- Falls back to `profile_type` defaults if `enabled_sections` is null

---

### Mobile

**Edit Profile Screen** (`mobile/screens/EditProfileScreen.tsx`):
- Already has section toggle UI
- User can enable/disable sections
- Calls `/api/profile/sections/enabled` on save

**Profile Display** (`mobile/screens/ProfileScreen.tsx`):
- Reads `enabled_sections` from profile data
- Falls back to `profile_type` defaults if `enabled_sections` is null

---

## 🧪 Testing Checklist

### Backend Tests

- [ ] **Schema Migration**: Run migration, verify column exists
- [ ] **GET endpoint**: Fetch sections for logged-in user
- [ ] **GET endpoint**: Returns null when no custom sections set
- [ ] **POST endpoint**: Update sections successfully
- [ ] **POST endpoint**: Validate section names
- [ ] **POST endpoint**: Reject invalid section names
- [ ] **POST endpoint**: Reset to defaults (null)
- [ ] **RLS**: Owner can update their own sections
- [ ] **RLS**: User cannot update another user's sections
- [ ] **RLS**: Public can read profile (including enabled_sections)

### Integration Tests (Frontend)

- [ ] **Web**: Save section preferences from settings page
- [ ] **Web**: Profile renders only enabled sections
- [ ] **Mobile**: Save section preferences from edit screen
- [ ] **Mobile**: Profile renders only enabled sections
- [ ] **Cross-platform**: Changes sync between web and mobile

---

## 📖 Example Usage Flow

### 1. User Customizes Sections

**User Action**: User goes to Settings → Profile → Section Toggles

**Frontend**:
```typescript
// User toggles sections
const customSections = ['about', 'links', 'portfolio'];

// Save to backend
await fetch('/api/profile/sections/enabled', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ enabled_sections: customSections }),
});
```

**Backend**:
```typescript
// Validate sections
if (!validateSections(customSections, profile.profile_type)) {
  return res.status(400).json({ error: 'Invalid section names' });
}

// Update database
await supabase
  .from('profiles')
  .update({ enabled_sections: customSections })
  .eq('id', userId);
```

---

### 2. Profile Display

**Frontend (Profile Page)**:
```typescript
// Fetch profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*, enabled_sections, profile_type')
  .eq('username', username)
  .single();

// Determine which sections to show
const sectionsToShow = profile.enabled_sections 
  ? profile.enabled_sections 
  : getDefaultSectionsForType(profile.profile_type);

// Render only enabled sections
{sectionsToShow.includes('about') && <AboutSection />}
{sectionsToShow.includes('links') && <LinksSection />}
{sectionsToShow.includes('portfolio') && <PortfolioSection />}
```

---

### 3. Reset to Defaults

**User Action**: User clicks "Reset to Defaults" button

**Frontend**:
```typescript
await fetch('/api/profile/sections/enabled', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ enabled_sections: null }),
});
```

**Backend**:
```typescript
// Set enabled_sections to NULL
await supabase
  .from('profiles')
  .update({ enabled_sections: null })
  .eq('id', userId);
```

---

## 🚀 Implementation Priority

### High Priority
- [x] Modal opacity fix (UI Agent #2) — ✅ COMPLETE
- [ ] Database schema migration (Logic Manager)
- [ ] GET endpoint (Logic Manager)
- [ ] POST endpoint (Logic Manager)

### Medium Priority
- [ ] RLS policies (Logic Manager)
- [ ] Integration testing (Logic Manager + QA)

### Low Priority
- [ ] Performance optimization (if needed)
- [ ] Caching strategy (if needed)

---

## 📦 Deliverables Expected from Logic Manager

1. **Migration File**: `supabase/migrations/YYYYMMDD_add_enabled_sections.sql`
2. **API Route**: `app/api/profile/sections/enabled/route.ts`
3. **RLS Policies**: Updated in migration or separate file
4. **Tests**: Backend tests for endpoints
5. **Documentation**: API documentation in `API_DOCS.md`

---

## 🎯 Definition of Done (Backend)

- [ ] Migration runs successfully
- [ ] GET endpoint returns correct data
- [ ] POST endpoint validates and saves correctly
- [ ] RLS policies enforce owner-only updates
- [ ] Tests pass (backend + integration)
- [ ] Documentation complete
- [ ] Frontend can save and retrieve sections

---

## 📞 Contact

**UI Agent #2** has completed their portion. Logic Manager can proceed with backend implementation.

**Questions?** Refer to:
- `UI_AGENT_2_MODAL_OPACITY_FIX_COMPLETE.md` (UI deliverables)
- `components/profile/ProfileSectionToggle.tsx` (UI component)
- `mobile/screens/EditProfileScreen.tsx` (Mobile UI)

---

**Status**: ✅ UI Complete, ⏳ Backend Pending  
**Blocker**: None  
**Ready for Logic Manager**: ✅ Yes


