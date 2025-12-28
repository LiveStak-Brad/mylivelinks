# 🎨 Invite Link Modal — Visual Guide

**UI Agent 2 Deliverable**  
**Created:** December 27, 2025

---

## 📱 Mobile View (Bottom Sheet)

```
┌─────────────────────────────────────┐
│                                     │
│         (Backdrop - tap to close)   │
│                                     │
│                                     │
│  ╔═════════════════════════════╗  │
│  ║  🔗 Your Invite Link      ✕ ║  │ ← Header (purple accent)
│  ╠═════════════════════════════╣  │
│  ║                             ║  │
│  ║  ┌─────────────────────┐   ║  │
│  ║  │ 📈 [Purple tint]    │   ║  │ ← Explainer card
│  ║  │ Grow Your Network   │   ║  │
│  ║  │                     │   ║  │
│  ║  │ Share your unique   │   ║  │
│  ║  │ invite link to      │   ║  │
│  ║  │ bring quality...    │   ║  │
│  ║  └─────────────────────┘   ║  │
│  ║                             ║  │
│  ║  ┌─────────────────────┐   ║  │
│  ║  │ 🔗 YOUR REFERRAL    │   ║  │ ← Link display
│  ║  │    LINK             │   ║  │   (gray background)
│  ║  │ mylivelinks.com/    │   ║  │
│  ║  │ join?ref=username   │   ║  │
│  ║  └─────────────────────┘   ║  │
│  ║                             ║  │
│  ║  ┌─────────────────────┐   ║  │
│  ║  │  📋  Copy Link      │   ║  │ ← Primary button
│  ║  └─────────────────────┘   ║  │   (purple gradient)
│  ║  ┌─────────────────────┐   ║  │
│  ║  │  📤  Share          │   ║  │ ← Secondary button
│  ║  └─────────────────────┘   ║  │   (outlined)
│  ║                             ║  │
│  ║  ┌─────────────────────┐   ║  │
│  ║  │ 💎 Quality matters: │   ║  │ ← Quality note
│  ║  │ Focus on inviting   │   ║  │   (blue tint)
│  ║  │ engaged creators... │   ║  │
│  ║  └─────────────────────┘   ║  │
│  ║                             ║  │
│  ╠═════════════════════════════╣  │
│  ║ Build your network.     🚀  ║  │ ← Footer
│  ╚═════════════════════════════╝  │
└─────────────────────────────────────┘
```

---

## 💻 Web View (Centered Modal)

```
┌───────────────────────────────────────────────┐
│                                               │
│         (Backdrop with blur effect)           │
│                                               │
│    ╔════════════════════════════════╗         │
│    ║  🔗 Your Invite Link        ✕ ║         │ ← Header
│    ╠════════════════════════════════╣         │
│    ║                                ║         │
│    ║  ┌────────────────────────┐   ║         │
│    ║  │ 📈 Grow Your Network   │   ║         │ ← Explainer
│    ║  │                        │   ║         │   (purple tint)
│    ║  │ Share your unique      │   ║         │
│    ║  │ invite link to bring   │   ║         │
│    ║  │ quality members to...  │   ║         │
│    ║  └────────────────────────┘   ║         │
│    ║                                ║         │
│    ║  ┌────────────────────────┐   ║         │
│    ║  │ 🔗 YOUR REFERRAL LINK  │   ║         │ ← Link display
│    ║  │ https://mylivelinks... │   ║         │
│    ║  └────────────────────────┘   ║         │
│    ║                                ║         │
│    ║  ┌────────────────────────┐   ║         │
│    ║  │  📋  Copy Link         │   ║         │ ← Primary button
│    ║  └────────────────────────┘   ║         │   (gradient + shadow)
│    ║  ┌────────────────────────┐   ║         │
│    ║  │  📤  Share             │   ║         │ ← Secondary button
│    ║  └────────────────────────┘   ║         │   (only on mobile web)
│    ║                                ║         │
│    ║  ┌────────────────────────┐   ║         │
│    ║  │ 💎 Quality matters:    │   ║         │ ← Quality note
│    ║  │ Focus on inviting...   │   ║         │   (blue tint)
│    ║  └────────────────────────┘   ║         │
│    ║                                ║         │
│    ╠════════════════════════════════╣         │
│    ║ Build your network.        🚀  ║         │ ← Footer
│    ╚════════════════════════════════╝         │
│                                               │
└───────────────────────────────────────────────┘
```

