# Profile Type Components - Visual Reference

## Component Layout Overview

```
┌─────────────────────────────────────────┐
│         PROFILE HEADER                  │
│                                         │
│         [Avatar Image]                  │
│                                         │
│      John Doe Musician                  │
│         @johndoe                        │
│                                         │
│    ┌─────────────────────────┐        │
│    │  🎵  Musician           │  ◄── ProfileTypeBadge
│    └─────────────────────────┘        │
│                                         │
│  "Making music and sharing vibes..."   │
│                                         │
│  ┌────┐  ┌────┐  ┌────┐              │
│  │▶️  │  │🎵  │  │👕  │  ◄── ProfileQuickActionsRow
│  │Play│  │Shows│  │Merch│              │
│  └────┘  └────┘  └────┘              │
│                                         │
│  [Follow]  [Message]  [⋯]             │
│                                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ◄── ProfileSectionTabs                │
│  ┌──────┬──────┬──────┬──────┬──────┐ │
│  │About │🎵 Music│🎬 Videos│🎤 Shows│👕 Merch│ │
│  └──────┴──────┴──────┴──────┴──────┘ │
│  (Horizontal Scrollable)                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         SECTION CONTENT                 │
│  (Rendered by parent based on active tab)│
└─────────────────────────────────────────┘
```

---

## ProfileTypeBadge - Visual States

### Streamer (Red Theme)
```
┌──────────────────┐
│  📺  Streamer    │  Background: rgba(239, 68, 68, 0.12/0.2)
└──────────────────┘  Text: #EF4444
```

### Musician (Purple Theme)
```
┌──────────────────┐
│  🎵  Musician    │  Background: rgba(139, 92, 246, 0.12/0.2)
└──────────────────┘  Text: #8B5CF6
```

### Comedian (Amber Theme)
```
┌──────────────────┐
│  🎭  Comedian    │  Background: rgba(245, 158, 11, 0.12/0.2)
└──────────────────┘  Text: #F59E0B
```

### Business (Blue Theme)
```
┌──────────────────┐
│  💼  Business    │  Background: rgba(14, 165, 233, 0.12/0.2)
└──────────────────┘  Text: #0EA5E9
```

### Creator (Pink Theme)
```
┌──────────────────┐
│  ✨  Creator     │  Background: rgba(236, 72, 153, 0.12/0.2)
└──────────────────┘  Text: #EC4899
```

### Default (Gray Theme)
```
┌──────────────────┐
│  👤  Member      │  Background: rgba(107, 116, 128, 0.12/0.2)
└──────────────────┘  Text: #6B7280
```

---

## ProfileQuickActionsRow - Visual Layout

### Streamer Actions
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  ┌────┐  │  │  ┌────┐  │  │  ┌────┐  │
│  │ 📹 │  │  │  │ 📅 │  │  │  │ 🎬 │  │
│  └────┘  │  │  └────┘  │  │  └────┘  │
│  Go Live │  │ Schedule │  │   Clips  │
└──────────┘  └──────────┘  └──────────┘
   (Red)        (Purple)       (Blue)
```

### Musician Actions
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  ┌────┐  │  │  ┌────┐  │  │  ┌────┐  │
│  │ ▶️  │  │  │  │ 🎵 │  │  │  │ 👕 │  │
│  └────┘  │  │  └────┘  │  │  └────┘  │
│   Play   │  │  Shows   │  │  Merch   │
└──────────┘  └──────────┘  └──────────┘
  (Purple)       (Pink)       (Amber)
```

### Comedian Actions
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  ┌────┐  │  │  ┌────┐  │  │  ┌────┐  │
│  │ 🎬 │  │  │  │ 📅 │  │  │  │ 🎫 │  │
│  └────┘  │  │  └────┘  │  │  └────┘  │
│   Clips  │  │  Shows   │  │   Book   │
└──────────┘  └──────────┘  └──────────┘
  (Amber)       (Red)        (Purple)
```

### Business Actions
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  ┌────┐  │  │  ┌────┐  │  │  ┌────┐  │
│  │ 🛒 │  │  │  │ 📅 │  │  │  │ ⭐ │  │
│  └────┘  │  │  └────┘  │  │  └────┘  │
│ Products │  │ Bookings │  │ Reviews  │
└──────────┘  └──────────┘  └──────────┘
   (Blue)       (Green)       (Amber)
```

### Creator Actions
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  ┌────┐  │  │  ┌────┐  │  │  ┌────┐  │
│  │ ✨ │  │  │  │ 📝 │  │  │  │ 🔗 │  │
│  └────┘  │  │  └────┘  │  │  └────┘  │
│ Featured │  │  Posts   │  │  Links   │
└──────────┘  └──────────┘  └──────────┘
   (Pink)       (Purple)      (Blue)
