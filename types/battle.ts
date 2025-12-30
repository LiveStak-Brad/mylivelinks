/**
 * Battle Types - Shared between Web and Mobile
 * TikTok-style battle format with split screen, teams, and gift battles
 */

export type BattleSide = 'A' | 'B';

export interface BattleParticipant {
  id: string;
  username: string;
  avatar_url?: string;
  side: BattleSide;
  is_team_leader?: boolean;
  video_track?: any; // LiveKit track
  audio_track?: any;
  is_camera_enabled?: boolean;
  is_mic_enabled?: boolean;
  platform: 'web' | 'mobile'; // Track platform for layout rules
}

export interface BattleSupporter {
  id: string;
  username: string;
  avatar_url?: string;
  total_coins_sent: number;
  gifter_level: number;
  badge_name?: string;
  badge_color?: string;
}

export interface BattleTeam {
  side: BattleSide;
  score: number; // Total coins received this battle
  participants: BattleParticipant[];
  top_supporters: BattleSupporter[];
  color: string; // Theme color for side A or B
}

export interface Battle {
  id: string;
  room_name: string;
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  remaining_seconds?: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  team_a: BattleTeam;
  team_b: BattleTeam;
  winner?: BattleSide;
  
  // Layout rules
  has_web_participant: boolean; // If true, force cameras-only layout
  layout_mode: 'cameras_only' | 'chat_focus'; // cameras_only for web participants
}

export interface BattleGift {
  id: string;
  battle_id: string;
  sender_id: string;
  sender_username: string;
  recipient_side: BattleSide;
  gift_type_id: number;
  gift_name: string;
  gift_icon?: string;
  coin_amount: number;
  sent_at: string;
}

export interface BattleState {
  battle: Battle | null;
  is_loading: boolean;
  error: string | null;
  selected_side?: BattleSide; // For gift sending
}

/**
 * Battle Layout Rules:
 * 1. If ANY participant is on web → cameras_only layout (no chat focus)
 * 2. If ALL participants are on mobile → can still use cameras_only for parity
 * 3. TikTok-style split screen: Side A vs Side B
 * 4. 1-6 video tiles per side (grid layout within each side)
 * 5. Score bar at top, controls at bottom, minimal overlay
 */

