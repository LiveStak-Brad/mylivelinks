# 🔍 Top Friends Settings Not Reflecting - Debug & Fix Guide

## Current Situation
- ✅ Settings UI shows and you can change values
- ✅ Save button seems to work (no errors)
- ❌ Changes don't appear on your profile

## Root Cause
The database columns and RPC function need to be created/updated via SQL migrations.

---

## 🚀 COMPLETE FIX - Step by Step

### Step 1: Run the Test Query
Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Check if columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('show_top_friends', 'top_friends_title', 'top_friends_avatar_style', 'top_friends_max_count')
ORDER BY column_name;
```

**If you get 0 rows:** The columns don't exist yet → Continue to Step 2
**If you get 4 rows:** The columns exist → Skip to Step 3

---

### Step 2: Create the Database Columns

Run this SQL in **Supabase Dashboard → SQL Editor**:

```sql
-- ============================================================================
-- Top Friends Customization Fields Migration
-- ============================================================================

-- Add top friends customization fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_top_friends BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS top_friends_title TEXT DEFAULT 'Top Friends',
  ADD COLUMN IF NOT EXISTS top_friends_avatar_style TEXT DEFAULT 'square' CHECK (top_friends_avatar_style IN ('circle', 'square')),
  ADD COLUMN IF NOT EXISTS top_friends_max_count INTEGER DEFAULT 8 CHECK (top_friends_max_count >= 1 AND top_friends_max_count <= 8);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_show_top_friends ON profiles(show_top_friends) WHERE show_top_friends = true;

-- Add comments for documentation
COMMENT ON COLUMN profiles.show_top_friends IS 'Whether to display the Top Friends section on profile';
COMMENT ON COLUMN profiles.top_friends_title IS 'Custom title for the Top Friends section';
COMMENT ON COLUMN profiles.top_friends_avatar_style IS 'Avatar display style: circle or square';
COMMENT ON COLUMN profiles.top_friends_max_count IS 'Maximum number of friends to display (1-8)';

-- Verify
SELECT '✅ Top Friends columns created successfully!' AS status;
```

---

### Step 3: Update the RPC Function

Run this SQL in **Supabase Dashboard → SQL Editor**:

```sql
-- ============================================================================
-- Update get_profile_bundle RPC to include Top Friends fields
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_profile_bundle(text, uuid, text);

