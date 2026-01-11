---
description: Frontend architecture specification for live streaming platform with gifting, battles and social features
trigger: model_decision
---


# frontend-architecture

## Core Components Architecture

### Live Streaming Management
`mobile/screens/LiveRoomScreen.tsx` (Score: 85)
- Multi-participant streaming room orchestration
- Slot-based participant management with dynamic audio mixing
- Battle vs Solo mode configurations  
- Role-based publishing permissions system
- Custom gesture overlay navigation (swipe UP/DOWN/LEFT/RIGHT)

### Virtual Economy System  
`mobile/overlays/GiftOverlay.tsx` (Score: 80)
- Dual currency system (coins/diamonds)
- Gift transaction workflow
- Real-time balance management
- Multi-participant gifting

### Profile Management
`mobile/config/profileTypeConfig.ts` (Score: 70)
- Role-based profile types (streamer, musician, comedian)
- Feature availability matrix per profile type
- Module-based customization system
- Location privacy rules

### Live Operations
`mobile/screens/LiveOpsScreen.tsx` (Score: 75)
- Real-time stream monitoring dashboard
- Multi-region stream management
- Stream health tracking
- Operational control interfaces

## State Management

### Room State
`mobile/state/liveRoomUI.ts` (Score: 80)
- Participant state tracking
- Audio/video publishing permissions
- Role-based feature access
- Stream mode transitions

### Social Interactions
`mobile/overlays/ChatOverlay.tsx` (Score: 75)
- Chat level system
- Gift integration
- Moderation controls
- Real-time participant lists

## UI Patterns

### Stream Layouts
- Dynamic grid system for battle mode
- Solo streaming interface
- Picture-in-picture support
- Platform-specific optimizations

### Overlay System
- Gesture-based navigation
- Context-aware controls
- Multi-layer management
- Permission-based visibility

$END$

 If you're using this file in context, clearly say in italics in one small line that "Context added by Giga frontend-architecture" along with specifying exactly what information was used from this file in a human-friendly way, instead of using kebab-case use normal sentence case.