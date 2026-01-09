# Battle System Remaining Issues

## Fixed in This Session ✅
1. **SQL syntax error** - Fixed LIMIT inside jsonb_agg
2. **Column name mismatch** - Changed `supporters` to `supporter_stats`
3. **Duplicate invite blocking** - Now auto-cancels old invites and allows re-sending
4. **Cooldown controls** - Simplified to only show Rematch button
5. **Rematch behavior** - Now sends battle invite without page reload

## Still Need to Fix 🔧

### 1. Gift Points Not Counting
**Issue**: Gifts sent during battle don't award battle points
**Likely Cause**: 
- Battle score RPC may be failing silently
- Check server logs for `/api/battle/score` errors
- Verify `rpc_battle_score_apply` is working

**Debug Steps**:
```bash
# Check if battle_scores row exists for active battle
SELECT * FROM battle_scores WHERE session_id = '<session_id>';

# Check if RPC is being called
# Look for [battle/score] logs in server output
```

### 2. Boost Round Not Working
**Issue**: Boost multiplier not applying to points
**Check**:
- Is boost_active being set correctly?
- Is boost API route working?
- Are boost controls visible in UI?

### 3. Color Orientation Wrong for One Host
**Issue**: Score bar colors showing wrong team for one of the hosts
**Root Cause**: Color orientation is identity-based but may not be flipping correctly for host B
**Location**: `components/battle/BattleScoreSlider.tsx`
**Fix Needed**: Verify team color assignment logic for both hosts

### 4. Rematch Causes Video/Username to Disappear
**Issue**: After rematch, one host's video feed disappears
**Likely Cause**: 
- LiveKit participant not re-subscribing correctly
- Session state not updating properly
- Need to ensure participants stay connected during session type change

### 5. Auto-Return to Cohost After Cooldown
**Issue**: When cooldown timer expires, should auto-convert back to cohost
**Solution**: 
- Created migration `20260109_battle_cooldown_auto_return.sql`
- Need to add timer in frontend to call this RPC when cooldown ends
- Or add database trigger to auto-convert

## Next Steps

1. **Apply new migration**:
   ```bash
   npx supabase db push
   ```

2. **Test gift sending during battle** - Check server logs for errors

3. **Add cooldown timer** - Auto-convert to cohost when timer expires

4. **Fix color orientation** - Ensure both hosts see correct team colors

5. **Debug video disappearing** - Check LiveKit participant state during rematch

## Migration Order
1. `20260108_battle_scores.sql` - Creates battle_scores table
2. `20260109_fix_battle_flow.sql` - Fixes battle flow RPCs
3. `20260109_battle_invite_from_cohost.sql` - Adds battle invite RPCs
4. `20260109_battle_cooldown_auto_return.sql` - Auto-return to cohost
