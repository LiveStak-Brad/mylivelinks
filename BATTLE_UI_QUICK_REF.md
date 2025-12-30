# Battle UI Quick Reference

## Files Created (16 total)

### Shared Types
```
types/battle.ts
```

### Web Components (7 files)
```
components/battle/
├── BattleViewer.tsx          [Main container]
├── BattleScoreBar.tsx        [Score + timer]
├── BattleTile.tsx            [Video tile]
├── BattleTopSupporters.tsx   [Top gifters]
├── BattleControls.tsx        [Bottom controls]
├── BattleGiftButton.tsx      [Gift + side picker]
└── index.ts                  [Exports]
```

### Mobile Components (8 files)
```
mobile/
├── types/battle.ts
├── screens/BattleScreen.tsx
└── components/battle/
    ├── BattleScoreBar.tsx
    ├── BattleTile.tsx
    ├── BattleTileGrid.tsx
    ├── BattleTopSupporters.tsx
    ├── BattleControls.tsx
    ├── BattleGiftButton.tsx
    └── index.ts
```

## Usage

### Web
```tsx
import { BattleViewer } from '@/components/battle';

<BattleViewer battle={battleData} onClose={handleClose} />
```

### Mobile
```tsx
import { BattleScreen } from './screens/BattleScreen';

<BattleScreen 
  battle={battleData} 
  onClose={handleClose}
  onNavigateWallet={handleWallet}
/>
```

## Key Features

✅ **TikTok-style split screen** (Side A | Side B)  
✅ **Cameras-only layout** (enforced for web participants)  
✅ **Dynamic grids** (1-6 tiles per side)  
✅ **Real-time scores** + countdown timer  
✅ **Gift system** with side selection  
✅ **Top supporters** per side (🥇🥈🥉)  
✅ **Platform badges** (💻 web / 📱 mobile)  
✅ **Optional chat** (non-blocking overlay)  
✅ **Cross-platform parity**  

## Layout Rules

```
ANY web participant → cameras_only layout
mobile vs mobile → cameras_only (default for parity)
```

## Components Overview

| Component | Purpose | Props |
|-----------|---------|-------|
| BattleViewer/Screen | Main container | battle, onClose |
| BattleScoreBar | Top bar (scores + timer) | teamA, teamB, remainingSeconds |
| BattleTile | Video tile | participant, side, sideColor |
| BattleTopSupporters | Top 3 gifters | supporters, side, sideColor |
| BattleControls | Bottom controls | battleId, onGift, onShare, onReport |
| BattleGiftButton | Gift with side picker | selectedSide, onSelectSide, onSendGift |

## Next Steps

1. Backend integration (API endpoints for battles)
2. Supabase realtime subscriptions
3. Gift system integration (battle-specific)
4. Chat persistence
5. Battle history/leaderboards

---

See **BATTLE_UI_DELIVERABLE.md** for full documentation.