---

## 🎨 Color Specifications

### Light Mode Colors
```css
Background:        #FFFFFF (white)
Header Title:      #8B5CF6 (purple-500)
Body Text:         #111827 (gray-900)
Secondary Text:    #6B7280 (gray-500)
Muted Text:        #9CA3AF (gray-400)

Explainer Card:    rgba(139, 92, 246, 0.08) + border rgba(139, 92, 246, 0.25)
Link Display:      #F9FAFB (gray-50) + border #E5E7EB (gray-200)
Quality Note:      rgba(59, 130, 246, 0.08) + border rgba(59, 130, 246, 0.25)

Primary Button:    linear-gradient(to right, #8B5CF6, #EC4899)
Secondary Button:  #F3F4F6 (gray-100) + border #E5E7EB
```

### Dark Mode Colors
```css
Background:        #1F2937 (gray-800)
Header Title:      #FFFFFF (white)
Body Text:         #FFFFFF (white)
Secondary Text:    #D1D5DB (gray-300)
Muted Text:        #9CA3AF (gray-400)

Explainer Card:    rgba(139, 92, 246, 0.15) + border rgba(139, 92, 246, 0.3)
Link Display:      #111827 (gray-900) + border #374151 (gray-700)
Quality Note:      rgba(59, 130, 246, 0.15) + border rgba(59, 130, 246, 0.3)

Primary Button:    linear-gradient(to right, #8B5CF6, #EC4899)
Secondary Button:  #374151 (gray-700) + border #4B5563
```

---

## 📐 Spacing & Sizing

### Dimensions
```
Modal Width (Web):        max-w-md (28rem / 448px)
Modal Height (Mobile):    max-height: 90%
Modal Padding:            20-24px
Border Radius (Modal):    24px (top corners mobile)
Border Radius (Cards):    12-16px
Border Radius (Buttons):  12px

Button Height:            48-56px
Icon Container Size:      40x40px
```

### Typography
```
Header Title:        20px / Bold 800 / Purple (light) or White (dark)
Section Title:       16px / Bold 700
Body Text:           13-14px / Regular 400
Link URL:            12px / Monospace
Label Text:          11px / Bold 700 / Uppercase
Footer Text:         12px / Regular 400 / Muted
```

### Spacing
```
Component Gap:       20px (vertical stack)
Button Gap:          12px (between buttons)
Card Padding:        16px
Header Padding:      20px horizontal, 16px vertical
Footer Padding:      20px horizontal, 16px vertical
```

---

## 🎯 Interactive States

### Copy Button States

**Default:**
```
┌────────────────────────┐
│  📋  Copy Link         │  ← Purple→Pink gradient
└────────────────────────┘
```

**Pressed:**
```
┌────────────────────────┐
│  📋  Copy Link         │  ← Slightly darker, scale 0.98
└────────────────────────┘
```

**Copied (2.5s):**
```
┌────────────────────────┐
│  ✓  Link Copied!       │  ← Checkmark icon
└────────────────────────┘
```

### Loading State
```
┌────────────────────────┐
│    ⏳ Loading...       │  ← Spinner in link display
└────────────────────────┘
```

---

## 📱 Animation Details

### Modal Entry (Mobile)
- **Type:** Slide up
- **Duration:** 300ms
- **Easing:** ease-out
- **Backdrop:** Fade in (200ms)

### Modal Exit (Mobile)
- **Type:** Slide down
- **Duration:** 250ms
- **Easing:** ease-in
- **Backdrop:** Fade out (150ms)

### Modal Entry (Web)
- **Type:** Fade + slight scale
- **Duration:** 200ms
- **Scale:** 0.95 → 1.0
- **Backdrop:** Fade in with blur

### Button Press
- **Scale:** 1.0 → 0.98
- **Opacity:** 1.0 → 0.8 (primary) / 0.9 (secondary)
- **Duration:** Instant (press feedback)

