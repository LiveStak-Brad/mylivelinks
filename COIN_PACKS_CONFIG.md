# Coin Packs Configuration

## Overview

MyLiveLinks supports high-value coin purchases for web and mobile platforms. Coins are **purchase-only** and never earned for free.

## Revenue Split

- **Platform**: 30% of gift value
- **Streamer**: 70% of gift value

## Web Coin Packs (Stripe)

Web platform supports very large coin purchases to attract high-spending users (whales).

### Standard Packs

| USD Amount | Coins | Bonus | Effective Rate |
|------------|-------|-------|----------------|
| $5         | 350   | -     | 70 coins/$     |
| $10        | 700   | -     | 70 coins/$     |
| $25        | 1,750 | -     | 70 coins/$     |
| $50        | 3,500 | -     | 70 coins/$     |
| $100       | 7,000 | -     | 70 coins/$     |

### High-Value Packs (Whale Tier)

| USD Amount | Coins      | Bonus      | Effective Rate |
|------------|------------|------------|----------------|
| $250       | 17,500     | -          | 70 coins/$     |
| $500       | 35,000     | -          | 70 coins/$     |
| $1,000     | 70,000     | -          | 70 coins/$     |
| $2,500     | 175,000    | -          | 70 coins/$     |
| $5,000     | 350,000    | -          | 70 coins/$     |
| $10,000    | 700,000    | -          | 70 coins/$     |
| $25,000    | 1,750,000  | -          | 70 coins/$     |

### Notes

- All web packs maintain consistent 70 coins per USD rate
- No bonus coins (keeps pricing simple and transparent)
- Stripe supports up to $999,999.99 per transaction
- For purchases above $25,000, consider multiple transactions or custom enterprise handling

## Mobile Coin Packs (App Store)

Mobile platforms provide lower coin value to offset app store fees (30% platform fee).

### iOS / Android Packs

| USD Amount | Coins | Bonus | Effective Rate | Web Equivalent |
|------------|-------|-------|----------------|----------------|
| $5         | 250   | -     | 50 coins/$     | 350 coins      |
| $10        | 500   | -     | 50 coins/$     | 700 coins      |
| $25        | 1,250 | -     | 50 coins/$     | 1,750 coins    |
| $50        | 2,500 | -     | 50 coins/$     | 3,500 coins    |
| $100       | 5,000 | -     | 50 coins/$     | 7,000 coins    |
| $250       | 12,500| -     | 50 coins/$     | 17,500 coins   |
| $500       | 25,000| -     | 50 coins/$     | 35,000 coins   |
| $1,000     | 50,000| -     | 50 coins/$     | 70,000 coins   |

### Notes

- Mobile maintains 50 coins per USD rate (vs 70 on web)
- App stores limit maximum purchase amounts (typically $999.99)
- Coins are spent identically across platforms - only purchase value differs

## Implementation

### Database Storage

Coin packs are stored in `coin_purchases` table:
- `platform`: 'web', 'ios', 'android'
- `payment_provider`: 'stripe', 'apple', 'google'
- `coin_amount`: Coins purchased
- `usd_amount`: USD paid

### Gift Spending

Coins are spent identically regardless of purchase platform:
- Same gift prices
- Same revenue split (70/30)
- Same leaderboard eligibility

## High-Spender Strategy

1. **Web Platform**: Primary channel for whales (supports $25,000+ purchases)
2. **Mobile Platform**: Convenience channel (lower value due to fees)
3. **No Caps**: No artificial spending limits
4. **Transparent Pricing**: Consistent rates, no confusing bonuses

## Example Scenarios

### Scenario 1: Web Whale Purchase
- User purchases $25,000 coin pack on web
- Receives 1,750,000 coins
- Can send 350,000 "Rose" gifts (10 coins each)
- Or 175 "Legendary" gifts (50,000 coins each)

### Scenario 2: Mobile Purchase
- User purchases $100 pack on iOS
- Receives 5,000 coins (vs 7,000 on web)
- Can send 500 "Rose" gifts
- Coins work identically to web coins

### Scenario 3: Cross-Platform Spending
- User purchases $1,000 on web (70,000 coins)
- User purchases $1,000 on mobile (50,000 coins)
- Total balance: 120,000 coins
- All coins spent identically, tracked in single `coins` table














