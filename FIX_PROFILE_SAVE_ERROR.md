# Fix: Profile Save Error - Missing Color Columns

## Error
```
Failed to save profile: Profile update failed: Could not find the 'button_color' column of 'profiles' in the schema cache (PGRST204)
```

## Cause
The profiles table is missing the new color customization columns that were added to the code but not yet applied to the database.

## Solution

### Quick Fix (Run SQL)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run This SQL**
   ```sql
   -- Add missing color customization columns
   ALTER TABLE profiles
   ADD COLUMN IF NOT EXISTS button_color TEXT DEFAULT NULL,
   ADD COLUMN IF NOT EXISTS content_text_color TEXT DEFAULT NULL,
   ADD COLUMN IF NOT EXISTS ui_text_color TEXT DEFAULT NULL,
   ADD COLUMN IF NOT EXISTS link_color TEXT DEFAULT NULL;
   ```

4. **Click "Run"**

5. **Verify Success**
   ```sql
   -- Check columns were added
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'profiles' 
   AND column_name IN ('button_color', 'content_text_color', 'ui_text_color', 'link_color');
   ```
   
   Should return 4 rows.

### Alternative: Use the Pre-Made SQL File

Run the file: `APPLY_COLOR_CUSTOMIZATION.sql` in Supabase SQL Editor

## After Applying

1. Refresh your browser
2. Go to Settings → Profile
3. Make any changes
4. Click "Save All Changes"
5. Should save successfully! ✅

## What These Columns Do

- **button_color** - Custom color for buttons and CTAs
- **content_text_color** - Custom color for user content (bio, posts)
- **ui_text_color** - Custom color for UI elements (labels, headings)
- **link_color** - Custom color for clickable links

These allow users to have fine-grained control over their profile colors beyond just the accent color.

## Why This Happened

The color customization columns were added to the code but the database migration wasn't run yet. This is normal during development - just need to apply the migration to sync the database schema with the code.