---

## 🎭 Emoji Usage

```
🔗  Link/chain icon (header, link display)
📈  Growth/trending (explainer card)
📋  Clipboard (copy button default)
✓   Checkmark (copy button success)
📤  Share/upload (share button)
💎  Diamond (quality emphasis)
🚀  Rocket (footer, growth theme)
```

---

## 📝 Copy Text

### Header
```
Your Invite Link
```

### Explainer Card
```
Grow Your Network

Share your unique invite link to bring quality 
members to MyLiveLinks. Every signup and their 
activity is tracked to your referral.
```

### Link Label
```
YOUR REFERRAL LINK
```

### Quality Note
```
💎 Quality matters: Focus on inviting engaged 
creators and viewers who'll actively participate 
in the community.
```

### Footer
```
Build your network. Grow together. 🚀
```

### Share Message (System Share Sheet)
```
Title: Join MyLiveLinks - Live Streaming Platform

Text: Join me on MyLiveLinks! Live streaming, 
exclusive content, and real connections. 
Sign up with my link and get started! 🚀

URL: https://mylivelinks.com/join?ref=username
```

---

## 🔍 Accessibility

### Focus States
- Tab order: Close button → Copy → Share
- Focus ring: 2px purple outline
- Skip links for screen readers

### ARIA Labels
```html
<button aria-label="Close invite modal">✕</button>
<button aria-label="Copy referral link to clipboard">Copy Link</button>
<button aria-label="Share referral link">Share</button>
```

### Semantic HTML
- `<h2>` for modal title
- `<p>` for body text
- Proper heading hierarchy
- Alt text for icons (when using images)

---

## 🧪 State Variations

### 1. Default State
- All content loaded
- Copy button ready
- Link displayed clearly

### 2. Loading State
- Spinner in link display area
- Buttons disabled
- Reduced opacity on disabled elements

### 3. Copied State (2.5s)
- Copy button shows checkmark
- Text changes to "Link Copied!"
- Auto-reverts to default after 2.5s

### 4. Error State (Edge Case)
- Alert if clipboard access fails
- Fallback message displayed

---

## 📲 Platform Differences

### iOS
- Share sheet shows native iOS sharing UI
- Haptic feedback on button press (optional)
- Safe area insets respected

### Android
- Share sheet shows Android sharing UI
- Material design ripple effect (optional)
- System navigation respected

### Web (Desktop)
- No share button (unless mobile browser detected)
- Centered modal with backdrop blur
- Keyboard shortcuts: ESC to close

### Web (Mobile)
- Share button appears (navigator.share detected)
- Bottom-aligned for thumb reach
- Touch-optimized button sizes

---

## 🎬 User Flow Diagram

```
User Profile/Options Menu
         ↓
  [Get My Invite Link] button
         ↓
   Modal opens ↓
         ↓
┌────────────────────┐
│ View referral link │
└────────────────────┘
         ↓
    ┌────┴────┐
    ↓         ↓
[Copy]    [Share]
    ↓         ↓
Clipboard  Share Sheet
    ↓         ↓
  Paste   Select App
    ↓         ↓
  Success   Success
```

---

## ✅ Design Principles Applied

1. **Confident Tone**
   - No "please" or begging language
   - Straightforward, empowering copy
   - Focus on growth and value

2. **One-Tap Actions**
   - Single tap to copy
   - Single tap to share
   - No multi-step flows

3. **Link-Based Only**
   - No referral codes to remember
   - Direct URL sharing
   - Clean, professional links

4. **Quality Emphasis**
   - Explicit note about quality referrals
   - Tracking mention (accountability)
   - Community-focused language

5. **Clean Dismiss**
   - X button always accessible
   - Backdrop tap to close
   - Smooth animations

---

## 🎯 Quick Reference

| Element | Mobile | Web |
|---------|--------|-----|
| Modal Type | Bottom Sheet | Centered |
| Animation | Slide Up | Fade + Scale |
| Backdrop | Solid + Blur | Blur |
| Share Button | Always | If supported |
| Max Width | 100% | 448px |
| Border Radius | 24px top | 24px all |

---

*Visual Guide Complete — Ready for Implementation Review*

