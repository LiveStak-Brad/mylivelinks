# Profile Section Customization — Quick Reference

## Overview
Users can now customize which sections appear on their profile via Edit Profile.

---

## Location

### Web
Navigate to: **Edit Profile** → Scroll to **"Customize Profile Sections"**

### Mobile
Navigate to: **Edit Profile** → Scroll to **"Customize Profile Sections"**

---

## Available Sections

| Section ID | Label | Description | Core? |
|------------|-------|-------------|-------|
| `hero` | Hero / Banner | Your profile header with avatar, name, and bio | ✅ |
| `social_counts` | Social Counts | Follower count and engagement stats | ❌ |
| `top_supporters` | Top Supporters | Users who have given you the most gifts | ❌ |
| `top_streamers` | Top Streamers | Top streamers you support with gifts | ❌ |
| `social_media` | Social Media Links | Instagram, Twitter, TikTok, etc. | ❌ |
| `connections` | Connections | Your followers and following list | ❌ |
| `links` | Featured Links | Your custom link buttons (Linktree-style) | ✅ |
| `profile_stats` | Profile Stats | Account age, join date, and other profile info | ❌ |
| `streaming_stats` | Streaming Stats | Live streaming hours, viewer counts, etc. | ❌ |
| `music_showcase` | Music Showcase | Your tracks, albums, and music links | ❌ |
| `upcoming_events` | Upcoming Events | Shows, gigs, and event schedule | ❌ |
| `merchandise` | Merchandise | Your merch store and products | ❌ |
| `portfolio` | Portfolio / Products | Your work portfolio or product catalog | ❌ |
| `business_info` | Business Info | Hours, location, contact info | ❌ |
| `footer` | Footer | Profile footer with branding | ✅ |

**Core Sections:** At least one must remain enabled (hero, links, or footer)

---

## How It Works

### Default Behavior (No Custom Selection)
When a user has NOT customized their sections:
- Profile displays sections based on their **profile_type** (streamer, musician, comedian, business, creator)
- Each profile_type has a different default set of enabled sections

### Custom Selection
When a user HAS customized their sections:
- Profile displays ONLY the sections they've enabled
- Custom selection overrides profile_type defaults
- At least one core section must remain enabled

### Visitor View
Visitors see sections based on:
1. **Enabled sections** (if customized) OR **profile_type defaults** (if not customized)
2. **Only sections with content** are shown (empty sections are hidden)

---

## Examples

### Example 1: Musician Profile (Default)
**Profile Type:** Musician  
**Custom Selection:** None  
**Visible Sections:**
- ✅ Hero / Banner
- ✅ Music Showcase
- ✅ Upcoming Events
- ✅ Social Counts
- ✅ Social Media Links
- ✅ Merchandise
- ✅ Connections
- ✅ Featured Links
- ✅ Footer

### Example 2: Musician Profile (Custom)
**Profile Type:** Musician  
**Custom Selection:** User disabled Merchandise, Social Counts, Connections  
**Visible Sections:**
- ✅ Hero / Banner
- ✅ Music Showcase
- ✅ Upcoming Events
- ✅ Social Media Links
- ✅ Featured Links
- ✅ Footer

### Example 3: Business Profile (Default)
**Profile Type:** Business  
**Custom Selection:** None  
**Visible Sections:**
- ✅ Hero / Banner
- ✅ Business Info
- ✅ Portfolio / Products
- ✅ Social Counts
- ✅ Social Media Links
- ✅ Featured Links
- ✅ Connections
- ✅ Footer

---

## UI Components

### Web Component
**File:** `components/profile/ProfileSectionToggle.tsx`

**Usage:**
```tsx
import ProfileSectionToggle from '@/components/profile/ProfileSectionToggle';
import { ProfileSection } from '@/lib/profileTypeConfig';

const [enabledSections, setEnabledSections] = useState<ProfileSection[] | null>(null);

<ProfileSectionToggle
  profileType={profileType}
  currentEnabledSections={enabledSections}
  onChange={setEnabledSections}
/>
```