CREATE OR REPLACE FUNCTION public.get_profile_bundle(
  p_username text,
  p_viewer_id uuid DEFAULT NULL,
  p_platform text DEFAULT 'web'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_profile record;
  v_featured_links json;
  v_blocks json;
  v_blocks_jsonb jsonb;
  v_profile_blocks_jsonb jsonb;
  v_profile_content_blocks_jsonb jsonb;
  v_profile_content_grouped_jsonb jsonb;
BEGIN
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.created_at,
    p.is_live,
    COALESCE(p.profile_type::text, 'creator') AS profile_type,

    p.profile_bg_url,
    p.profile_bg_overlay,
    p.card_color,
    p.card_opacity,
    p.card_border_radius,
    p.font_preset,
    p.accent_color,
    p.links_section_title,

    p.hide_streaming_stats,

    -- Top Friends customization fields (NEW!)
    COALESCE(p.show_top_friends, true) AS show_top_friends,
    COALESCE(p.top_friends_title, 'Top Friends') AS top_friends_title,
    COALESCE(p.top_friends_avatar_style, 'square') AS top_friends_avatar_style,
    COALESCE(p.top_friends_max_count, 8) AS top_friends_max_count,

    p.social_instagram,
    p.social_twitter,
    p.social_youtube,
    p.social_tiktok,
    p.social_facebook,
    p.social_twitch,
    p.social_discord,
    p.social_snapchat,
    p.social_linkedin,
    p.social_github,
    p.social_spotify,
    p.social_onlyfans,

    CASE WHEN p_viewer_id = p.id THEN p.coin_balance ELSE NULL END AS coin_balance,
    CASE WHEN p_viewer_id = p.id THEN p.earnings_balance ELSE NULL END AS earnings_balance
  INTO v_profile
  FROM public.profiles p
  WHERE lower(p.username) = lower(p_username)
  LIMIT 1;

  IF v_profile.id IS NULL THEN
    RETURN json_build_object('error', 'Profile not found');
  END IF;

  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', ul.id,
        'title', ul.title,
        'url', ul.url,
        'icon', ul.icon,
        'click_count', ul.click_count,
        'display_order', ul.display_order
      )
      ORDER BY ul.display_order, ul.id
    ),
    '[]'::json
  )
  INTO v_featured_links
  FROM public.user_links ul
  WHERE ul.profile_id = v_profile.id
    AND ul.is_active = TRUE
    AND COALESCE(ul.is_adult, FALSE) = FALSE;

  v_profile_content_blocks_jsonb := '[]'::jsonb;
  v_profile_content_grouped_jsonb := '{}'::jsonb;
  
  BEGIN
    PERFORM 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profile_content_blocks';

    IF FOUND THEN
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', pcb.id,
            'block_type', pcb.block_type,
            'title', pcb.title,
            'url', pcb.url,
            'metadata', pcb.metadata,
            'sort_order', pcb.sort_order,
            'created_at', pcb.created_at,
            'updated_at', pcb.updated_at
          )
          ORDER BY pcb.sort_order, pcb.id
        ),
        '[]'::jsonb
      )
      INTO v_profile_content_blocks_jsonb
      FROM public.profile_content_blocks pcb
      WHERE pcb.profile_id = v_profile.id;

      WITH rows AS (
        SELECT
          pcb.block_type,
          jsonb_build_object(
            'id', pcb.id,
            'block_type', pcb.block_type,
            'title', pcb.title,
            'url', pcb.url,
            'metadata', pcb.metadata,
            'sort_order', pcb.sort_order,
            'created_at', pcb.created_at,
            'updated_at', pcb.updated_at
          ) AS item,
          pcb.sort_order,
          pcb.id
        FROM public.profile_content_blocks pcb
        WHERE pcb.profile_id = v_profile.id
      ),
      grouped AS (
        SELECT
          block_type,
          jsonb_agg(item ORDER BY sort_order NULLS LAST, id NULLS LAST) AS arr
        FROM rows
        GROUP BY block_type
      )
      SELECT COALESCE(jsonb_object_agg(block_type, arr), '{}'::jsonb)
      INTO v_profile_content_grouped_jsonb
      FROM grouped;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN NULL;
  END;

  v_blocks := json_build_object(
    'schedule_items', '[]'::json,
    'clips', '[]'::json,
    'tracks', '[]'::json,
    'shows', '[]'::json,
    'merch', '[]'::json,
    'presskit_links', '[]'::json,
    'services', '[]'::json,
    'products', '[]'::json,
    'booking_link', NULL,
    'featured_links', v_featured_links,
    'content_blocks', v_profile_content_blocks_jsonb::json,
    'blocks_by_type', v_profile_content_grouped_jsonb::json,
    'posts', '[]'::json
  );

  v_blocks_jsonb := to_jsonb(v_blocks);
  v_blocks_jsonb := v_blocks_jsonb || COALESCE(v_profile_content_grouped_jsonb, '{}'::jsonb);

  BEGIN
    PERFORM 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profile_blocks';

    IF FOUND THEN
      EXECUTE $q$
        WITH rows AS (
          SELECT
            pb.block_type,
            jsonb_build_object(
              'id', pb.id,
              'block_type', pb.block_type,
              'data', pb.data,
              'sort_order', pb.sort_order,
              'created_at', pb.created_at
            ) AS item,
            pb.sort_order,
            pb.created_at
          FROM public.profile_blocks pb
          WHERE pb.profile_id = $1
        ),
        grouped AS (
          SELECT
            block_type,
            jsonb_agg(item ORDER BY sort_order NULLS LAST, created_at NULLS LAST) AS arr
          FROM rows
          GROUP BY block_type
        )
        SELECT COALESCE(jsonb_object_agg(block_type, arr), '{}'::jsonb) FROM grouped
      $q$
      INTO v_profile_blocks_jsonb
      USING v_profile.id;

      v_blocks_jsonb := v_blocks_jsonb || COALESCE(v_profile_blocks_jsonb, '{}'::jsonb);
    END IF;
  EXCEPTION
    WHEN undefined_table THEN NULL;
  END;

  RETURN json_build_object(
    'profile', row_to_json(v_profile),
    'blocks', v_blocks_jsonb::json
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_bundle(text, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_profile_bundle(text, uuid, text) TO authenticated;

-- Verify
SELECT '✅ RPC function updated successfully!' AS status;
```

---

### Step 4: Clear Browser Cache & Test

1. **Hard refresh your browser**: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Go to **Settings → Profile**
3. Make changes:
   - Change title to "Top G's"
   - Switch to circle avatars
   - Set max count to 6
4. Click **"Save All Changes"**
5. **Wait for "Saved!" confirmation**
6. Go to your profile page
7. **Hard refresh again**: `Ctrl + Shift + R`
8. Check if changes appear!

---

### Step 5: Verify in Database (Optional)

To confirm the data was saved, run in SQL Editor:

```sql
-- Replace 'your-username' with your actual username
SELECT 
  username,
  show_top_friends,
  top_friends_title,
  top_friends_avatar_style,
  top_friends_max_count
FROM profiles
WHERE username = 'your-username';
```

---

## ✅ Success Indicators

After completing all steps, you should see:
- ✅ Custom title appears on profile
- ✅ Circle/square avatars render correctly
- ✅ Grid shows only the max count you set
- ✅ Grid auto-centers properly
- ✅ No empty placeholder boxes

---

## 🐛 Still Not Working?

If it still doesn't work after all steps:

1. **Check browser console** (F12) for errors
2. **Check Network tab** - does the API return the new fields?
3. **Verify save** - Check the database query above
4. **Try incognito mode** - Rules out browser extensions

---

## 📋 Quick Checklist

- [ ] Step 1: Test query shows 4 columns exist
- [ ] Step 2: Columns created (if needed)
- [ ] Step 3: RPC function updated
- [ ] Step 4: Browser cache cleared (hard refresh)
- [ ] Step 5: Changes saved in settings
- [ ] Step 6: Profile refreshed and shows changes

All SQL ready to copy/paste from the files in your `sql/` folder! 🚀

