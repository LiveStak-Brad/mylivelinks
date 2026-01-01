# LINK SYSTEM VERIFICATION CHECKLIST

This document provides SQL queries to verify the complete Link system implementation.

## ✅ VERIFICATION STEPS

### 1. Verify Tables Created

```sql
-- Check all Link system tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'link_profiles',
    'link_settings',
    'link_decisions',
    'link_mutuals',
    'dating_profiles',
    'dating_decisions',
    'dating_matches',
    'link_events'
  )
ORDER BY table_name;
```

**Expected:** 8 tables listed

---

### 2. Verify RLS Policies

```sql
-- Check RLS policies for Link system tables
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN (
  'link_profiles',
  'link_settings',
  'link_decisions',
  'link_mutuals',
  'dating_profiles',
  'dating_decisions',
  'dating_matches',
  'link_events'
)
ORDER BY tablename, policyname;
```

**Expected:** Multiple policies per table for select/insert/update

---

### 3. Verify RPCs Created

```sql
-- Check all Link system RPCs exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'rpc_upsert_link_profile',
    'rpc_upsert_link_settings',
    'rpc_get_link_candidates',
    'rpc_submit_link_decision',
    'rpc_get_my_mutuals',
    'rpc_upsert_dating_profile',
    'rpc_get_dating_candidates',
    'rpc_submit_dating_decision',
    'rpc_get_my_dating_matches',
    'rpc_handle_follow_event',
    'is_link_mutual',
    'is_dating_match'
  )
ORDER BY routine_name;
```

**Expected:** 12 functions listed

---

### 4. Verify Indexes Created

```sql
-- Check indexes on Link system tables
SELECT 
  tablename, 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename IN (
  'link_profiles',
  'link_settings',
  'link_decisions',
  'link_mutuals',
  'dating_profiles',
  'dating_decisions',
  'dating_matches',
  'link_events'
)
ORDER BY tablename, indexname;
```

**Expected:** Multiple indexes per table for performance

---

## 🧪 FUNCTIONAL TESTS

### Test 1: Link Profile Upsert

```sql
-- Test creating/updating a link profile
SELECT rpc_upsert_link_profile(
  p_enabled := true,
  p_bio := 'Looking for cool people to connect with!',
  p_location_text := 'Los Angeles, CA',
  p_photos := '["photo1.jpg", "photo2.jpg"]'::jsonb,
  p_tags := '["music", "art", "tech"]'::jsonb
);
```

**Expected:** Returns jsonb with profile data

**Verify:**
```sql
SELECT * FROM link_profiles WHERE profile_id = auth.uid();
```

---

### Test 2: Link Settings Upsert

```sql
-- Test creating/updating link settings
SELECT rpc_upsert_link_settings(
  p_auto_link_on_follow := true,
  p_auto_link_require_approval := false,
  p_auto_link_policy := 'everyone'
);
```

**Expected:** Returns jsonb with settings data

**Verify:**
```sql
SELECT * FROM link_settings WHERE profile_id = auth.uid();
```

---

### Test 3: Get Link Candidates

```sql
-- Test fetching link candidates
SELECT rpc_get_link_candidates(
  p_limit := 20,
  p_offset := 0
);
```

**Expected:** Returns jsonb array of enabled profiles (excluding self and decided)

**Verify candidate filtering:**
```sql
-- Check that returned candidates:
-- 1. Have enabled = true
-- 2. Are not the current user
-- 3. Have not been decided on yet

SELECT 
  lp.profile_id,
  lp.enabled,
  EXISTS(
    SELECT 1 FROM link_decisions 
    WHERE from_profile_id = auth.uid() 
      AND to_profile_id = lp.profile_id
  ) as already_decided
FROM link_profiles lp
WHERE lp.profile_id != auth.uid()
  AND lp.enabled = true
LIMIT 5;
```

---

### Test 4: Submit Link Decision & Create Mutual

```sql
-- Test 1: User A decides "link" on User B
-- (Run as User A)
SELECT rpc_submit_link_decision(
  p_to_profile_id := 'USER_B_UUID_HERE',
  p_decision := 'link'
);
```

**Expected:** Returns `{"mutual": false, "decision": "link"}` (no mutual yet)

```sql
-- Test 2: User B decides "link" on User A
-- (Run as User B)
SELECT rpc_submit_link_decision(
  p_to_profile_id := 'USER_A_UUID_HERE',
  p_decision := 'link'
);
```

**Expected:** Returns `{"mutual": true, "decision": "link"}` (mutual created!)

**Verify mutual created:**
```sql
SELECT * FROM link_mutuals 
WHERE (profile_a = 'USER_A_UUID' AND profile_b = 'USER_B_UUID')
   OR (profile_a = 'USER_B_UUID' AND profile_b = 'USER_A_UUID');
```

