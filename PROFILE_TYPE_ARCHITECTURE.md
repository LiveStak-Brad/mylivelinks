# Profile Type System Architecture

## 📐 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         PROFILE SCREEN                          │
│                   (mobile/screens/ProfileScreen.tsx)            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ reads profile_type
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PROFILE TYPE CONFIG                           │
│              (mobile/config/profileTypeConfig.ts)               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PROFILE_TYPE_CONFIG = {                                  │  │
│  │   streamer: { tabs: [...], sections: [...], actions }   │  │
│  │   musician: { tabs: [...], sections: [...], actions }   │  │
│  │   comedian: { tabs: [...], sections: [...], actions }   │  │
│  │   business: { tabs: [...], sections: [...], actions }   │  │
│  │   creator:  { tabs: [...], sections: [...], actions }   │  │
│  │   default:  { tabs: [...], sections: [...], actions }   │  │
│  │ }                                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ provides enabled tabs/sections
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CONDITIONAL RENDERING                       │
│                                                                 │
│  Tabs:     [Info] [Music] [Videos] [Events] [Photos]          │
│                                                                 │
│  Sections: ✓ Hero Card                                        │
│            ✓ Music Showcase  ◄─────────┐                      │
│            ✓ Upcoming Events            │                      │
│            ✓ Social Media               │                      │
│            ✗ Streaming Stats (hidden)   │ Mock Data           │
│                                         │                      │
└─────────────────────────────────────────┼──────────────────────┘
                                          │
                                          │
                       ┌──────────────────┴──────────────────────┐
                       │      MOCK DATA PROVIDERS                │
                       │  (mobile/config/mockDataProviders.ts)   │
                       │                                         │
                       │  • getMockMusicShowcase()              │
                       │  • getMockUpcomingEvents()             │
                       │  • getMockMerchandise()                │
                       │  • getMockBusinessInfo()               │
                       │  • getMockPortfolio()                  │
                       └─────────────────────────────────────────┘
```

## 🔄 Data Flow

### 1. Profile Load
```
User navigates to profile
    ↓
API fetches profile data (includes profile_type)
    ↓
ProfileScreen component receives data
    ↓
Extract profile_type (default: 'default')
```

### 2. Configuration Lookup
```
profile_type = 'musician'
    ↓
getEnabledTabs('musician')
    ↓
Returns: [info, music, videos, events, photos]
    ↓
getEnabledSections('musician')
    ↓
Returns: [hero, music_showcase, upcoming_events, ...]
```

### 3. Rendering
```
For each enabledTab:
    ↓
  Render tab button with correct icon/label
    ↓
For each enabledSection:
    ↓
  Check if section has data
    ↓
  If yes: Render section
  If no: Show empty state or hide
```

## 📊 Configuration Structure

```typescript
{
  tabs: [
    { id: 'music', label: 'Music', icon: 'musical-notes', enabled: true }
  ],
  sections: [
    { id: 'music_showcase', enabled: true, order: 2 }
  ],
  quickActions: [
    { id: 'book_event', label: 'Book', icon: 'calendar', enabled: true }
  ]
}
```

## 🎯 Component Hierarchy

```
ProfileScreen
│
├── Hero Card (always shown)
│   ├── Avatar
│   ├── Display Name
│   ├── Bio
│   └── Quick Actions ◄─── Conditional based on profile_type
│
├── Tab Bar ◄─── Dynamic tabs based on profile_type
│   ├── Info Tab
│   ├── Music Tab (if enabled)
│   ├── Videos Tab (if enabled)
│   └── ...
│
└── Tab Content
    │
    ├── Info Tab Content
    │   │
    │   ├── Social Counts ◄─── if isSectionEnabled('social_counts')
    │   ├── Music Showcase ◄─── if isSectionEnabled('music_showcase')
    │   ├── Top Supporters ◄─── if isSectionEnabled('top_supporters')
    │   ├── Streaming Stats ◄─── if isSectionEnabled('streaming_stats')
    │   ├── Social Media ◄─── if isSectionEnabled('social_media')
    │   ├── Connections ◄─── if isSectionEnabled('connections')
    │   ├── Links ◄─── if isSectionEnabled('links')
    │   ├── Profile Stats ◄─── if isSectionEnabled('profile_stats')
    │   └── Footer ◄─── if isSectionEnabled('footer')
    │
    ├── Feed Tab Content
    ├── Photos Tab Content
    └── ...
```

## 🔌 Integration Points

### Current (Mock Data)
```
ProfileScreen
    ↓
getMockMusicShowcase(profileType)
    ↓
Returns placeholder data
    ↓
Renders in UI
```

### Future (Real Data)
```
ProfileScreen
    ↓
fetchUserMusic(userId, profileType)
    ↓
API call to Logic Manager
    ↓
Returns real data from database
    ↓
Renders in UI (same UI code!)
```

## 📦 File Dependencies

```
ProfileScreen.tsx
  ├── imports profileTypeConfig.ts
  │     ├── getEnabledTabs()
  │     ├── getEnabledSections()
  │     └── isSectionEnabled()
  │
  └── imports mockDataProviders.ts
        ├── getMockMusicShowcase()
        ├── getMockUpcomingEvents()
        └── getMockMerchandise()
```

## 🎨 Profile Type Comparison Matrix

| Feature | Streamer | Musician | Comedian | Business | Creator | Default |
|---------|----------|----------|----------|----------|---------|---------|
| **Tabs** | 4 | 5 | 4 | 3 | 4 | 3 |
| Music Tab | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Events Tab | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Products Tab | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Sections** | 10 | 9 | 8 | 8 | 7 | 6 |
| Streaming Stats | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Music Showcase | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Events | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Business Info | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Portfolio | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Actions** | 5 | 4 | 4 | 3 | 4 | 3 |
| Tip Button | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Book Button | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Contact Button | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

## 🚀 Extension Path

### Adding a New Profile Type

```
1. Add to ProfileType union
   └── mobile/config/profileTypeConfig.ts

2. Add configuration entry
   └── PROFILE_TYPE_CONFIG.newType = { ... }

3. Done! UI automatically adapts
```

### Adding a New Section

```
1. Add to ProfileSection type
   └── mobile/config/profileTypeConfig.ts

2. Add to relevant type configs
   └── PROFILE_TYPE_CONFIG[type].sections.push(...)

3. Create UI component
   └── mobile/screens/ProfileScreen.tsx

4. Wrap with conditional
   └── {isSectionEnabled('new_section', profileType) && <NewSection />}

5. Done!
```

## 💡 Key Design Decisions

1. **Centralized Config** - One source of truth for all profile types
2. **Placeholder Data** - Mock providers for easy testing without backend
3. **Conditional Rendering** - Sections hidden/shown based on config
4. **Type Safety** - Full TypeScript support for compile-time checks
5. **Easy Swap** - Mock → Real data with minimal code changes
6. **No UI Redesign** - Uses existing ProfileScreen components
7. **Backward Compatible** - Default type works for existing profiles

## 🎯 Success Criteria

- ✅ Tabs dynamically render based on profile type
- ✅ Sections conditionally show/hide
- ✅ Mock data works for testing
- ✅ Easy integration path for real data
- ✅ Type-safe implementation
- ✅ No linter errors
- ✅ Backward compatible
- ✅ Documentation complete


