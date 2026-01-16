import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import WatchScreen from '../screens/WatchScreen';
import HomeScreen from '../screens/HomeScreen';
import FeedScreen from '../screens/FeedScreen';
import GoLiveScreen from '../screens/GoLiveScreen';
import LiveTVScreen from '../screens/LiveTVScreen';
import MessagesScreen from '../screens/MessagesScreen';
import IMThreadScreen from '../screens/IMThreadScreen';
import NotiesScreen from '../screens/NotiesScreen';

import ActivityScreen from '../screens/ActivityScreen';
import ApplyScreen from '../screens/ApplyScreen';
import ComposerNewScreen from '../screens/ComposerNewScreen';
import ComposerProjectIdScreen from '../screens/ComposerProjectIdScreen';
import ComposerProjectScreen from '../screens/ComposerProjectScreen';
import ComposerScreen from '../screens/ComposerScreen';
import CreatorStudioHomeScreen from '../screens/CreatorStudioHomeScreen';
import CreatorStudioContentScreen from '../screens/CreatorStudioContentScreen';
import CreatorStudioUploadScreen from '../screens/CreatorStudioUploadScreen';
import CreatorStudioSeriesScreen from '../screens/CreatorStudioSeriesScreen';
import CreatorStudioPodcastsScreen from '../screens/CreatorStudioPodcastsScreen';
import CreatorStudioMoviesScreen from '../screens/CreatorStudioMoviesScreen';
import CreatorStudioMusicVideosScreen from '../screens/CreatorStudioMusicVideosScreen';
import CreatorStudioItemDetailScreen from '../screens/CreatorStudioItemDetailScreen';
import CreatorStudioMusicScreen from '../screens/CreatorStudioMusicScreen';
import CreatorStudioSettingsScreen from '../screens/CreatorStudioSettingsScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import GifterLevelsScreen from '../screens/GifterLevelsScreen';
import HelpSafetyScreen from '../screens/HelpSafetyScreen';
import InviteUserScreen from '../screens/InviteUserScreen';
import JoinScreen from '../screens/JoinScreen';
import LeaderboardsScreen from '../screens/LeaderboardsScreen';
import LinkAutoSwipeScreen from '../screens/LinkAutoSwipeScreen';
import LinkDatingMatchesScreen from '../screens/LinkDatingMatchesScreen';
import LinkDatingProfileScreen from '../screens/LinkDatingProfileScreen';
import LinkDatingScreen from '../screens/LinkDatingScreen';
import LinkDatingSwipeScreen from '../screens/LinkDatingSwipeScreen';
import LinkMutualsScreen from '../screens/LinkMutualsScreen';
import LinkProfileScreen from '../screens/LinkProfileScreen';
import LinkRegularScreen from '../screens/LinkRegularScreen';
import LinkRegularSwipeScreen from '../screens/LinkRegularSwipeScreen';
import LinkScreen from '../screens/LinkScreen';
import LinkSettingsScreen from '../screens/LinkSettingsScreen';
import LiveHostScreen from '../screens/LiveHostScreen';
import LiveScreen from '../screens/LiveScreen';
import LiveUserScreen from '../screens/LiveUserScreen';
import CuratorPlaylistPlayerScreen from '../screens/CuratorPlaylistPlayerScreen';
import LoginScreen from '../screens/LoginScreen';
import MllProApplyScreen from '../screens/MllProApplyScreen';
import MllProScreen from '../screens/MllProScreen';
import MyAnalyticsScreen from '../screens/MyAnalyticsScreen';
import OAuthConsentScreen from '../screens/OAuthConsentScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import OwnerPanelScreen from '../screens/OwnerPanelScreen';
import PoliciesDataDeletionScreen from '../screens/PoliciesDataDeletionScreen';
import PoliciesScreen from '../screens/PoliciesScreen';
import PolicyDetailScreen from '../screens/PolicyDetailScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProfileViewScreen from '../screens/ProfileViewScreen';
import ReferralsScreen from '../screens/ReferralsScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import RoomScreen from '../screens/RoomScreen';
import RoomSlugScreen from '../screens/RoomSlugScreen';
import SearchLiveScreen from '../screens/SearchLiveScreen';
import SearchMediaScreen from '../screens/SearchMediaScreen';
import SearchMusicScreen from '../screens/SearchMusicScreen';
import SearchPeopleScreen from '../screens/SearchPeopleScreen';
import SearchPostsScreen from '../screens/SearchPostsScreen';
import SearchScreen from '../screens/SearchScreen';
import SearchTeamsScreen from '../screens/SearchTeamsScreen';
import SearchVideosScreen from '../screens/SearchVideosScreen';
import SettingsAccountScreen from '../screens/SettingsAccountScreen';
import SettingsEmailScreen from '../screens/SettingsEmailScreen';
import SettingsPasswordScreen from '../screens/SettingsPasswordScreen';
import SettingsProfileScreen from '../screens/SettingsProfileScreen';
import SettingsUsernameScreen from '../screens/SettingsUsernameScreen';
import SignupScreen from '../screens/SignupScreen';
import TeamsAdminScreen from '../screens/TeamsAdminScreen';
import TeamsDetailScreen from '../screens/TeamsDetailScreen';
import TeamsInviteScreen from '../screens/TeamsInviteScreen';
import TeamsRoomScreen from '../screens/TeamsRoomScreen';
import TeamsScreen from '../screens/TeamsScreen';
import TeamsSetupScreen from '../screens/TeamsSetupScreen';
import TermsScreen from '../screens/TermsScreen';
import UnsubscribeScreen from '../screens/UnsubscribeScreen';
import UserAnalyticsScreen from '../screens/UserAnalyticsScreen';
import UserFeedScreen from '../screens/UserFeedScreen';
import UserPhotosScreen from '../screens/UserPhotosScreen';
import WalletScreen from '../screens/WalletScreen';
import MediaViewerScreen from '../screens/MediaViewerScreen';
import BlockedUsersScreen from '../screens/BlockedUsersScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import ReplayScreen from '../screens/ReplayScreen';
import ReplayPlaylistsScreen from '../screens/ReplayPlaylistsScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../theme/useTheme';
import { brand } from '../theme/colors';

