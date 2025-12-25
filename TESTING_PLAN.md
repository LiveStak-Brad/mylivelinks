# Testing Plan: Coins→Diamonds Economy + Gifter Levels

## 1. Gifting Flow

### Test Case 1.1: Send Gift (Coins → Diamonds)
**Steps:**
1. User A has 1000 coins, 0 diamonds
2. User B has 0 coins, 0 diamonds
3. User A sends 100 coin gift to User B
4. Verify:
   - User A: `coin_balance = 900`, `total_spent = 100`
   - User B: `earnings_balance = 100` (diamonds)
   - Ledger entries created for both
   - Gift record created with `diamond_amount = 100`

**Expected:** ✅ 1:1 conversion (coins spent = diamonds earned)

---

### Test Case 1.2: Insufficient Coins
**Steps:**
1. User A has 50 coins
2. Try to send 100 coin gift
3. Verify: Error "Insufficient coin balance"

**Expected:** ✅ Error returned, no balances changed

---

### Test Case 1.3: Multiple Gifts
**Steps:**
1. User A sends 3 gifts: 50, 100, 200 coins
2. Verify:
   - User A: `coin_balance` decreased by 350
   - Recipient: `earnings_balance` increased by 350 (diamonds)
   - 3 gift records created

**Expected:** ✅ All gifts processed correctly

---

## 2. Diamond Conversion Flow

### Test Case 2.1: Convert Diamonds to Coins (30% Fee)
**Steps:**
1. User has 100 diamonds, 0 coins
2. Convert 100 diamonds
3. Verify:
   - User: `earnings_balance = 0`, `coin_balance = 70`
   - Conversion record: `diamonds_in = 100`, `coins_out = 70`, `fee_amount = 30`
   - Ledger entries: convert_out (-100 diamonds), convert_in (+70 coins), convert_fee (30)

**Expected:** ✅ 70% conversion rate, 30% platform fee

---

### Test Case 2.2: Minimum Threshold
**Steps:**
1. User has 5 diamonds
2. Try to convert 2 diamonds
3. Verify: Error "Minimum 3 diamonds required"

**Expected:** ✅ Error, conversion blocked

---

### Test Case 2.3: Partial Conversion
**Steps:**
1. User has 1000 diamonds
2. Convert 100 diamonds (multiple times)
3. Verify:
   - Each conversion: 100 → 70 coins
   - Balance updates correctly each time
   - Can convert down to 0 (if >= 3 remaining)

**Expected:** ✅ Multiple conversions work, balances accurate

---

### Test Case 2.4: Edge Case: Exactly 3 Diamonds
**Steps:**
1. User has 3 diamonds
2. Convert 3 diamonds
3. Verify: `coins_out = floor(3 * 0.70) = 2 coins`

**Expected:** ✅ Minimum conversion works, yields 2 coins

---

## 3. Gifter Levels

### Test Case 3.1: Level Progression
**Steps:**
1. User starts at level 0 (0 coins spent)
2. Send gifts totaling:
   - 50 coins → Level 0 (below 100)
   - 100 coins → Level 1
   - 500 coins → Level 2
   - 1500 coins → Level 3
3. Verify: `gifter_level` updates automatically via trigger

**Expected:** ✅ Level updates match `gifter_levels` thresholds

---

### Test Case 3.2: Level Badge Display
**Steps:**
1. User has level 5 (10,000+ coins spent)
2. Load profile/tile/chat
3. Verify: Badge shows "Diamond Gifter" with correct color

**Expected:** ✅ Badge displays correctly in all locations

---

### Test Case 3.3: Level Config Update
**Steps:**
1. Update `gifter_levels` table (change thresholds)
2. Call `update_gifter_level()` for existing users
3. Verify: Levels recalculate correctly

**Expected:** ✅ System adapts to new thresholds without refactoring

---

## 4. Publish/Unpublish Flow

### Test Case 4.1: Demand-Based Publishing
**Steps:**
1. Streamer clicks "Go Live" → `live_available = true`, `is_published = false`
2. Viewer opens streamer's tile → `active_viewers` record created
3. Verify: `is_published = true` (via `update_publish_state_from_viewers()`)
4. Viewer closes tile → `active_viewers` removed
5. Verify: `is_published = false` if last viewer

**Expected:** ✅ Publishing only when actively watched

