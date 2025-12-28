import type { NavigatorScreenParams } from '@react-navigation/native';

// Root stack for authentication and initial flow
export type RootStackParamList = {
  Gate: undefined;
  Auth: undefined;
  CreateProfile: undefined;
  MainTabs: NavigatorScreenParams<MainTabsParamList> | undefined;
  Rooms: undefined;
  Wallet: undefined;
  Transactions: undefined;
  MyAnalytics: undefined;
  EditProfile: undefined;
  RoomRules: undefined;
  HelpFAQ: undefined;
  BlockedUsers: undefined;
  ReportUser: { reportedUserId?: string; reportedUsername?: string } | undefined;
  Theme: undefined;
  Referrals: undefined;
  ReferralsLeaderboard: undefined;
  OwnerPanel: undefined;
  ModerationPanel: undefined;
  AdminApplications: undefined;
  AdminGifts: undefined;
  ComposerList: undefined;
  ComposerEditor: { draftId?: string | null; clipData?: any } | undefined;
  Profile: { username?: string };
  ProfileRoute: { username: string };
};

// Bottom tab navigator param list (matches WEB bottom nav)
export type MainTabsParamList = {
  Home: undefined;
  Feed: undefined;
  Messages: { openUserId?: string; openUsername?: string } | undefined;
  Noties: undefined;
  Profile: { username?: string };
};