**Expected:** 1 row with source = 'manual'

**Verify events created:**
```sql
SELECT * FROM link_events
WHERE event_type = 'link_mutual_created'
  AND (actor_profile_id IN ('USER_A_UUID', 'USER_B_UUID')
   OR target_profile_id IN ('USER_A_UUID', 'USER_B_UUID'))
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** 2 events (one for each user)

---

### Test 5: Get My Mutuals

```sql
-- Test fetching current user's mutuals
SELECT rpc_get_my_mutuals(
  p_limit := 50,
  p_offset := 0
);
```

**Expected:** Returns jsonb array of mutual connections with profile data

**Verify:**
```sql
SELECT 
  CASE 
    WHEN profile_a = auth.uid() THEN profile_b
    WHEN profile_b = auth.uid() THEN profile_a
  END as other_profile_id,
  source,
  created_at
FROM link_mutuals
WHERE auth.uid() IN (profile_a, profile_b)
ORDER BY created_at DESC;
```

---

### Test 6: Dating Profile Upsert

```sql
-- Test creating/updating a dating profile
SELECT rpc_upsert_dating_profile(
  p_enabled := true,
  p_bio := 'Looking for meaningful connections',
  p_location_text := 'San Francisco, CA',
  p_photos := '["photo1.jpg", "photo2.jpg", "photo3.jpg"]'::jsonb,
  p_prefs := '{"age_min": 25, "age_max": 35, "distance": 50}'::jsonb
);
```

**Expected:** Returns jsonb with dating profile data

**Verify:**
```sql
SELECT * FROM dating_profiles WHERE profile_id = auth.uid();
```

---

### Test 7: Get Dating Candidates

```sql
-- Test fetching dating candidates
SELECT rpc_get_dating_candidates(
  p_limit := 20,
  p_offset := 0
);
```

**Expected:** Returns jsonb array of enabled dating profiles (excluding self and decided)

---

### Test 8: Submit Dating Decision & Create Match

```sql
-- Test 1: User A decides "like" on User B
-- (Run as User A)
SELECT rpc_submit_dating_decision(
  p_to_profile_id := 'USER_B_UUID_HERE',
  p_decision := 'like'
);
```

**Expected:** Returns `{"match": false, "decision": "like"}` (no match yet)

```sql
-- Test 2: User B decides "like" on User A
-- (Run as User B)
SELECT rpc_submit_dating_decision(
  p_to_profile_id := 'USER_A_UUID_HERE',
  p_decision := 'like'
);
```

**Expected:** Returns `{"match": true, "decision": "like"}` (match created!)

**Verify match created:**
```sql
SELECT * FROM dating_matches 
WHERE (profile_a = 'USER_A_UUID' AND profile_b = 'USER_B_UUID')
   OR (profile_a = 'USER_B_UUID' AND profile_b = 'USER_A_UUID');
```

**Expected:** 1 row

**Verify events created:**
```sql
SELECT * FROM link_events
WHERE event_type = 'dating_match_created'
  AND (actor_profile_id IN ('USER_A_UUID', 'USER_B_UUID')
   OR target_profile_id IN ('USER_A_UUID', 'USER_B_UUID'))
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** 2 events (one for each user)

---

### Test 9: Get My Dating Matches

```sql
-- Test fetching current user's dating matches
SELECT rpc_get_my_dating_matches(
  p_limit := 50,
  p_offset := 0
);
```

**Expected:** Returns jsonb array of dating matches with profile data

---

### Test 10: Auto-Link Follow Event Handler (Placeholder)

```sql
-- Setup: Create two test users with link profiles enabled and auto-link setting
-- User A: Enable link profile + auto_link_on_follow = true
-- User B: Enable link profile

-- Test: Simulate User B following User A
SELECT rpc_handle_follow_event(
  p_follower_id := 'USER_B_UUID_HERE',
  p_followed_id := 'USER_A_UUID_HERE'
);
```

**Expected:** Returns `{"created": true, "reason": "auto_link_created"}`

**Verify mutual created:**
```sql
SELECT * FROM link_mutuals 
WHERE (profile_a = 'USER_A_UUID' AND profile_b = 'USER_B_UUID')
   OR (profile_a = 'USER_B_UUID' AND profile_b = 'USER_A_UUID')
  AND source = 'auto_follow';
```

**Expected:** 1 row with source = 'auto_follow'

**Test idempotency (run again):**
```sql
SELECT rpc_handle_follow_event(
  p_follower_id := 'USER_B_UUID_HERE',
  p_followed_id := 'USER_A_UUID_HERE'
);
```

**Expected:** Returns `{"created": false, "reason": "already_exists"}`

---

## 🔒 SECURITY TESTS

### Test 1: Cannot Decide on Yourself

```sql
-- Should fail with error
SELECT rpc_submit_link_decision(
  p_to_profile_id := auth.uid(),
  p_decision := 'link'
);
```