const Tabs = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

function TabsNavigator() {
  const { colors } = useTheme();
  return (
    <Tabs.Navigator
      initialRouteName="Watch"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: (colors as any).tabBarBg ?? colors.surface,
          borderTopColor: (colors as any).tabBarBorder ?? colors.border,
          paddingTop: 8,
        },
        tabBarActiveTintColor: (colors as any).tabIconActive ?? brand.primary,
        tabBarInactiveTintColor: (colors as any).tabIconInactive ?? colors.mutedText,
        tabBarIcon: ({ size, focused, color }) => {
          let name: React.ComponentProps<typeof Ionicons>['name'];

          switch (route.name) {
            case 'Watch':
              name = focused ? 'play-circle' : 'play-circle-outline';
              break;
            case 'Home':
              name = focused ? 'home' : 'home-outline';
              break;
            case 'Feed':
              name = focused ? 'newspaper' : 'newspaper-outline';
              break;
            case 'Go Live':
              name = focused ? 'videocam' : 'videocam-outline';
              break;
            case 'LiveTV':
              name = focused ? 'tv' : 'tv-outline';
              break;
            case 'Profile':
              name = focused ? 'person' : 'person-outline';
              break;
            default:
              name = focused ? 'ellipse' : 'ellipse-outline';
          }

          return (
            <Ionicons
              name={name}
              size={focused ? size : size - 2}
              color={color}
            />
          );
        },
      })}
    >
      {/* Bottom nav order: Watch, Home, Feed, Go Live, LiveTV, Profile */}
      <Tabs.Screen 
        name="Watch" 
        component={WatchScreen}
      />
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Feed" component={FeedScreen} />
      <Tabs.Screen
        name="Go Live"
        component={GoLiveScreen}
        options={{ tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen name="LiveTV" component={LiveTVScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

export default function RootNavigator({ header }: { header: () => React.ReactNode }) {
  const { loading, session } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom', 'left', 'right']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.text }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <RootStack.Navigator
        initialRouteName="LoginScreen"
        screenOptions={{
          header,
        }}
      >
        <RootStack.Screen name="LoginScreen" component={LoginScreen} />
        <RootStack.Screen name="SignupScreen" component={SignupScreen} />
        <RootStack.Screen name="ResetPasswordScreen" component={ResetPasswordScreen} />
      </RootStack.Navigator>
    );
  }

  return (
    <RootStack.Navigator
      screenOptions={{
        header,
        headerShadowVisible: false,
      }}
    >
      <RootStack.Screen
        name="Tabs"
        component={TabsNavigator}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'Watch';
          return {
            headerShown: routeName !== 'Go Live',
          };
        }}
      />

      {/* Placeholder menu destinations */}
      <RootStack.Screen name="OwnerPanelScreen" component={OwnerPanelScreen} />
      <RootStack.Screen name="HelpSafetyScreen" component={HelpSafetyScreen} />
      <RootStack.Screen name="TermsScreen" component={TermsScreen} />
      <RootStack.Screen name="PrivacyScreen" component={PrivacyScreen} />

      {/* Existing screens (required wiring list + extras already present in repo) */}
      <RootStack.Screen name="ActivityScreen" component={ActivityScreen} />
      <RootStack.Screen name="ApplyScreen" component={ApplyScreen} />
      <RootStack.Screen name="ComposerNewScreen" component={ComposerNewScreen} />
      <RootStack.Screen name="ComposerProjectIdScreen" component={ComposerProjectIdScreen} />
      <RootStack.Screen name="ComposerProjectScreen" component={ComposerProjectScreen} />
      <RootStack.Screen name="ComposerScreen" component={ComposerScreen} />
      <RootStack.Screen name="CreatorStudioHomeScreen" component={CreatorStudioHomeScreen} />
      <RootStack.Screen name="CreatorStudioContentScreen" component={CreatorStudioContentScreen} />
      <RootStack.Screen name="CreatorStudioUploadScreen" component={CreatorStudioUploadScreen} />
      <RootStack.Screen name="CreatorStudioSeriesScreen" component={CreatorStudioSeriesScreen} />
      <RootStack.Screen name="CreatorStudioPodcastsScreen" component={CreatorStudioPodcastsScreen} />
      <RootStack.Screen name="CreatorStudioMoviesScreen" component={CreatorStudioMoviesScreen} />
      <RootStack.Screen name="CreatorStudioMusicVideosScreen" component={CreatorStudioMusicVideosScreen} />
      <RootStack.Screen name="CreatorStudioItemDetailScreen" component={CreatorStudioItemDetailScreen} />
      <RootStack.Screen name="CreatorStudioMusicScreen" component={CreatorStudioMusicScreen} />
      <RootStack.Screen name="CreatorStudioSettingsScreen" component={CreatorStudioSettingsScreen} />
      <RootStack.Screen name="DiscoverScreen" component={DiscoverScreen} />
      <RootStack.Screen name="GifterLevelsScreen" component={GifterLevelsScreen} />
      <RootStack.Screen name="InviteUserScreen" component={InviteUserScreen} />
      <RootStack.Screen name="JoinScreen" component={JoinScreen} />
      <RootStack.Screen name="LeaderboardsScreen" component={LeaderboardsScreen} />
      <RootStack.Screen name="LinkAutoSwipeScreen" component={LinkAutoSwipeScreen} />
      <RootStack.Screen name="LinkDatingMatchesScreen" component={LinkDatingMatchesScreen} />
      <RootStack.Screen name="LinkDatingProfileScreen" component={LinkDatingProfileScreen} />
      <RootStack.Screen name="LinkDatingScreen" component={LinkDatingScreen} />
      <RootStack.Screen name="LinkDatingSwipeScreen" component={LinkDatingSwipeScreen} />
      <RootStack.Screen name="LinkMutualsScreen" component={LinkMutualsScreen} />
      <RootStack.Screen name="LinkProfileScreen" component={LinkProfileScreen} />
      <RootStack.Screen name="LinkRegularScreen" component={LinkRegularScreen} />
      <RootStack.Screen name="LinkRegularSwipeScreen" component={LinkRegularSwipeScreen} />
      <RootStack.Screen name="LinkScreen" component={LinkScreen} />
      <RootStack.Screen name="LinkSettingsScreen" component={LinkSettingsScreen} />
      <RootStack.Screen name="IMThreadScreen" component={IMThreadScreen} />
      <RootStack.Screen name="LiveHostScreen" component={LiveHostScreen} />
      <RootStack.Screen name="LiveScreen" component={LiveScreen} />
      <RootStack.Screen name="LiveUserScreen" component={LiveUserScreen} />
      <RootStack.Screen name="ReplayScreen" component={ReplayScreen} />
      <RootStack.Screen name="ReplayPlaylistsScreen" component={ReplayPlaylistsScreen} />
      <RootStack.Screen name="CuratorPlaylistPlayerScreen" component={CuratorPlaylistPlayerScreen} />
      <RootStack.Screen name="MessagesScreen" component={MessagesScreen} />
      <RootStack.Screen name="MllProApplyScreen" component={MllProApplyScreen} />
      <RootStack.Screen name="MllProScreen" component={MllProScreen} />
      <RootStack.Screen name="MyAnalyticsScreen" component={MyAnalyticsScreen} />
      <RootStack.Screen name="NotiesScreen" component={NotiesScreen} />
      <RootStack.Screen name="OAuthConsentScreen" component={OAuthConsentScreen} />
      <RootStack.Screen name="OnboardingScreen" component={OnboardingScreen} />
      <RootStack.Screen name="PoliciesDataDeletionScreen" component={PoliciesDataDeletionScreen} />
      <RootStack.Screen name="PoliciesScreen" component={PoliciesScreen} />
      <RootStack.Screen name="PolicyDetailScreen" component={PolicyDetailScreen} />
      <RootStack.Screen name="ProfileScreen" component={ProfileScreen} />
      <RootStack.Screen name="ProfileViewScreen" component={ProfileViewScreen} />
      <RootStack.Screen name="ReferralsScreen" component={ReferralsScreen} />
      <RootStack.Screen name="ResetPasswordScreen" component={ResetPasswordScreen} />
      <RootStack.Screen name="RoomScreen" component={RoomScreen} />
      <RootStack.Screen name="RoomSlugScreen" component={RoomSlugScreen} />
      <RootStack.Screen name="SearchLiveScreen" component={SearchLiveScreen} />
      <RootStack.Screen name="SearchMediaScreen" component={SearchMediaScreen} />
      <RootStack.Screen name="SearchMusicScreen" component={SearchMusicScreen} />
      <RootStack.Screen name="SearchPeopleScreen" component={SearchPeopleScreen} />
      <RootStack.Screen name="SearchPostsScreen" component={SearchPostsScreen} />
      <RootStack.Screen name="SearchScreen" component={SearchScreen} />
      <RootStack.Screen name="SearchTeamsScreen" component={SearchTeamsScreen} />
      <RootStack.Screen name="SearchVideosScreen" component={SearchVideosScreen} />
      <RootStack.Screen name="SettingsAccountScreen" component={SettingsAccountScreen} />
      <RootStack.Screen name="SettingsEmailScreen" component={SettingsEmailScreen} />
      <RootStack.Screen name="SettingsPasswordScreen" component={SettingsPasswordScreen} />
      <RootStack.Screen name="SettingsProfileScreen" component={SettingsProfileScreen} />
      <RootStack.Screen name="SettingsUsernameScreen" component={SettingsUsernameScreen} />
      <RootStack.Screen name="SignupScreen" component={SignupScreen} />
      <RootStack.Screen name="TeamsAdminScreen" component={TeamsAdminScreen} />
      <RootStack.Screen name="TeamsDetailScreen" component={TeamsDetailScreen} />
      <RootStack.Screen name="TeamsInviteScreen" component={TeamsInviteScreen} />
      <RootStack.Screen name="TeamsRoomScreen" component={TeamsRoomScreen} />
      <RootStack.Screen name="TeamsScreen" component={TeamsScreen} />
      <RootStack.Screen name="TeamsSetupScreen" component={TeamsSetupScreen} />
      <RootStack.Screen name="UnsubscribeScreen" component={UnsubscribeScreen} />
      <RootStack.Screen name="UserAnalyticsScreen" component={UserAnalyticsScreen} />
      <RootStack.Screen name="UserFeedScreen" component={UserFeedScreen} />
      <RootStack.Screen name="UserPhotosScreen" component={UserPhotosScreen} />
      <RootStack.Screen name="WalletScreen" component={WalletScreen} />
      <RootStack.Screen name="BlockedUsersScreen" component={BlockedUsersScreen} />
      <RootStack.Screen name="PostDetailScreen" component={PostDetailScreen} />

      {/* Full-screen media viewer (Facebook-style expand) */}
      <RootStack.Screen
        name="MediaViewer"
        component={MediaViewerScreen}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          contentStyle: { backgroundColor: '#000000' },
          gestureEnabled: true,
        }}
      />
    </RootStack.Navigator>
  );
}

