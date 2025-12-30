# Artist Gifting UI Guide

## Visual Placement of Gift Buttons

### 1. Music Player (Audio Tracks)
**Location:** Artist profile page, "Music" section or Music tab

```
┌────────────────────────────────────────────┐
│  🎵 Music                     + Add Track  │
├────────────────────────────────────────────┤
│  Now Playing                               │
│  Track Title Here                          │
│  Artist Name                               │
│                                            │
│  ┌────┐  ┌──────┐  ┌────┐  ┌────┐        │
│  │ ⏮  │  │  ▶   │  │ ⏭  │  │ 🎁 │        │
│  └────┘  └──────┘  └────┘  └────┘        │
│   Prev     Play      Next    GIFT         │
└────────────────────────────────────────────┘
```

**Button Specs:**
- Size: 40x40px circular button
- Position: Rightmost control button (after Prev/Play/Next)
- Colors: Gradient from pink (#ec4899) to purple (#9333ea)
- Icon: Gift icon (🎁)
- Hover: Darker gradient effect
- Visible: Only to non-owners (visitors/fans)

---

### 2. Music Video Player
**Location:** Artist profile page, "Videos" tab (for musicians)

```
┌────────────────────────────────────────────┐
│  🎬 Music Videos              + Add Video  │
├────────────────────────────────────────────┤
│  Now Playing              Playlist (5)  ▼  │
│  Video Title Here                          │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │                                      │ │
│  │         [Video Player Area]         │ │
│  │                                      │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌────┐  ┌──────┐  ┌────┐  ┌────┐        │
│  │ ⏮  │  │  ▶   │  │ ⏭  │  │ 🎁 │        │
│  └────┘  └──────┘  └────┘  └────┘        │
│   Prev     Play      Next    GIFT         │
└────────────────────────────────────────────┘
```

**Button Specs:**
- Same styling as music player gift button
- Positioned below video player, in playback controls
- Appears whether playing YouTube video or uploaded video
- Only visible to non-owners

---

## User Flow

### Sending a Gift

1. **Fan visits artist's profile**
   - Navigates to Music section or Videos tab
   - Plays a track or video

2. **Fan clicks gift button** 🎁
   - Gift modal opens (same as live streams/posts)
   - Shows available gifts with coin costs
   - Displays user's current coin balance

3. **Fan selects a gift**
   - Clicks on desired gift (Rose, Star, Diamond, etc.)
   - Gift highlights when selected
   - Cost is clearly shown

4. **Fan confirms the gift**
   - Clicks "Send Gift" button in modal
   - Coins deducted from fan's balance
   - Diamonds added to artist's earnings
   - Success message appears
   - Modal closes automatically

5. **Transaction recorded**
   - Gift logged in database
   - Ledger entries created
   - Artist can see gift in their earnings
   - Fan's gifter level may increase

---

## Gift Button Visibility Rules

### When Gift Button SHOWS:
- ✅ Visitor viewing an artist's profile
- ✅ Logged-in user who is NOT the profile owner
- ✅ Both `artistProfileId` and `artistUsername` are available
- ✅ Music player has tracks loaded OR video player has videos loaded

### When Gift Button HIDES:
- ❌ Artist viewing their own profile (`isOwner = true`)
- ❌ Artist profile info not available
- ❌ User not logged in (gift modal requires auth)

---

## Design Consistency

The gift buttons match the existing gifting UI across the platform:

### Matching Elements:
1. **Live Streams** - Gift button in viewer controls
2. **Feed Posts** - Gift button on post cards
3. **Comments** - Gift button next to comments
4. **Artist Music/Videos** - Gift button in player controls ← NEW

### Consistent Features:
- Same GiftModal component used everywhere
- Same gift types and pricing
- Same transaction flow
- Same balance updates
- Same gifter level progression
- Same ledger tracking

---

## Responsive Behavior

### Desktop/Tablet:
- Gift button always visible in controls row
- Full-size modal (500px width)
- Smooth hover effects

### Mobile Web:
- Gift button may wrap to second row if space limited
- Modal adapts to smaller screen
- Touch-optimized button size (44x44px minimum)

---

## Accessibility

- **Keyboard Navigation:** Gift button is focusable via Tab key
- **Screen Readers:** Button has `title="Send Gift"` attribute
- **High Contrast:** Icon and colors meet WCAG AA standards
- **Touch Targets:** 40x40px button meets minimum touch target size

---

## Error Handling

### Common Scenarios:

1. **Insufficient Balance:**
   - Error message in modal: "Insufficient coin balance"
   - User directed to purchase more coins

2. **Network Error:**
   - Error message: "Failed to send gift. Please try again."
   - Transaction not recorded (safe failure)

3. **Self-Gifting Attempt:**
   - Prevented by UI (button not shown to owner)
   - Backend also validates sender ≠ recipient

4. **Not Logged In:**
   - Gift modal requires authentication
   - User redirected to login if needed

---

## Analytics Opportunities

Potential tracking points (not implemented yet):
- Gift button clicks on music vs videos
- Conversion rate from click to send
- Average gift value on music content
- Most popular gifts for artists
- Time spent listening before gifting

---

## Future Enhancements

Possible additions for v2:
- [ ] Gift animations over the player (like live streams)
- [ ] Recent gifts feed below player
- [ ] Top gifters leaderboard for artists
- [ ] Gift suggestions based on track mood/genre
- [ ] Bulk gift packages (e.g., "Gift $10 to artist")
- [ ] Gift reactions (animations that play over video)
- [ ] Scheduled/recurring gifts for super fans

---

## Technical Notes

### Component Architecture:
```
ProfilePage (modern-page.tsx)
  └── MusicShowcase (or MusicVideos wrapper)
      └── Audio/Video Player Component
          ├── Playback Controls
          │   ├── Previous Button
          │   ├── Play/Pause Button
          │   ├── Next Button
          │   └── Gift Button ← NEW
          └── GiftModal (portal)
              └── Gift Selection UI
```

### Props Flow:
```
profile.id → artistProfileId
profile.username → artistUsername
  ↓
MusicShowcase / MusicVideos
  ↓
VideoPlaylistPlayer
  ↓
GiftModal (recipientId, recipientUsername)
```

### State Management:
- `showGiftModal` - boolean state in player component
- `selectedGift` - managed within GiftModal
- `userCoinBalance` - fetched in GiftModal
- Gift transactions - handled by `/api/gifts/send`

---

## Testing Checklist

- [ ] Gift button appears on music player for visitors
- [ ] Gift button appears on video player for visitors
- [ ] Gift button hidden for profile owner
- [ ] Gift modal opens when button clicked
- [ ] Can select and send a gift successfully
- [ ] Coin balance updates after gift
- [ ] Artist earnings update after gift
- [ ] Insufficient balance shows error
- [ ] Modal closes after successful gift
- [ ] Can send multiple gifts in succession
- [ ] Works on desktop browsers
- [ ] Works on mobile web browsers
- [ ] Keyboard navigation works
- [ ] Screen reader announces button properly

---

## Support & Documentation

For implementation details, see:
- `ARTIST_GIFTING_FEATURE_COMPLETE.md` - Full implementation guide
- `components/GiftModal.tsx` - Gift modal source
- `RPC_CALL_EXAMPLES.md` - Gift API documentation