**Expected:** ERROR: "Cannot decide on yourself"

---

### Test 2: Cannot See Others' Decisions

```sql
-- Try to select another user's decisions directly
SELECT * FROM link_decisions 
WHERE from_profile_id != auth.uid()
LIMIT 1;
```

**Expected:** 0 rows (RLS blocks)

---

### Test 3: Cannot Manually Insert Mutuals

```sql
-- Should fail due to RLS (no insert policy)
INSERT INTO link_mutuals (profile_a, profile_b, source)
VALUES (auth.uid(), 'SOME_OTHER_UUID', 'manual');
```

**Expected:** ERROR: "new row violates row-level security policy"

---

### Test 4: Can Only See Own Events

```sql
-- Should only return events where target = current user
SELECT * FROM link_events
WHERE target_profile_id != auth.uid();
```

**Expected:** 0 rows (RLS blocks)

---

## 🔍 HELPER FUNCTION TESTS

### Test: is_link_mutual

```sql
-- Check if two profiles are mutuals
SELECT is_link_mutual(
  'USER_A_UUID_HERE',
  'USER_B_UUID_HERE'
);
```

**Expected:** Returns `true` or `false`

---

### Test: is_dating_match

```sql
-- Check if two profiles are dating matches
SELECT is_dating_match(
  'USER_A_UUID_HERE',
  'USER_B_UUID_HERE'
);
```

**Expected:** Returns `true` or `false`

---

## 📊 DATA INTEGRITY CHECKS

### Check 1: No Self-Links

```sql
-- Should return 0 rows
SELECT * FROM link_decisions 
WHERE from_profile_id = to_profile_id;

SELECT * FROM dating_decisions 
WHERE from_profile_id = to_profile_id;
```

**Expected:** 0 rows for both

---

### Check 2: Mutuals Are Properly Ordered

```sql
-- Should return 0 rows (all mutuals should have profile_a < profile_b)
SELECT * FROM link_mutuals 
WHERE profile_a >= profile_b;

SELECT * FROM dating_matches 
WHERE profile_a >= profile_b;
```

**Expected:** 0 rows for both

---

### Check 3: Photos Array Length

```sql
-- Should return 0 rows (max 5 photos constraint)
SELECT * FROM link_profiles 
WHERE jsonb_array_length(photos) > 5;

SELECT * FROM dating_profiles 
WHERE jsonb_array_length(photos) > 5;
```

**Expected:** 0 rows for both

---

### Check 4: Valid Decision Values

```sql
-- Should return 0 rows (only 'link'/'nah' allowed)
SELECT * FROM link_decisions 
WHERE decision NOT IN ('link', 'nah');

-- Should return 0 rows (only 'like'/'nah' allowed)
SELECT * FROM dating_decisions 
WHERE decision NOT IN ('like', 'nah');
```

**Expected:** 0 rows for both

---

## ✅ COMPLETION CHECKLIST

- [ ] All 8 tables created
- [ ] All RLS policies active
- [ ] All 12 RPCs callable
- [ ] All indexes created
- [ ] Link profile upsert works
- [ ] Link settings upsert works
- [ ] Link candidates fetch works
- [ ] Manual mutual creation works (both users swipe "link")
- [ ] Dating profile upsert works
- [ ] Dating candidates fetch works
- [ ] Dating match creation works (both users swipe "like")
- [ ] Auto-link placeholder RPC works
- [ ] Security constraints enforced (no self-decisions, RLS blocks)
- [ ] Data integrity maintained (ordered pairs, valid enums)
- [ ] Events created for mutuals/matches
- [ ] Helper functions work (is_link_mutual, is_dating_match)

---

## 🚧 PENDING: AUTO-LINK INTEGRATION

**REQUIRED BEFORE IMPLEMENTING AUTO-LINK TRIGGER:**

Need follow schema information:
1. Table name(s) where follows are stored
2. Column names (follower_id, followed_id, etc.)
3. Where follow inserts occur (app layer or DB?)
4. Whether DB triggers or app-layer events are preferred

**Integration options:**
- **Option A (DB Trigger):** Create trigger on follows table to call `rpc_handle_follow_event`
- **Option B (App Layer):** Call `handleFollowEvent()` from Next.js after follow creation

**Next steps:**
1. Provide follow schema
2. Choose integration approach
3. Implement auto-link trigger/handler
4. Test complete auto-link flow

---

## 📝 NOTES

- All RPCs use `SECURITY DEFINER` to bypass RLS when needed
- Mutuals/matches use ordered pairs (LEAST/GREATEST) for deduplication
- Photo arrays limited to 5 items via CHECK constraint
- Decisions are idempotent (upsert on conflict)
- Events table stores notifications for UI
- Realtime subscriptions available in `lib/link/api.ts`
