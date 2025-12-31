# 🎨 Leaderboard Rank Badge - Visual Quick Reference

## Badge Appearance by Rank

### 🏆 Top 3 Finishers

```
┌─────────────────────────────────────┐
│  👑 #1 DIAMOND                      │  ← Gold gradient (Yellow/Amber)
│     🏆 First Place                  │     Thick yellow border
└─────────────────────────────────────┘     Glowing shadow

┌─────────────────────────────────────┐
│  🥈 #2 PLATINUM                     │  ← Silver gradient (Gray)
│     +523 💎 to #1                   │     Thick gray border
└─────────────────────────────────────┘     Glowing shadow

┌─────────────────────────────────────┐
│  🥉 #3 GOLD                         │  ← Bronze gradient (Orange/Amber)
│     +312 💎 to #2                   │     Thick orange border
└─────────────────────────────────────┘     Glowing shadow
```

### 🔷 Top 10 (Silver Tier)

```
┌─────────────────────────────────────┐
│  #4 SILVER                          │  ← Blue gradient
│     +89 💎 to #3                    │     Blue border
└─────────────────────────────────────┘     Blue shadow

┌─────────────────────────────────────┐
│  #10 SILVER                         │
│     +156 💎 to #9                   │
└─────────────────────────────────────┘
```

### 💜 Top 50 (Bronze Tier)

```
┌─────────────────────────────────────┐
│  #11 BRONZE                         │  ← Purple gradient
│     +234 💎 to #10                  │     Purple border
└─────────────────────────────────────┘     Purple shadow

┌─────────────────────────────────────┐
│  #50 BRONZE                         │
│     +67 💎 to #49                   │
└─────────────────────────────────────┘
```

### 💚 Top 100

```
┌─────────────────────────────────────┐
│  #51 UNRANKED                       │  ← Green gradient
│     +45 💎 to #50                   │     Green border
└─────────────────────────────────────┘     Green shadow

┌─────────────────────────────────────┐
│  #100 UNRANKED                      │
│     +12 💎 to #99                   │
└─────────────────────────────────────┘
```

### ⚫ Unranked (Outside Top 100)

```
┌─────────────────────────────────────┐
│  Unranked                           │  ← Slate gradient
│     +5,234 💎 to Top 100            │     Slate border
└─────────────────────────────────────┘     Slate shadow
```

### 👻 No Badge (Zero Points)

```
(No badge displayed - keeps UI clean)
```

---

## UI Layout on Tile

```
┌────────────────────────────────────────┐
│                                        │
│  [Video/Stream Content]                │
│                                        │
│                                        │
│                              On Hover: │
│                  ┌──────────────────┐  │
│                  │  @username       │  │ ← Username (hover only)
│                  │  [gifter badge]  │  │
│                  └──────────────────┘  │
│                  ┌──────────────────┐  │
│                  │  👑 #1 DIAMOND   │  │ ← Rank (always visible)
│                  │  🏆 First Place  │  │
│                  └──────────────────┘  │
└────────────────────────────────────────┘
```

---

## Color Palette Reference

### Rank #1 - Diamond (Gold)
- **Background:** `from-yellow-400 via-yellow-500 to-amber-600`
- **Border:** `border-yellow-300`
- **Shadow:** `shadow-yellow-500/50`

### Rank #2 - Platinum (Silver)
- **Background:** `from-gray-300 via-gray-400 to-gray-500`
- **Border:** `border-gray-200`
- **Shadow:** `shadow-gray-400/50`

### Rank #3 - Gold (Bronze)
- **Background:** `from-orange-400 via-amber-600 to-orange-700`
- **Border:** `border-orange-300`
- **Shadow:** `shadow-orange-500/50`

### Ranks #4-10 - Silver (Blue)
- **Background:** `from-blue-500 via-blue-600 to-indigo-700`
- **Border:** `border-blue-400`
- **Shadow:** `shadow-blue-500/50`

### Ranks #11-50 - Bronze (Purple)
- **Background:** `from-purple-500 via-purple-600 to-purple-700`
- **Border:** `border-purple-400`
- **Shadow:** `shadow-purple-500/50`

### Ranks #51-100 (Green)
- **Background:** `from-green-500 via-green-600 to-emerald-700`
- **Border:** `border-green-400`
- **Shadow:** `shadow-green-500/50`

### Unranked (Slate)
- **Background:** `from-slate-600 via-slate-700 to-gray-800`
- **Border:** `border-slate-500`
- **Shadow:** `shadow-slate-600/30`

---

## Typography

- **Rank Number:** `text-xs font-bold` (white)
- **Tier Name:** `text-[10px] font-semibold uppercase` (white/90)
- **Points Needed:** `text-[9px] font-medium` (white/95)
- **All Text:** Drop shadow for readability

---

## Behavior

| State | Badge Visibility | Username Visibility |
|-------|-----------------|---------------------|
| Default | ✅ Always | ❌ Hidden |
| Hover | ✅ Always | ✅ Visible |
| Mobile | ✅ Always | Tap to show |

---

## Example Messages

| Rank | Message |
|------|---------|
| #1 | "🏆 First Place" |
| #2 | "+523 💎 to #1" |
| #5 | "+156 💎 to #4" |
| #50 | "+67 💎 to #49" |
| #100 | "+12 💎 to #99" |
| Unranked | "+5,234 💎 to Top 100" |

---

## Emojis Used

- 👑 Crown - Rank #1 only
- 🥈 Silver Medal - Rank #2 only
- 🥉 Bronze Medal - Rank #3 only
- 💎 Diamond - Points indicator (all ranks)
- 🏆 Trophy - First place message

---

## Responsive Design

- **Desktop:** Full badge with all details
- **Tablet:** Slightly smaller text
- **Mobile:** Compact but still readable
- **All Devices:** Always visible badge

---

## Animation (Future)

Potential animations when rank changes:
- ✨ Sparkle effect on rank improvement
- 🎉 Confetti for reaching top 10
- 📈 Counter animation when points update
- 🔄 Smooth color transition on tier change

---

## Accessibility

- **High Contrast:** Bold colors with borders
- **Text Legibility:** Drop shadows on all text
- **Clear Hierarchy:** Rank → Tier → Progress
- **Emoji Support:** Icons convey meaning visually

---

**Design Goal:** Make every streamer feel like a champion while motivating them to climb higher! 🚀
