// Mobile Owner Panel: Reports Parity (canonical commit)
import type { NavigatorScreenParams } from '@react-navigation/native';
 import type { PolicyId } from '../../shared/policies';

// Root stack for authentication and initial flow
export type RootStackParamList = {
  Gate: undefined;
  Auth: undefined;
  CreateProfile: undefined;
  MainTabs: NavigatorScreenParams<MainTabsParamList> | undefined;
  Rooms: undefined;
  SoloStreamViewer: { username: string };
  SoloHostStream: undefined;
  SafetyPolicies: undefined;
  PolicyDetail: { id: PolicyId };
  Wallet: undefined;
  Transactions: undefined;
  MyAnalytics: undefined;
  EditProfile: undefined;
  RoomRules: undefined;
  HelpFAQ: undefined;
  BlockedUsers: undefined;
  ReportUser:
    | {
        reportedUserId?: string;
        reportedUsername?: string;
        reportType?: 'user' | 'stream' | 'profile' | 'chat';
        contextDetails?: string;
      }
    | undefined;
  Theme: undefined;
  Referrals: undefined;
  ReferralsLeaderboard: undefined;
  OwnerPanel: undefined;
  OwnerReferrals: undefined;
  OwnerRevenue: undefined;
  OwnerCoinsRevenue: undefined;
  OwnerFeatureFlags: undefined;
  OwnerReports: undefined;
  LiveOps: undefined;
  ModerationPanel: undefined;
  AdminApplications: undefined;
  AdminGifts: undefined;
  ComposerList: undefined;
  ComposerEditor: { draftId?: string | null; clipData?: any } | undefined;
  Profile: { username?: string };
  ProfileRoute: { username: string };
  ApplyForRoom: undefined;
};

// Bottom tab navigator param list (matches WEB bottom nav)
export type MainTabsParamList = {
  Home: undefined;
  Feed: undefined;
  GoLive: undefined;
  Teams: undefined;
  Profile: { username?: string } | undefined;
  Messages: { openUserId?: string; openUsername?: string } | undefined;
  Noties: undefined;
};

// Teams nested stack navigator
export type TeamsStackParamList = {
  TeamsSetup: undefined;
  TeamsHome: undefined;
};
