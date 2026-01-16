/**
 * Custom Hooks
 */

export { useLiveKit } from './useLiveKit';
export { useLiveKitPublisher } from './useLiveKitPublisher';
export { useOptimizedSubscription } from './useOptimizedSubscription';
export { useRoomPresence } from './useRoomPresence';
export { useViewerHeartbeat } from './useViewerHeartbeat';
export { useIsMobileWeb } from './useIsMobileWeb';
export { useOrientation } from './useOrientation';
export { 
  useVideoFilterPipeline, 
  loadFilterSettings, 
  saveFilterSettings, 
  areFiltersDefault,
  DEFAULT_FILTER_SETTINGS 
} from './useVideoFilterPipeline';
export type { VideoFilterSettings } from './useVideoFilterPipeline';
export { useOwnerPanelData } from './useOwnerPanelData';
export { useOwnerLiveOpsData } from './useOwnerLiveOpsData';
export { useSupportBadgeCounts, useOwnerSupportTickets } from './useOwnerSupportInbox';
export { useTeamChatStyle } from './useTeamChatStyle';
export type { TeamChatStyle } from './useTeamChatStyle';

// Gift reply status hook
export { useGiftReplyStatus, getGiftReplyStatus } from './useGiftReplyStatus';
export type {
  Gift as GiftReplyGift,
  GiftReplyStatus,
  UseGiftReplyStatusOptions,
  UseGiftReplyStatusReturn,
} from './useGiftReplyStatus';

// Team hooks
export {
  useTeam,
  useTeamMembership,
  useTeamFeed,
  useTeamMembers,
  useTeamPresence,
  useTeamLiveRooms,
  useTeamChat,
  useCreatePost,
  useReactToPost,
  useJoinTeam,
  useLeaveTeam,
  teamKeys,
} from './useTeam';
export type {
  FeedSort,
  MemberFilter,
  MemberActivity,
  TeamMember,
  FeedItem,
  ChatMessage,
  LiveRoom,
} from './useTeam';
export type {
  OwnerPanelData,
  DashboardStats,
  PlatformHealth,
  LiveStreamInfo,
  ReportInfo,
  UseOwnerPanelDataReturn,
} from './useOwnerPanelData';
export type {
  LiveOpsStreamData,
  UseOwnerLiveOpsDataReturn,
} from './useOwnerLiveOpsData';

// Call session hook for 1:1 voice/video calls
export { useCallSessionWeb } from './useCallSessionWeb';
export type {
  CallStatus,
  CallType,
  CallParticipant,
  IncomingCall,
  ActiveCall,
} from './useCallSessionWeb';

