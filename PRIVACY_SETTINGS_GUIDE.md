# Privacy Settings Guide

## Overview
Users can now control who can see their social connections (following, followers, and friends lists).

## Database Setup

### 1. Run the SQL migrations in this order:

```bash
# Add privacy columns to profiles table
psql -d your_database < add_privacy_settings.sql

# Add privacy-aware RPC functions
psql -d your_database < add_follows_privacy_rpcs.sql
```

### 2. What was added:

**New columns in `profiles` table:**
- `hide_following` (boolean) - Hides the user's following list
- `hide_followers` (boolean) - Hides the user's followers list
- `hide_friends` (boolean) - Hides the user's mutual friends list

**New RPC functions:**
- `get_user_following(target_user_id, requesting_user_id)` - Get following list with privacy check
- `get_user_followers(target_user_id, requesting_user_id)` - Get followers list with privacy check
- `get_user_friends(target_user_id, requesting_user_id)` - Get friends list with privacy check
- `can_view_user_lists(target_user_id, requesting_user_id)` - Check which lists are visible

**Updated RPC function:**
- `update_user_profile()` - Now accepts privacy setting parameters

## Frontend Components

### 1. PrivacySettings Component
Location: `components/PrivacySettings.tsx`

**Usage:**
```tsx
import PrivacySettings from '@/components/PrivacySettings';

<PrivacySettings userId={currentUser.id} />
```

**Features:**
- Toggle visibility for following, followers, and friends lists
- Real-time save to database
- Success/error messaging
- Responsive design

### 2. UserConnectionsList Component
Location: `components/UserConnectionsList.tsx`

**Usage:**
```tsx
import UserConnectionsList from '@/components/UserConnectionsList';

// Show following list
<UserConnectionsList
  userId={profileUserId}
  listType="following"
  currentUserId={loggedInUserId}
/>

// Show followers list
<UserConnectionsList
  userId={profileUserId}
  listType="followers"
  currentUserId={loggedInUserId}
/>

// Show friends list
<UserConnectionsList
  userId={profileUserId}
  listType="friends"
  currentUserId={loggedInUserId}
/>
```

**Features:**
- Automatically checks privacy settings before displaying
- Shows "private" message if user has hidden their list
- Displays lock icon for hidden lists
- Responsive grid layout
- User avatars and bio previews

## How Privacy Works

### Privacy Rules:
1. **Owner Always Sees Everything:** Users can always see their own lists, regardless of privacy settings
2. **Hidden from Others:** When a privacy setting is enabled, other users see a "private" message instead of the list
3. **Count Still Shows:** The total count (e.g., "Following (42)") may still be visible on profiles, but the list itself is hidden

### Example Flow:
```typescript
// User A sets hide_following = true
// User B tries to view User A's following list

const { data } = await supabase.rpc('get_user_following', {
  target_user_id: userA.id,
  requesting_user_id: userB.id
});

// Result: Empty array (hidden)

// But if User A views their own list:
const { data } = await supabase.rpc('get_user_following', {
  target_user_id: userA.id,
  requesting_user_id: userA.id
});

// Result: Full following list (visible)
```

## Integration Examples

### In a Settings Page:
```tsx
export default function SettingsPage() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      {/* Other settings sections */}
      
      {user && <PrivacySettings userId={user.id} />}
    </div>
  );
}
```

### In a Profile Page:
```tsx
export default function ProfilePage({ params }: { params: { username: string } }) {
  const [profileUser, setProfileUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('posts');

  // ... load users ...

  return (
    <div>
      <div className="flex space-x-4 mb-6">
        <button onClick={() => setActiveTab('posts')}>Posts</button>
        <button onClick={() => setActiveTab('following')}>Following</button>
        <button onClick={() => setActiveTab('followers')}>Followers</button>
        <button onClick={() => setActiveTab('friends')}>Friends</button>
      </div>

      {activeTab === 'following' && (
        <UserConnectionsList
          userId={profileUser.id}
          listType="following"
          currentUserId={currentUser?.id}
        />
      )}

      {activeTab === 'followers' && (
        <UserConnectionsList
          userId={profileUser.id}
          listType="followers"
          currentUserId={currentUser?.id}
        />
      )}

      {activeTab === 'friends' && (
        <UserConnectionsList
          userId={profileUser.id}
          listType="friends"
          currentUserId={currentUser?.id}
        />
      )}
    </div>
  );
}
```

