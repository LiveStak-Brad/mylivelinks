# MyLiveLinks - Development Guide

## Profile + Login MVP

This MVP includes:
- `/login` - Authentication page (email + password)
- `/[username]` - Public profile page (Linktree-style)
- `/settings/profile` - Profile editing page (owner only)

## Environment Variables

### Required for Supabase (when enabled):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Optional:

```env
NEXT_PUBLIC_PREVIEW_MODE=false  # Set to true to use mock data
NEXT_PUBLIC_DEV_SEED_MODE=false  # Set to true to use seed data
```

## Database Setup

Run these SQL blocks in Supabase SQL Editor (in order):

1. **Block 1**: `database_schema.sql` - Main schema
2. **Block 2**: `schema_extensions_coins_diamonds.sql` - Extensions
3. **Block 3**: `seed_owner_and_data.sql` - Owner account & seed data
4. **Block 4**: `withdrawal_system.sql` - Withdrawal system
5. **Block 5**: `blocking_system.sql` - Blocking system
6. **Block 6**: `pinned_posts_schema.sql` - Pinned posts table

## Mock Mode

If Supabase env vars are not set, the app runs in **mock mode**:
- All database queries return empty/mock data
- Authentication is mocked
- Media uploads use local object URLs (not persisted)
- Perfect for UI development without database setup

## Features

### Login Page (`/login`)
- Email + password authentication
- Sign up / Sign in toggle
- Auto-redirects to `/settings/profile` after login
- Redirects to `/login` if not authenticated

### Public Profile (`/[username]`)
- Linktree-style layout
- Avatar, display name, @username, bio
- "Watch Live" button (if live) → `/live`
- "Go Live" button → `/live?goLive=1`
- Pinned post card (image or video)
- Links list (Linktree-style buttons)
- "Edit Profile" link (owner only) → `/settings/profile`

### Profile Settings (`/settings/profile`)
- Upload avatar (image)
- Edit display name & bio
- Manage links (add/edit/remove/reorder)
- Pinned post editor:
  - Upload media (image or video)
  - Edit caption
  - Replace media
  - Delete pinned post

## Media Handling

**Current (Mock Mode):**
- Media files use `URL.createObjectURL()` for preview
- Object URLs are stored in mock state (not persisted)
- Resets on page refresh

**Future (Production):**
- Upload to Supabase Storage
- Store URLs in `pinned_posts.media_url`
- Implement proper file upload with progress

## Database Tables Used

- `profiles` - User profiles
- `user_links` - External links
- `pinned_posts` - ONE pinned post per profile
- `auth.users` - Supabase Auth (for authentication)

## Testing

1. **Without Supabase**: App runs in mock mode automatically
2. **With Supabase**: Set env vars and run SQL blocks
3. **Login**: Use `wcba.mo@gmail.com` / `lopsided1` (owner account)
4. **Profile**: Visit `/owner` to see profile
5. **Edit**: Visit `/settings/profile` to edit (must be logged in)

## Notes

- Pinned post supports exactly ONE post per profile
- Media can be image OR video (not both)
- Links are ordered by `display_order`
- Profile editing requires authentication
- All pages are responsive (mobile + desktop)
