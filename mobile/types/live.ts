/**
 * Core types for live room functionality
 */

export interface Participant {
  identity: string;
  username: string;
  isSpeaking: boolean;
  isCameraEnabled: boolean;
  isMicEnabled: boolean;
  isLocal: boolean;
  viewerCount?: number;
}

export interface TileItem {
  id: string;
  participant: Participant | null;
  isAutofill: boolean;
}

export interface Message {
  id: string;
  username: string;
  text: string;
  timestamp: number;
}

export interface Viewer {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  value: number;
  avatarUrl?: string;
}

export interface RoomStats {
  viewerCount: number;
  liveCount: number;
  totalGiftsSent?: number;
  totalGiftsReceived?: number;
}

export type OverlayType = 'chat' | 'viewers' | 'menu' | 'stats' | 'gift' | null;

export interface LiveRoomUIState {
  activeOverlay: OverlayType;
  isConnected: boolean;
  // Gesture state (UI-only)
  isEditMode: boolean;
  focusedIdentity: string | null;
  tileSlots: string[]; // Array of 12 participant identities (ordered)
}

