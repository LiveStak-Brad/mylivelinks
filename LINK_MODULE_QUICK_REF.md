# Link Module - Quick Reference

## 🎯 3 Modes at a Glance

| Mode | Route | Profile | Connections | Behavior |
|------|-------|---------|-------------|----------|
| **Regular** | `/link/regular/swipe` | `/link/profile` (shared) | `/link/mutuals` (shared) | Manual swipe: Link or Nah |
| **Auto-Link F4F** | N/A (settings only) | `/link/profile` (shared) | `/link/mutuals` (shared) | Auto link-back on follow |
| **Dating** | `/link/dating/swipe` | `/link/dating/profile` | `/link/dating/matches` | Separate dating swipe |

---

## 📍 Key Routes

```
Main Entry:
/link                           → Mode selector landing

Regular Lane:
/link/regular                   → Regular landing
/link/regular/swipe             → Manual swipe UI

Shared (Regular + Auto-Link):
/link/profile                   → Link Profile editor
/link/settings                  → Settings + Auto-Link toggle
/link/mutuals                   → Mutuals list

Dating Lane:
/link/dating                    → Dating landing
/link/dating/swipe              → Dating swipe UI
/link/dating/profile            → Dating Profile editor
/link/dating/matches            → Dating matches list
```

---

## 🔄 Data Flow

### Regular Swipe
```
User swipes → linkApi.submitRegularDecision() → 
If mutual → Add to mutuals list → Show modal
```

### Auto-Link (F4F)
```
Someone follows user → (Logic Agent handles) → 
Auto create mutual → Add to mutuals list (source: 'auto_link')
```

### Dating Swipe
```
User swipes → linkApi.submitDatingDecision() → 
If match → Add to matches list → Show modal
```

---

## 🎨 Component Reuse

**SwipeCard** - Used in both regular and dating swipes
- Props: `primaryActionLabel` ("Link" vs "Like")
- Props: `secondaryActionLabel` ("Nah")
- Props: `age`, `distance` (optional, for dating)

**ProfileInfoModal** - Shows full candidate details

**ConnectionModal** - Shows success on mutual/match
- Type: `'mutual'` (regular) or `'match'` (dating)

---

## 🔌 API Quick Reference

```typescript
// Regular + Auto-Link
await linkApi.getLinkProfile()
await linkApi.saveLinkProfile({ ...profile })
await linkApi.getLinkSettings()
await linkApi.saveLinkSettings({ autoLinkEnabled: true })
await linkApi.getRegularCandidates(20)
await linkApi.submitRegularDecision({ targetUserId, decision: 'link' })
await linkApi.getMyMutuals()

// Dating
await linkApi.getDatingProfile()
await linkApi.saveDatingProfile({ ...profile })
await linkApi.getDatingCandidates(20)
await linkApi.submitDatingDecision({ targetUserId, decision: 'like' })
await linkApi.getDatingMatches()

// Test helpers
await linkApi.resetRegularSwipes()
await linkApi.resetDatingSwipes()
```

---

## 🎯 UI Copy Rules

### Regular/Auto-Link (Networking First)
- ✅ Use: "Link", "Mutuals", "Connect", "Network"
- ❌ Avoid: "Match", "Dating", "Hot"

### Dating Lane
- ✅ Use: "Like", "Match", "Dating", age/distance
- ❌ Avoid: Using dating language in regular/auto-link

---

## 🚦 Testing Checklist

- [ ] Visit `/link` - see 3 mode cards
- [ ] Swipe in regular lane - cards move correctly
- [ ] See mutual modal - 20% chance
- [ ] Toggle Auto-Link in settings - saves
- [ ] Edit Link Profile - photos, bio, tags work
- [ ] View mutuals list - shows regular + auto-link
- [ ] Swipe in dating lane - shows age/distance
- [ ] See match modal - 20% chance
- [ ] Edit Dating Profile - separate from Link Profile
- [ ] View matches list - shows dating matches only

---

## 🔧 Logic Agent Integration Points

1. **Replace API stubs** in `lib/link/api.ts` with Supabase calls
2. **Create tables**: `link_profiles`, `dating_profiles`, `mutuals`, `dating_matches`, `swipe_decisions`
3. **Wire auto-link** to follow events (webhook/trigger)
4. **Add RLS policies** for profile visibility and swipe decisions
5. **Implement messaging** (unlock Message buttons)
6. **Add photo uploads** (replace URL input)
7. **Calculate distances** for dating (PostGIS or third-party)
8. **Real-time updates** for new mutuals/matches

---

## 📦 Dependencies

Uses existing MyLiveLinks components:
- `@/components/ui/dialog` - For modals
- `@/lib/utils` - For cn() utility

No new dependencies required. Pure Next.js + Tailwind.

---

**Quick Start:** Navigate to `/link` and explore!
