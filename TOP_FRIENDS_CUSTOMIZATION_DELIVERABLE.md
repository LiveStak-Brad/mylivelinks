# Top Friends Section - Full Customization Feature

## Overview
Implemented complete customization for the Top Friends section (MySpace-style feature), allowing users to personalize every aspect of how their favorite friends are displayed on their profile.

## Features

### 1. Show/Hide Section
- Toggle to completely hide or show the Top Friends section
- If hidden, section won't appear on profile even if friends are added

### 2. Custom Section Title
- Change "Top Friends" to anything: "Top G's", "My Crew", "VIPs", "Best Buds", etc.
- Maximum 50 characters
- Displays in the section header

### 3. Avatar Style
Two display options:
- **Square** (default) - Classic MySpace look with rounded corners
- **Circle** - Modern circular avatars

### 4. Maximum Friend Count (1-8)
- Dynamically set how many friends to display (1-8)
- Grid auto-adjusts and centers based on count
- No empty placeholder boxes shown to visitors
- Owner sees empty slots to encourage adding more friends

## Dynamic Grid Layout

The grid automatically adjusts based on the number of friends:

| Friend Count | Layout |
|--------------|--------|
| 1 friend | 1 column, centered |
| 2 friends | 2 columns, centered |
| 3 friends | 3 columns, centered |
| 4 friends | 2x2 grid on mobile, 4 columns on desktop |
| 5-6 friends | 3 columns |
| 7-8 friends | 2 columns on mobile, 4 on desktop |

## Database Schema

### New Fields Added to `profiles` Table

```sql
-- Show/hide toggle
show_top_friends BOOLEAN DEFAULT true

-- Custom title
top_friends_title TEXT DEFAULT 'Top Friends'

-- Avatar display style
top_friends_avatar_style TEXT DEFAULT 'square' 
  CHECK (top_friends_avatar_style IN ('circle', 'square'))

-- Maximum friends to display
top_friends_max_count INTEGER DEFAULT 8 
  CHECK (top_friends_max_count >= 1 AND top_friends_max_count <= 8)
```

## Files Created/Modified

### New Files
1. **`sql/add_top_friends_customization.sql`**
   - Migration to add customization fields to profiles table

2. **`components/profile/TopFriendsSettings.tsx`**
   - Settings component for profile settings page
   - Toggle, title input, style picker, max count slider
   - Visual preview grid

### Modified Files
1. **`components/profile/TopFriendsDisplay.tsx`**
   - Added support for all customization props
   - Dynamic grid layout based on friend count
   - Conditional rendering based on settings
   - Circle/square avatar styles

2. **`app/settings/profile/page.tsx`**
   - Added state variables for customization
   - Load/save customization from database
   - Render TopFriendsSettings component

3. **`app/[username]/modern-page.tsx`**
   - Added customization fields to ProfileData interface
   - Pass customization props to TopFriendsDisplay

## Usage

### For Users
1. Go to **Settings → Profile**
2. Scroll to **"Top Friends Section"**
3. Toggle "Show Top Friends Section" on/off
4. Customize:
   - Change the section title
   - Choose between circle or square avatars
   - Set maximum friends to display (1-8)
5. See live preview of grid layout
6. Click **"Save All Changes"**

### Component Props

```tsx
<TopFriendsDisplay
  profileId={string}
  isOwner={boolean}
  onManage={() => void}
  cardStyle={CSSProperties}
  borderRadiusClass={string}
  accentColor={string}
  // Customization props
  showTopFriends={boolean}          // default: true
  topFriendsTitle={string}          // default: 'Top Friends'
  topFriendsAvatarStyle={'circle' | 'square'}  // default: 'square'
  topFriendsMaxCount={number}       // default: 8, range: 1-8
/>
```

## Examples

### Example 1: Streamer "Top Legends"
```tsx
showTopFriends={true}
topFriendsTitle="Top Legends"
topFriendsAvatarStyle="square"
topFriendsMaxCount={8}
```

### Example 2: Business "VIP Clients"
```tsx
showTopFriends={true}
topFriendsTitle="VIP Clients"
topFriendsAvatarStyle="circle"
topFriendsMaxCount={4}
```

### Example 3: Musician "Top Supporters"
```tsx
showTopFriends={true}
topFriendsTitle="Top Supporters"
topFriendsAvatarStyle="circle"
topFriendsMaxCount={6}
```

## Migration Instructions

To apply the database changes:

```bash
# Connect to your Supabase project
psql your-database-url

# Run the migration
\i sql/add_top_friends_customization.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `sql/add_top_friends_customization.sql`
3. Run the SQL

## Design Decisions

### Auto-Centering Grid
- Empty placeholder boxes are NOT shown to visitors
- Grid centers and adapts to actual friend count
- Owner still sees empty slots to encourage adding friends
- Provides cleaner, more professional appearance

### Maximum Count Flexibility
- Users can showcase 1-8 friends (not forced to 8)
- Smaller grids look better for minimalist profiles
- Larger grids work for highly social users

### Circle vs Square
- Square maintains classic MySpace aesthetic
- Circle provides modern social media look
- Personal preference based on profile style

## Benefits

1. **Personalization** - Users express their style and branding
2. **Flexibility** - Works for all profile types (streamer, musician, business, etc.)
3. **Cleaner UX** - No empty boxes cluttering the profile
4. **Professional** - Customizable titles for business contexts
5. **Nostalgia** - MySpace-style feature with modern polish

## Testing Checklist

- [x] Database migration runs successfully
- [x] Settings component renders correctly
- [x] Toggle show/hide works
- [x] Title updates in real-time
- [x] Avatar style changes apply
- [x] Max count slider works (1-8)
- [x] Grid centers properly for all counts
- [x] Circle avatars display correctly
- [x] Square avatars display correctly
- [x] Settings persist after save
- [x] Profile displays customized version
- [x] Empty slots only show for owner
- [x] No linter errors

## Future Enhancements

Potential additions:
- Custom background colors for friend cards
- Ability to add custom labels/nicknames for each friend
- Drag-and-drop reordering in settings
- Multiple "Top Friends" lists (Top Supporters, Top Collaborators, etc.)
- Privacy settings (who can see this section)

