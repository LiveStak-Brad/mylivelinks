// Root stack for authentication and initial flow
export type RootStackParamList = {
  Gate: undefined;
  Auth: undefined;
  CreateProfile: undefined;
  MainTabs: undefined;
  Wallet: undefined;
  Transactions: undefined;
  MyAnalytics: undefined;
  EditProfile: undefined;
  RoomRules: undefined;
  HelpFAQ: undefined;
  BlockedUsers: undefined;
  ReportUser: { reportedUserId?: string; reportedUsername?: string } | undefined;
  Theme: undefined;
  OwnerPanel: undefined;
  ModerationPanel: undefined;
  AdminApplications: undefined;
  AdminGifts: undefined;
  Profile: { username?: string };
  ProfileRoute: { username: string };
};

// Bottom tab navigator param list (matches WEB bottom nav)
export type MainTabsParamList = {
  Home: undefined;
  Feed: undefined;
  Rooms: undefined;
  Messages: undefined;
  Noties: undefined;
  Profile: { username?: string };
};