```

---

## ProfileSectionTabs - Visual States

### Inactive Tab
```
┌──────────────┐
│  🎵  Music   │  Border: transparent
└──────────────┘  Background: theme subtle
                  Text: textSecondary
```

### Active Tab
```
┌──────────────┐
│  🎵  Music   │  Border: accentPrimary (2px)
└──────────────┘  Background: accent tinted
                  Text: accentPrimary (bold)
                  Shadow: accent glow
```

### Scrollable Layout
```
┌─────────────────────────────────────────┐
│                                         │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ → │
│  │Tab1│ │Tab2│ │Tab3│ │Tab4│ │Tab5│   │
│  └────┘ └────┘ └────┘ └────┘ └────┘   │
│                                         │
│  ◄──── Horizontal Scroll ────────────► │
└─────────────────────────────────────────┘
```

---

## Integration Pattern

```typescript
// Parent component controls all state
const [profileType, setProfileType] = useState<ProfileType>('musician');
const [activeTab, setActiveTab] = useState('about');

return (
  <View>
    {/* Hero Section */}
    <View style={styles.heroCard}>
      <Image source={avatar} />
      <Text>{displayName}</Text>
      <Text>@{username}</Text>
      
      {/* 1. Type Badge */}
      <ProfileTypeBadge profileType={profileType} />
      
      <Text>{bio}</Text>
      
      {/* 2. Quick Actions */}
      <ProfileQuickActionsRow 
        profileType={profileType}
        onPlay={() => handlePlay()}
        onShows={() => handleShows()}
        onMerch={() => handleMerch()}
      />
      
      <View style={styles.buttons}>
        <Button>Follow</Button>
        <Button>Message</Button>
      </View>
    </View>
    
    {/* 3. Section Tabs */}
    <ProfileSectionTabs
      profileType={profileType}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
    
    {/* 4. Section Content (parent renders) */}
    {activeTab === 'about' && <AboutSection />}
    {activeTab === 'music' && <MusicSection />}
    {/* etc... */}
  </View>
);
```

---

## Responsive Behavior

### Mobile Portrait
- Badge: Centered below username
- Quick Actions: 3 buttons in a row, centered
- Section Tabs: Horizontal scroll enabled

### Mobile Landscape
- Same layout, more horizontal space
- Tabs may not need to scroll if all fit

### Theme Switching
- All components automatically adapt to light/dark mode
- Color contrasts maintained in both themes
- Shadows/borders adjust for visibility

---

## Interaction States

### Badge
- Static display (no interaction)

### Quick Actions
- **Default**: Subtle background
- **Pressed**: Opacity 0.7, scale 0.96
- **Feedback**: Placeholder alert or custom handler

### Section Tabs
- **Default**: Muted colors
- **Active**: Accent color, border, shadow
- **Pressed**: Opacity 0.7, scale 0.97
- **Scroll**: Smooth horizontal scroll

---

## Accessibility Notes

### Touch Targets
- Quick action buttons: 42x42px icon area + padding
- Section tabs: Minimum 44px height
- All meet minimum touch target requirements

### Visual Clarity
- Emoji provide quick visual recognition
- Color alone not relied upon (labels included)
- High contrast text on all backgrounds

### Screen Reader Support
- All buttons have accessible labels
- State changes announced
- Logical tab order

---

## Performance Characteristics

### Rendering
- Components use `useMemo` for styles
- Minimal re-renders on state changes
- No expensive computations

### Memory
- Lightweight components
- No heavy dependencies
- Clean unmount behavior

### Animation
- Press states: scale + opacity
- Smooth at 60fps
- No layout thrashing

---

## Color Reference

```typescript
// Profile Type Colors
streamer:  #EF4444 (red)
musician:  #8B5CF6 (purple)
comedian:  #F59E0B (amber)
business:  #0EA5E9 (sky blue)
creator:   #EC4899 (pink)
default:   #6B7280 (gray)

// Quick Action Colors (varies by type)
red:    #EF4444
purple: #8B5CF6
amber:  #F59E0B
blue:   #0EA5E9
green:  #10B981
pink:   #EC4899
```

---

## Size Reference

```
Badge:
  - Height: ~28px (with padding)
  - Padding: 10px horizontal, 5px vertical
  - Border Radius: 12px
  - Font Size: 12px

Quick Actions:
  - Icon Container: 42x42px
  - Border Radius: 12px
  - Button Min Width: 80px
  - Label Font Size: 11px
  - Gap Between: 12px

Section Tabs:
  - Tab Height: ~40px (with padding)
  - Padding: 16px horizontal, 10px vertical
  - Border Radius: 20px (pill shape)
  - Active Border: 1.5px
  - Font Size: 13px
  - Gap Between: 8px
```



