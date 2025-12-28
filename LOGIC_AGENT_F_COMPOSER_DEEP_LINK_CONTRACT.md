# LOGIC AGENT F — Composer Deep Link Contract
**Status:** ✅ Complete  
**Date:** 2025-12-28  
**Scope:** Deep link URL standardization for "Open in Web Composer"

---

## Canonical Routes

### 1. Composer List
```
/composer
```
**Purpose:** Main composer projects list (drafts + posted tabs)  
**Auth:** Required (redirects to /login if unauthenticated)  
**Mobile Use:** Primary CTA destination from mobile app

### 2. Composer Editor
```
/composer/new
/composer/project/{project_id}
```
**Purpose:** Create new project or edit existing project  
**Auth:** Required  
**Mobile Use:** Direct deep link when mobile app has project context

---

## API Resolver

For mobile apps that need to validate access before opening:

### GET `/api/composer/project/{id}`

**Purpose:** Validate project access and return project metadata

**Request:**
```typescript
GET /api/composer/project/abc123-uuid-here
Headers: {
  Authorization: Bearer {supabase_jwt}
}
```

**Response (200 OK):**
```json
{
  "project_id": "abc123-uuid-here",
  "title": "My Project",
  "owner_profile_id": "user-uuid",
  "has_access": true,
  "redirect_url": "/composer/project/abc123-uuid-here"
}
```

**Response (403 Forbidden):**
```json
{
  "project_id": "abc123-uuid-here",
  "has_access": false,
  "error": "You don't have permission to access this project"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Project not found"
}
```

---

## Auth Expectations

**Minimal Requirements:**
- Valid Supabase JWT token
- User must be authenticated (`auth.uid()` must exist)
- For `/composer/project/{id}`:
  - User must be project owner OR listed as actor
  - RLS will enforce access control

**Unauthenticated Behavior:**
- Redirect to `/login?redirect=/composer` or `/login?redirect=/composer/project/{id}`
- Mobile app should handle auth before calling deep link

---

## Implementation Files

### API Route Handler
```
app/api/composer/project/[id]/route.ts
```

Created with:
- Access validation logic
- Project metadata retrieval
- Proper auth checks
- Error handling

---

## Mobile Integration Example

**Scenario 1: Generic "Open Web Composer" CTA**
```typescript
// Mobile app button action
const webUrl = "https://www.mylivelinks.com/composer";
Linking.openURL(webUrl);
```

**Scenario 2: Open Specific Project**
```typescript
// When user has project context
const projectId = "abc123-uuid-here";
const webUrl = `https://www.mylivelinks.com/composer/project/${projectId}`;
Linking.openURL(webUrl);
```

**Scenario 3: Validate Access First (Optional)**
```typescript
// If mobile app wants to check access before opening
const response = await fetch(
  `https://www.mylivelinks.com/api/composer/project/${projectId}`,
  {
    headers: {
      Authorization: `Bearer ${supabaseJwt}`
    }
  }
);

if (response.ok) {
  const data = await response.json();
  if (data.has_access) {
    Linking.openURL(data.redirect_url);
  } else {
    // Show error in mobile app
  }
}
```

---

## Notes

- **No database changes needed** — Composer projects table doesn't exist yet; this contract is ready for when it does
- **Existing pages work** — `/composer` and `/composer/[projectId]/page.tsx` already exist as UI scaffolds
- **Future-proof** — API resolver is ready to wire up when composer backend is implemented
- **Simple fallback** — If API returns 404/500, mobile can still deep link directly to web URL

---

## Testing

### Manual Test URLs
```bash
# List page
https://www.mylivelinks.com/composer

# New project
https://www.mylivelinks.com/composer/new

# Existing project (when backend implemented)
https://www.mylivelinks.com/composer/project/abc123-uuid-here
```

### API Test (when backend implemented)
```bash
curl -X GET \
  https://www.mylivelinks.com/api/composer/project/abc123-uuid-here \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Contract Complete ✅

**What Mobile Team Needs:**
1. Primary CTA: `https://www.mylivelinks.com/composer`
2. Project-specific: `https://www.mylivelinks.com/composer/project/{id}`
3. Optional validator: `GET /api/composer/project/{id}`

**Auth:** Supabase JWT required for all routes

**No further action needed** until composer backend is fully wired.

