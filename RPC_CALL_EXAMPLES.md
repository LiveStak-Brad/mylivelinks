# RPC Call Examples

## 1. Send Gift

```typescript
// Frontend: Send gift to streamer
const { data, error } = await supabase.rpc('process_gift', {
  p_sender_id: 'user-uuid',
  p_recipient_id: 'streamer-uuid',
  p_gift_type_id: 1, // Gift type ID
  p_slot_index: 3, // Optional: which slot (1-12)
  p_live_stream_id: 123, // Optional: live stream ID
});

// Returns: gift_id (BIGINT)
```

**What happens:**
- Sender's `coin_balance` decreases by gift cost
- Recipient's `earnings_balance` (diamonds) increases by same amount (1:1)
- Ledger entries created for both
- `total_spent` updated for sender
- Gifter level auto-updated via trigger

---

## 2. Convert Diamonds to Coins

```typescript
// Frontend: Convert diamonds to coins
const { data, error } = await supabase.rpc('convert_diamonds_to_coins', {
  p_profile_id: 'user-uuid',
  p_diamonds_in: 100, // Diamonds to convert
});

// Returns: conversion_id (BIGINT)
```

**What happens:**
- Validates minimum 3 diamonds
- Calculates: `coins_out = floor(diamonds_in * 0.70)`
- Platform fee: `fee_amount = diamonds_in - coins_out` (30%)
- Updates balances atomically:
  - Deducts diamonds from `earnings_balance`
  - Adds coins to `coin_balance` (via ledger)
- Creates ledger entries for conversion

**Example:**
- Input: 100 diamonds
- Output: 70 coins
- Fee: 30 diamonds (platform keeps)

---

## 3. Update Gifter Level (Auto-triggered)

```typescript
// Usually auto-triggered, but can call manually:
const { data, error } = await supabase.rpc('update_gifter_level', {
  p_profile_id: 'user-uuid',
});

// Returns: new_level (INTEGER)
```

**What happens:**
- Queries `gifter_levels` table for highest level where `min_coins_spent <= total_spent`
- Updates `profiles.gifter_level` cached value
- Auto-triggered when `total_spent` changes

---

## 4. Get Gifter Level Info

```typescript
// Get badge info for a level
const { data, error } = await supabase
  .from('gifter_levels')
  .select('*')
  .eq('level', 5)
  .single();

// Returns: { level, min_coins_spent, badge_name, badge_color, badge_icon_url, description }
```

---

## 5. Get User Balances

```typescript
// Get current balances
const { data, error } = await supabase
  .from('profiles')
  .select('coin_balance, earnings_balance, gifter_level, total_spent')
  .eq('id', 'user-uuid')
  .single();

// Returns: { coin_balance, earnings_balance (diamonds), gifter_level, total_spent }
```

---

## 6. Get Conversion History

```typescript
// Get user's conversion history
const { data, error } = await supabase
  .from('diamond_conversions')
  .select('*')
  .eq('profile_id', 'user-uuid')
  .order('created_at', { ascending: false })
  .limit(50);

// Returns: Array of conversions with diamonds_in, coins_out, fee_amount, created_at
```

---

## 7. Real-time Balance Updates

```typescript
// Subscribe to balance changes
const channel = supabase
  .channel('balance-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
      filter: `id=eq.${userId}`,
    },
    (payload) => {
      console.log('Balance updated:', payload.new);
      // Update UI with new balances
    }
  )
  .subscribe();
```

---

## Error Handling

All RPC functions return errors in this format:

```typescript
{
  code: string;
  message: string;
  details?: any;
}
```

**Common errors:**
- `Insufficient coin balance` - Not enough coins to send gift
- `Insufficient diamond balance` - Not enough diamonds to convert
- `Minimum conversion is 3 diamonds` - Below minimum threshold
- `Invalid or inactive gift type` - Gift type doesn't exist or is disabled













