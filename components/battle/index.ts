/**
 * Battle Components - Web
 * Export all battle-related components for easy import
 */

// Existing Battle Components
export { default as BattleViewer } from './BattleViewer';
export { default as BattleScoreBar } from './BattleScoreBar';
export { default as BattleTile } from './BattleTile';
export { default as BattleTopSupporters } from './BattleTopSupporters';
export { default as BattleControls } from './BattleControls';
export { default as BattleGiftButton } from './BattleGiftButton';

// NEW: Multi-Host Grid System (for Cohosting & Battles)
export { default as MultiHostGrid, BattleOverlayPlaceholder } from './MultiHostGrid';
export type { GridMode, ParticipantVolume } from './MultiHostGrid';
export { default as GridTile } from './GridTile';
export type { GridTileParticipant } from './GridTile';

// Battle HUD Overlay
export { default as BattleTileOverlay, generateMockBattleStates, BATTLE_COLORS, TEAM_COLORS } from './BattleTileOverlay';
export type { BattleMode, BattleParticipantState } from './BattleTileOverlay';

// Battle Score Slider (top bar showing score distribution)
export { default as BattleScoreSlider } from './BattleScoreSlider';

// NEW: Battle Session Components
export { default as BattleTimer } from './BattleTimer';
export { default as CooldownSheet } from './CooldownSheet';
export { default as BattleGridWrapper } from './BattleGridWrapper';

// Top Gifters Display (used in bottom row of battle grid)
export { default as TopGiftersDisplay } from './TopGiftersDisplay';
export type { TeamTopGifter } from './TopGiftersDisplay';