---

### Test Case 4.2: Heartbeat Timeout
**Steps:**
1. Viewer opens tile (heartbeat every 10-15 seconds)
2. Simulate disconnect (stop heartbeat)
3. Wait 60+ seconds
4. Run `cleanup_stale_viewers()`
5. Verify: Viewer removed, publish state updated

**Expected:** ✅ Stale viewers cleaned up, streams unpublish

---

## 5. Concurrent Transactions

### Test Case 5.1: Concurrent Gifts
**Steps:**
1. User A has 200 coins
2. Send 2 gifts simultaneously (100 coins each)
3. Verify: Both succeed, `coin_balance = 0`, ledger accurate

**Expected:** ✅ Row locking prevents race conditions

---

### Test Case 5.2: Concurrent Conversions
**Steps:**
1. User has 200 diamonds
2. Convert 100 diamonds twice simultaneously
3. Verify: Both succeed, `earnings_balance = 0`, `coin_balance = 140`

**Expected:** ✅ Atomic transactions prevent double-spending

---

## 6. Edge Cases

### Test Case 6.1: Zero Balances
**Steps:**
1. User has 0 coins, 0 diamonds
2. Try to send gift → Error
3. Try to convert → Error
4. Verify: No negative balances possible

**Expected:** ✅ CHECK constraints prevent negatives

---

### Test Case 6.2: Large Values (Whale Testing)
**Steps:**
1. User purchases $25,000 coin pack
2. Send large gifts (10,000+ coins)
3. Convert large diamond amounts (50,000+)
4. Verify: BIGINT handles large values, no overflow

**Expected:** ✅ System handles whale-level transactions

---

## 7. UI/UX Testing

### Test Case 7.1: Gift Modal
**Steps:**
1. Click gift button on tile
2. Select gift type
3. Confirm send
4. Verify: Modal closes, balance updates, chat event appears

**Expected:** ✅ Smooth UX, real-time updates

---

### Test Case 7.2: Conversion UI
**Steps:**
1. Open profile/settings
2. Enter diamond amount
3. See preview (coins out + fee)
4. Confirm conversion
5. Verify: Balances update, success message shown

**Expected:** ✅ Clear fee display, instant feedback

---

## 8. Integration Testing

### Test Case 8.1: Full Flow: Purchase → Gift → Convert
**Steps:**
1. Purchase 1000 coins
2. Send 500 coin gift → recipient gets 500 diamonds
3. Recipient converts 500 diamonds → gets 350 coins
4. Recipient sends 350 coin gift → new recipient gets 350 diamonds
5. Verify: All balances accurate, ledger complete

**Expected:** ✅ Full economy cycle works correctly

---

### Test Case 8.2: Leaderboard Updates
**Steps:**
1. Send multiple gifts
2. Verify: Top gifters leaderboard updates
3. Verify: Gifter levels shown correctly

**Expected:** ✅ Leaderboards reflect new economy

---

## Test Data Setup

```sql
-- Create test users
INSERT INTO profiles (id, username, coin_balance, earnings_balance) VALUES
  ('test-user-1', 'gifter1', 1000, 0),
  ('test-user-2', 'streamer1', 0, 0);

-- Create test gift types
INSERT INTO gift_types (name, coin_cost, tier) VALUES
  ('Rose', 10, 1),
  ('Diamond', 500, 3);
```

---

## Automated Test Script

```typescript
// Example test using Jest/Vitest
describe('Gift Economy', () => {
  it('should send gift and convert coins to diamonds 1:1', async () => {
    const giftId = await supabase.rpc('process_gift', {
      p_sender_id: 'test-user-1',
      p_recipient_id: 'test-user-2',
      p_gift_type_id: 1,
    });
    
    const recipient = await supabase
      .from('profiles')
      .select('earnings_balance')
      .eq('id', 'test-user-2')
      .single();
    
    expect(recipient.data.earnings_balance).toBe(10); // 1:1 conversion
  });
});
```

---

## Performance Testing

- **Concurrent gifts:** 100 simultaneous gifts
- **Large conversions:** 1M diamonds → 700K coins
- **Level updates:** 10,000 users level up simultaneously
- **Publish state:** 1000 streams, 10,000 active viewers

**Expected:** ✅ All operations complete in < 1 second










