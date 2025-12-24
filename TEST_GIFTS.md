# Gift System Testing Guide

## Setup

1. **Apply SQL Fix First:**
```bash
# Run this in Supabase SQL Editor
cat fix_gift_constraint.sql
```

This fixes the `check_revenue_split` constraint error.

## Test with Fake Coins

### Give Yourself Test Coins

Run this in Supabase SQL Editor to give yourself 2 million coins for testing:

```sql
-- Replace YOUR_USER_ID with your actual user ID
UPDATE profiles
SET coin_balance = 2000000
WHERE id = 'YOUR_USER_ID';
```

To find your user ID:
```sql
SELECT id, username, email, coin_balance FROM profiles;
```

### Test Gift Flow

1. **Browser A: Go Live**
   - Open `/live`
   - Click "Go Live"
   - Wait for your video to appear

2. **Browser B: View Stream**
   - Open `/live` in another browser/incognito
   - You should see Browser A's stream in the grid

3. **Send a Gift:**
   - Click the 🎁 gift button on Browser A's tile
   - Select a gift (Rose = 10 coins, Heart = 50 coins, etc.)
   - Click "Send Gift"

4. **Expected Results:**
   - ✅ Gift modal closes
   - ✅ **Animation appears on the video** (3 second animation with sparkles)
   - ✅ Shows: `{username} sent {gift}! +{coins} coins`
   - ✅ **Chat message appears** saying: `{username} sent {gift} to {recipient}! +{coins} coins`
   - ✅ Your coin balance decreases
   - ✅ Recipient's diamond balance increases (1:1 with coins spent)

## Available Gifts

| Gift | Cost | Emoji Fallback |
|------|------|----------------|
| Rose | 10 coins | 🌹 |
| Heart | 50 coins | ❤️ |
| Star | 100 coins | ⭐ |
| Diamond | 500 coins | 💎 |
| Super Star | 1000 coins | 🌟 |
| Crown | 5000 coins | 👑 |
| Platinum | 10000 coins | 💠 |
| Legendary | 50000 coins | 🏆 |

## Animation Features

- **3-second display** with bouncing gift icon
- **Sparkle particles** flying around
- **Gradient background pulse**
- **Smooth fade in/out**
- **Gift emoji fallback** if no icon uploaded

## Chat Integration

Gift messages appear in the global chat with:
- Sender username
- Gift name
- Recipient username
- Coin amount
- Type: 'gift' (can be styled differently in chat UI)

## Troubleshooting

**Error: "check_revenue_split" violation**
- Run `fix_gift_constraint.sql` first

**Animation doesn't appear:**
- Check browser console for errors
- Ensure `styles/gift-animations.css` is imported in `app/globals.css`
- Verify realtime subscription is working (check Supabase logs)

**Chat message doesn't appear:**
- Check that `chat_messages` table exists
- Verify RLS policies allow inserts
- Check global chat component is subscribed to realtime

## Database Check

Verify gift was recorded:
```sql
SELECT 
  g.id,
  sender.username as sender,
  recipient.username as recipient,
  gt.name as gift_name,
  g.coin_amount,
  g.sent_at
FROM gifts g
JOIN profiles sender ON g.sender_id = sender.id
JOIN profiles recipient ON g.recipient_id = recipient.id
JOIN gift_types gt ON g.gift_type_id = gt.id
ORDER BY g.sent_at DESC
LIMIT 10;
```

Check coin balances:
```sql
SELECT username, coin_balance, earnings_balance 
FROM profiles 
WHERE username IN ('your_sender_username', 'your_recipient_username');
```

## Next Steps (After Testing)

- Hook up real coin purchases (Stripe integration)
- Add gift leaderboards
- Create admin panel for gift type management
- Upload custom gift icons/animations
- Add sound effects for gifts
- Create gift combos/multipliers

