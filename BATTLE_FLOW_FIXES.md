# Battle Flow Fixes - Applied

## Issues Fixed

### 1. ✅ Score Bar Not Showing
**Problem:** Score bar was only rendering when `scores` object existed, but it wasn't being initialized for new battles.

**Fix:** 
- Modified `battleStates` useMemo to use `scores?.points.A || 0` instead of requiring scores to exist
- Score bar now shows with 0-0 score when battle starts
- Removed the `!scores` check that was preventing rendering

**Files Changed:**
- `components/battle/BattleGridWrapper.tsx` (line 142, 159-160)

---

### 2. ✅ Battle Auto-Starting Instead of Pairing First
**Problem:** When sending a battle invite, the RPC was immediately creating an active battle session with a timer, skipping the cohost pairing phase.

**Fix:**
- Created new migration `20260109_fix_battle_flow.sql`
- Updated `rpc_respond_to_invite` to ALWAYS create cohost sessions first (even for battle invites)
- Battle invites now create cohost sessions, then hosts must click "Start Battle" button
- New RPC `rpc_start_battle_from_cohost` converts cohost → battle when button is clicked
- This RPC also initializes the `battle_scores` table with 0 points

**Files Changed:**
- `supabase/migrations/20260109_fix_battle_flow.sql` (new file)
- `app/api/battle/start/route.ts` (updated to use new RPC)

**Flow Now:**
1. Host A sends battle invite to Host B
2. Host B accepts → creates **cohost** session (not battle)
3. Both hosts are paired and streaming together
4. Either host clicks "Start Battle" button
5. Session converts to battle type, timer starts, scores initialized

---

### 3. ✅ Hosts Kicked Back to Solo After Battle
**Problem:** When battle timer expired, session was ending completely instead of going to cooldown state.

**Fix:**
- Updated `rpc_end_session` to default to 'cooldown' action instead of 'end'
- Cooldown state keeps session active with status='cooldown'
- Hosts remain connected during cooldown
- New RPC `rpc_battle_to_cohost` allows "Stay Paired" to convert back to cohost
- Implemented "Stay Paired" button handler in BattleGridWrapper

**Files Changed:**
- `supabase/migrations/20260109_fix_battle_flow.sql` (updated RPC)
- `components/battle/BattleGridWrapper.tsx` (handleStayPaired implementation)

**Cooldown Flow:**
1. Battle timer expires
2. Session status → 'cooldown' (not 'ended')
3. Hosts see three buttons: Stay Paired, Rematch, Leave
4. Hosts remain connected until they choose an action
5. No auto-disconnect

---

## Database Migration Required

**IMPORTANT:** You must apply the new migration to fix the battle flow:

```bash
# Apply the migration
npx supabase db push
```

Or manually run the SQL from:
`supabase/migrations/20260109_fix_battle_flow.sql`

---

## New RPCs Created

1. **`rpc_start_battle_from_cohost(p_session_id UUID)`**
   - Converts cohost session to battle
   - Sets timer based on mode (60s speed / 180s standard)
   - Initializes battle_scores table with 0 points
   - Returns battle start info

2. **`rpc_battle_to_cohost(p_session_id UUID)`**
   - Converts battle back to cohost (Stay Paired action)
   - Removes timers
   - Keeps hosts connected

3. **Updated `rpc_respond_to_invite`**
   - Now creates cohost sessions for ALL invite types
   - Battle invites no longer auto-start battles

4. **Updated `rpc_end_session`**
   - Defaults to cooldown instead of end
   - Properly handles cooldown timers

---

## Testing Checklist

### Before Testing
- [ ] Apply migration: `npx supabase db push`
- [ ] Verify build passes: `npm run build` ✅ (already verified)

### Test Flow
1. [ ] Host A sends battle invite to Host B
2. [ ] Host B accepts invite
3. [ ] **Verify:** Both hosts paired in cohost mode (NOT battle yet)
4. [ ] **Verify:** "Start Battle" button visible to both hosts
5. [ ] **Verify:** Score bar shows 0-0 (pink/blue colors correct per host)
6. [ ] Either host clicks "Start Battle"
7. [ ] **Verify:** Session converts to battle, timer starts
8. [ ] **Verify:** Score bar still visible with team-relative colors
9. [ ] Send gifts during battle
10. [ ] **Verify:** Scores update in real-time
11. [ ] Wait for timer to expire
12. [ ] **Verify:** Cooldown UI appears (Stay Paired/Rematch/Leave)
13. [ ] **Verify:** Hosts NOT kicked to solo streams
14. [ ] Click "Stay Paired"
15. [ ] **Verify:** Session converts back to cohost
16. [ ] **Verify:** "Start Battle" button reappears

---

## Build Status

✅ **Build Passing** - All TypeScript errors resolved

---

## Summary

All three issues have been fixed:

1. **Score bar rendering** - Fixed by removing null check, defaults to 0 scores
2. **Battle auto-start** - Fixed by creating cohost sessions first, requiring "Start Battle" click
3. **Hosts kicked to solo** - Fixed by implementing cooldown state with Stay Paired option

The battle flow now matches the specification:
- Invite → Pair as cohost → Start Battle button → Active battle → Cooldown → Choose action
