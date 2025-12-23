# Deployment Checklist: Coins→Diamonds Economy

## Pre-Deployment

### 1. Database Schema
- [ ] Run `database_schema.sql` (if not already deployed)
- [ ] Run `schema_extensions_coins_diamonds.sql` to extend schema
- [ ] Verify all tables created: `diamond_conversions`, `gifter_levels`
- [ ] Verify columns added: `gifter_level`, `asset_type`, `diamond_amount`
- [ ] Verify RPC functions created: `convert_diamonds_to_coins`, updated `process_gift`
- [ ] Verify triggers created: `trigger_gifter_level_update`

### 2. Data Migration (if existing data)
- [ ] Backfill `diamond_amount` in existing `gifts` table
- [ ] Update existing profiles with `gifter_level` based on `total_spent`
- [ ] Update existing ledger entries with `asset_type = 'coin'`
- [ ] Verify no data loss

### 3. RLS Policies
- [ ] Verify RLS enabled on `diamond_conversions`
- [ ] Verify RLS policies allow RPC functions to insert
- [ ] Test direct inserts are blocked (should fail)

### 4. Indexes
- [ ] Verify indexes created on new tables
- [ ] Verify composite indexes for hot queries
- [ ] Run `ANALYZE` on new tables

---

## Deployment Steps

### Step 1: Database Migration
```bash
# Connect to Supabase PostgreSQL
psql -h [your-supabase-host] -U postgres -d postgres

# Run schema extensions
\i schema_extensions_coins_diamonds.sql

# Verify
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('diamond_conversions', 'gifter_levels');
```

### Step 2: Verify RPC Functions
```sql
-- Test convert function
SELECT convert_diamonds_to_coins('test-user-id', 100);

-- Test gift function
SELECT process_gift('sender-id', 'recipient-id', 1, NULL, NULL);

-- Test level update
SELECT update_gifter_level('user-id');
```

### Step 3: Deploy Frontend
- [ ] Deploy `GiftModal.tsx` component
- [ ] Deploy `DiamondConversion.tsx` component
- [ ] Deploy `GifterBadge.tsx` component
- [ ] Deploy updated `Tile.tsx` component
- [ ] Update profile/settings page with conversion UI

### Step 4: Update API Routes (if using)
- [ ] Update gift endpoint to use `process_gift` RPC
- [ ] Add conversion endpoint using `convert_diamonds_to_coins` RPC
- [ ] Add gifter level lookup endpoint

---

## Post-Deployment

### 1. Cron Jobs (Supabase)

#### A. Publish State Updates (Every 10-15 seconds)
```sql
-- Create cron job for publish state
SELECT cron.schedule(
  'update-publish-state',
  '*/15 * * * * *', -- Every 15 seconds
  $$SELECT update_publish_state_from_viewers()$$
);
```

#### B. Stale Viewer Cleanup (Every 30-60 seconds)
```sql
-- Create cron job for cleanup
SELECT cron.schedule(
  'cleanup-stale-viewers',
  '*/45 * * * * *', -- Every 45 seconds
  $$SELECT cleanup_stale_viewers()$$
);
```

#### C. Leaderboard Refresh (Hourly/Daily)
```sql
-- Daily leaderboards (every hour)
SELECT cron.schedule(
  'refresh-daily-leaderboards',
  '0 * * * *', -- Every hour
  $$SELECT refresh_leaderboard_cache('daily')$$
);

-- Weekly leaderboards (every 6 hours)
SELECT cron.schedule(
  'refresh-weekly-leaderboards',
  '0 */6 * * *', -- Every 6 hours
  $$SELECT refresh_leaderboard_cache('weekly')$$
);

-- All-time leaderboards (daily)
SELECT cron.schedule(
  'refresh-alltime-leaderboards',
  '0 0 * * *', -- Daily at midnight
  $$SELECT refresh_leaderboard_cache('alltime')$$
);
```

### 2. Service Role Permissions

Ensure service role can call RPC functions:

```sql
-- Grant execute on RPC functions to service_role
GRANT EXECUTE ON FUNCTION convert_diamonds_to_coins TO service_role;
GRANT EXECUTE ON FUNCTION process_gift TO service_role;
GRANT EXECUTE ON FUNCTION update_gifter_level TO service_role;
GRANT EXECUTE ON FUNCTION update_publish_state_from_viewers TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_stale_viewers TO service_role;
GRANT EXECUTE ON FUNCTION update_coin_balance_via_ledger TO service_role;
```

### 3. Real-time Subscriptions

Enable real-time for balance updates:

```typescript
// Frontend: Subscribe to balance changes
const channel = supabase
  .channel('balance-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'profiles',
    filter: `id=eq.${userId}`,
  }, (payload) => {
    // Update UI
  })
  .subscribe();
```

---

## Monitoring

### 1. Key Metrics to Track
- [ ] Gift transaction volume (coins → diamonds)
- [ ] Conversion volume (diamonds → coins)
- [ ] Platform fee revenue (30% of conversions)
- [ ] Average gifter level distribution
- [ ] Conversion rate (diamonds converted / diamonds earned)

### 2. Alerts
- [ ] Failed gift transactions
- [ ] Failed conversions
- [ ] Balance discrepancies (ledger vs cached)
- [ ] High-value purchase approvals (> $25k)

### 3. Logging
- [ ] Log all gift transactions
- [ ] Log all conversions
- [ ] Log level updates
- [ ] Log errors with context

---

## Rollback Plan

If issues occur:

1. **Disable new features:**
   ```sql
   -- Disable conversion (set minimum to very high)
   ALTER FUNCTION convert_diamonds_to_coins SET search_path = '';
   
   -- Or add feature flag
   UPDATE app_config SET conversion_enabled = false;
   ```

2. **Revert frontend:**
   - Remove gift/conversion UI components
   - Revert to old gift flow (if needed)

3. **Data integrity:**
   - Verify ledger balances match cached balances
   - Check for orphaned records
   - Verify no negative balances

---

## Testing in Production

### Smoke Tests
- [ ] Send test gift (small amount)
- [ ] Convert test diamonds (minimum 3)
- [ ] Verify balances update
- [ ] Verify gifter level updates
- [ ] Verify UI displays correctly

### Load Tests
- [ ] 100 concurrent gifts
- [ ] 50 concurrent conversions
- [ ] Verify no deadlocks
- [ ] Verify performance acceptable

---

## Documentation Updates

- [ ] Update API documentation with new RPCs
- [ ] Update user-facing docs (how to convert diamonds)
- [ ] Update admin docs (gifter level thresholds)
- [ ] Update deployment runbook

---

## Success Criteria

✅ All tests pass  
✅ No data loss  
✅ Balances accurate  
✅ Gifter levels display correctly  
✅ Conversions work with 30% fee  
✅ Real-time updates work  
✅ Performance acceptable  
✅ Monitoring in place  

---

## Support Contacts

- **Database Issues:** [DBA contact]
- **Frontend Issues:** [Frontend lead]
- **Payment Issues:** [Payment team]

---

**Deployment Date:** ___________  
**Deployed By:** ___________  
**Verified By:** ___________







