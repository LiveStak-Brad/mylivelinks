# Testing Checklist - Gift System with 40% Fee

## ⚠️ CRITICAL: Run These SQL Scripts IN ORDER

### Step 1: Fix the Gift Function (MUST RUN FIRST!)
```sql
-- File: fix_gift_properly.sql
-- This fixes the bug where diamonds were going to sender instead of recipient
-- COPY AND PASTE THE ENTIRE FILE INTO SUPABASE SQL EDITOR AND RUN IT
```

**What this fixes:**
- ❌ Old: Sender loses coins, sender gains diamonds (WRONG!)
- ✅ New: Sender loses coins, recipient gains diamonds (CORRECT!)

### Step 2: Reset Everything
```sql
-- File: reset_simple_for_brad.sql
-- This wipes all balances and gives you 100k coins
-- COPY AND PASTE THE ENTIRE FILE INTO SUPABASE SQL EDITOR AND RUN IT
```

**What this does:**
- Everyone's coins → 0
- Everyone's diamonds → 0
- Your coins → 100,000
- Clears all transactions
- Clears all leaderboards

### Step 3: Verify It Worked
```sql
-- Check your balance
SELECT username, coin_balance, earnings_balance as diamonds
FROM profiles
WHERE id = '2b4a1178-3c39-4179-94ea-314dd824a818';

-- Should show: 100,000 coins, 0 diamonds
```

---

## 🧪 Testing Flow (After Running Both Scripts)

### Test 1: Basic Gift
1. **Send 1,000 coins to someone**
2. **Expected Results:**
   - ✅ Your coins: 99,000 (lost 1,000)
   - ✅ Their diamonds: 1,000 (received 1,000)
   - ✅ Your diamonds: still 0
   - ✅ No errors!

### Test 2: Diamond Conversion (40% Fee)
1. **Recipient converts their 1,000 diamonds**
2. **Expected Results:**
   - ✅ Their diamonds: 0 (spent 1,000)
   - ✅ Their coins: 600 (received 60%, lost 400 to fee)
   - ✅ System burned: 400 diamonds (gone forever)

### Test 3: Full Economy Cycle
1. **Start:** You have 100,000 coins
2. **Send 50,000 coin gift**
   - You: 50,000 coins
   - Them: 50,000 diamonds
3. **They convert 50,000 diamonds**
   - They get: 30,000 coins (60%)
   - Fee burned: 20,000 diamonds (40%)
4. **Total coins in economy:** 80,000 (20k burned = deflation ✅)

---

## ❌ Common Errors & Solutions

### Error: "profiles_coin_balance_check"
**Problem:** Gift function hasn't been fixed yet  
**Solution:** Run `fix_gift_properly.sql` first!

### Error: "relation top_gifters does not exist"
**Problem:** Using old reset script  
**Solution:** Use `reset_simple_for_brad.sql` instead

### Error: "Insufficient coin balance"
**Problem:** You don't have enough coins  
**Solution:** Run `reset_simple_for_brad.sql` to get 100k coins

---

## 📊 Economy Math

**Gift Economics:**
- Send 100 coins → Recipient gets 100 diamonds (1:1)

**Conversion Economics (40% fee):**
- Convert 100 diamonds → Get 60 coins (lose 40 diamonds)
- Fee rate: 40% burned
- Conversion rate: 0.60

**Total Value Loss:**
- 100 coins → 100 diamonds → 60 coins
- Net loss: 40 coins (40% deflation) ✅

---

## ✅ Success Criteria

After both scripts run successfully:
- [ ] Can send gifts without errors
- [ ] Sender loses coins
- [ ] Recipient gains diamonds (1:1)
- [ ] Can convert diamonds to coins
- [ ] Conversion shows "40% fee"
- [ ] Conversion gives 60% back
- [ ] Balances update in realtime
- [ ] Leaderboards are empty
- [ ] Your balance is 100,000 coins

---

## 🚀 Quick Start Commands

```sql
-- 1. Fix gifts (REQUIRED!)
-- Copy fix_gift_properly.sql and run

-- 2. Reset everything
-- Copy reset_simple_for_brad.sql and run

-- 3. Verify
SELECT username, coin_balance, earnings_balance as diamonds
FROM profiles
WHERE id = '2b4a1178-3c39-4179-94ea-314dd824a818';
```

---

**Remember: You MUST run fix_gift_properly.sql BEFORE testing gifts!**