## API Reference

### RPC Functions

#### `can_view_user_lists`
Check what lists the requesting user can view.

**Parameters:**
- `target_user_id` (UUID) - The profile being viewed
- `requesting_user_id` (UUID, optional) - The user viewing the profile

**Returns:**
```json
{
  "can_view_following": true,
  "can_view_followers": false,
  "can_view_friends": true
}
```

#### `get_user_following`
Get the list of users that the target user follows.

**Parameters:**
- `target_user_id` (UUID) - The profile being viewed
- `requesting_user_id` (UUID, optional) - The user viewing the profile

**Returns:** Array of user objects with `id`, `username`, `display_name`, `avatar_url`, `bio`, `followed_at`

#### `get_user_followers`
Get the list of users following the target user.

**Parameters:**
- `target_user_id` (UUID) - The profile being viewed
- `requesting_user_id` (UUID, optional) - The user viewing the profile

**Returns:** Array of user objects with `id`, `username`, `display_name`, `avatar_url`, `bio`, `followed_at`

#### `get_user_friends`
Get the list of mutual follows (friends) for the target user.

**Parameters:**
- `target_user_id` (UUID) - The profile being viewed
- `requesting_user_id` (UUID, optional) - The user viewing the profile

**Returns:** Array of user objects with `id`, `username`, `display_name`, `avatar_url`, `bio`, `friends_since`

#### `update_user_profile`
Update user profile including privacy settings.

**New Parameters:**
- `new_hide_following` (boolean, optional)
- `new_hide_followers` (boolean, optional)
- `new_hide_friends` (boolean, optional)

## Testing

### Test Privacy Settings:
1. Log in as User A
2. Go to settings and enable "Hide Following List"
3. Log out and log in as User B
4. Visit User A's profile
5. Try to view following list - should see "This user has hidden their following list"
6. Log back in as User A
7. View your own profile - should see your full following list

### Test Database:
```sql
-- Set privacy for a test user
UPDATE profiles
SET hide_following = true, hide_followers = true
WHERE username = 'testuser';

-- Test RPC as another user
SELECT * FROM get_user_following(
  'test-user-uuid'::uuid,
  'other-user-uuid'::uuid
);
-- Should return empty

-- Test RPC as owner
SELECT * FROM get_user_following(
  'test-user-uuid'::uuid,
  'test-user-uuid'::uuid
);
-- Should return full list
```

## Security Notes

1. **RLS is Maintained:** The privacy functions use SECURITY DEFINER but still respect Row Level Security
2. **Owner Check:** Functions always allow the owner to see their own data
3. **Anonymous Access:** Functions work for anonymous users (they see hidden lists as hidden)
4. **No Data Leakage:** When hidden, no information about list contents is returned

## Styling

The components use Tailwind CSS and match your existing dark theme:
- Purple accent colors (`purple-600`, `purple-700`)
- Dark backgrounds (`gray-800`)
- Smooth transitions and hover effects
- Responsive grid layouts
- Lock icon for private lists

## Future Enhancements

Potential additions:
- **Custom Privacy Levels:** "Friends Only", "Followers Only", "Public"
- **Whitelist/Blacklist:** Allow specific users to see hidden lists
- **Activity Privacy:** Hide recent activity, last seen, etc.
- **Profile Visibility:** Make entire profile private
- **Block List Management:** Integrate with blocking system

