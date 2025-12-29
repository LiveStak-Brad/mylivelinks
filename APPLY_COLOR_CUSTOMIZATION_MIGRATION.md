# Apply Profile Color Customization Migration

## Quick Apply via Supabase Dashboard

1. Go to your Supabase SQL Editor:
   https://supabase.com/dashboard/project/dfiyrmqobjfsdsgklweg/sql/new

2. Copy the contents of this file:
   `supabase/migrations/20251229_add_granular_color_customization.sql`

3. Paste into the SQL Editor

4. Click **Run** (or press Ctrl+Enter)

5. You should see: `SUCCESS. No rows returned`

## What This Migration Does

Adds 4 new columns to the `profiles` table:
- `button_color` - Custom color for buttons and CTAs
- `content_text_color` - Custom color for bio, posts, captions
- `ui_text_color` - Custom color for labels, headings, stats
- `link_color` - Custom color for clickable links

All columns are optional (TEXT DEFAULT NULL) and have descriptive comments.

## Verification

After running, verify the columns were added:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('button_color', 'content_text_color', 'ui_text_color', 'link_color');
```

You should see all 4 columns listed.

## Testing

1. Go to Settings → Profile in the app
2. Scroll to "Profile Customization" → "Colors & Typography"
3. You should see 5 color pickers:
   - 🎯 Button Color
   - ✍️ Content Text Color
   - 🏷️ UI Text Color
   - 🔗 Link Color
   - ✨ Accent Color (Highlights)
4. Try a Quick Preset like "💜 Purple Dream"
5. Save and visit your profile
6. Colors should be applied!

## Rollback (if needed)

If something goes wrong, you can rollback:

```sql
ALTER TABLE profiles
DROP COLUMN IF EXISTS button_color,
DROP COLUMN IF EXISTS content_text_color,
DROP COLUMN IF EXISTS ui_text_color,
DROP COLUMN IF EXISTS link_color;
```