### Mobile Component
**File:** `mobile/components/ProfileSectionToggle.tsx`

**Usage:**
```tsx
import ProfileSectionToggle from '../components/ProfileSectionToggle';
import type { ProfileSection } from '../config/profileTypeConfig';

const [enabledSections, setEnabledSections] = useState<ProfileSection[] | null>(null);

<ProfileSectionToggle
  profileType={profileType}
  currentEnabledSections={enabledSections}
  onChange={setEnabledSections}
/>
```

---

## Persistence (Database)

### Column
```sql
profiles.enabled_sections text[] DEFAULT NULL
```

### Values
- `NULL` → Use profile_type defaults
- `['hero', 'links', 'music_showcase']` → Custom selection
- Must include at least one core section: `hero`, `links`, or `footer`

### RPC Endpoints (Logic Manager)
```sql
-- Get enabled sections
SELECT * FROM get_enabled_sections('user-uuid');

-- Set enabled sections (authenticated user only)
SELECT set_enabled_sections(ARRAY['hero', 'links', 'music_showcase', 'footer']);

-- Reset to defaults
SELECT set_enabled_sections(NULL);
```

---

## Helper Functions

### Check if Section is Enabled
```typescript
import { isSectionEnabled } from '@/lib/profileTypeConfig'; // or '../config/profileTypeConfig' for mobile

// Check with custom selection
const isEnabled = isSectionEnabled('music_showcase', profileType, enabledSections);

// Check with profile_type defaults only
const isEnabled = isSectionEnabled('music_showcase', profileType);
```

### Get All Enabled Sections
```typescript
import { getEnabledSections } from '@/lib/profileTypeConfig';

// With custom selection
const sections = getEnabledSections(profileType, enabledSections);

// With profile_type defaults only
const sections = getEnabledSections(profileType);
```

---

## Validation Rules

1. **Core Section Required**
   - At least one of `hero`, `links`, or `footer` must be enabled
   - Attempting to disable all core sections triggers an alert

2. **Profile Type Compatibility**
   - Only sections available for the current profile_type can be enabled
   - Switching profile_type may enable/disable sections automatically

3. **Content Visibility**
   - Sections without content are hidden from visitors
   - Owner sees empty sections with "Add Content" prompts

---

## Testing

### Manual Test Steps
1. Navigate to Edit Profile
2. Scroll to "Customize Profile Sections"
3. Toggle sections on/off
4. Try to disable all core sections (should prevent)
5. Save profile
6. Navigate to public profile
7. Verify only enabled sections appear
8. Verify empty sections are hidden

### Automated Tests (TODO: Logic Manager)
- Unit tests for `get_enabled_sections` RPC
- Unit tests for `set_enabled_sections` RPC
- Integration tests for Web Edit Profile
- Integration tests for Mobile Edit Profile
- E2E tests for profile rendering

---

## Troubleshooting

### Issue: All sections appear even though some are disabled
**Solution:** Check if `enabled_sections` is properly saved to database. Verify RPC endpoints are working.

### Issue: Can't disable any sections
**Solution:** Trying to disable a core section. At least one of `hero`, `links`, or `footer` must remain enabled.

### Issue: Section appears in Edit Profile but not on public profile
**Solution:** This is expected behavior. Sections without content are hidden from visitors.

### Issue: Custom selection not persisting after save
**Solution:** Verify `profiles.enabled_sections` column exists. Check RPC grants are correct.

---

## Migration Checklist (Logic Manager)

- [ ] Add `profiles.enabled_sections` column
- [ ] Create `get_enabled_sections(uuid)` RPC
- [ ] Create `set_enabled_sections(text[])` RPC
- [ ] Grant RPC permissions
- [ ] Test RPCs in Supabase SQL Editor
- [ ] Test web save/load
- [ ] Test mobile save/load
- [ ] Verify visitor view respects enabled_sections

---

**Quick Reference Complete** ✅

