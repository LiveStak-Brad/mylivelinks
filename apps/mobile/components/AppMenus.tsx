import React, { useMemo } from 'react';
import SlideMenu, { SlideMenuItem } from './SlideMenu';
import { useMenus } from '../state/MenusContext';
import { navTo, navToTab } from '../navigation/navigationRef';
import { useTheme } from '../theme/useTheme';
import { useCurrentUser } from '../hooks/useCurrentUser';

export default function AppMenus() {
  const menus = useMenus();
  const { mode, setMode } = useTheme();
  const currentUser = useCurrentUser();

  const leftItems = useMemo<SlideMenuItem[]>(
    () => [
      { key: 'owner', label: 'Owner Panel', onPress: () => navTo('OwnerPanelScreen') },
      { key: 'home', label: 'Home', onPress: () => navToTab('Home') },
      { key: 'feed', label: 'Feed', onPress: () => navToTab('Feed') },
      { key: 'trending', label: 'Trending', onPress: () => navTo('TrendingScreen') },
      { key: 'livetv', label: 'Live TV', onPress: () => navToTab('LiveTV') },
      { key: 'teams', label: 'Teams', onPress: () => navTo('TeamsScreen') },
      { key: 'leaderboards', label: 'Leaderboards', onPress: () => navTo('LeaderboardsScreen') },
      { key: 'gifter', label: 'Gifter Levels', onPress: () => navTo('GifterLevelsScreen') },
      { key: 'link', label: 'Link', onPress: () => navTo('LinkScreen') },
      { key: 'search', label: 'Search', onPress: () => navTo('SearchScreen') },
      { key: 'help', label: 'Help & Safety', onPress: () => navTo('HelpSafetyScreen') },
      { key: 'terms', label: 'Terms', onPress: () => navTo('TermsScreen') },
      { key: 'privacy', label: 'Privacy', onPress: () => navTo('PrivacyScreen') },
      { key: 'appearance-section', label: 'Appearance', type: 'section' },
      {
        key: 'appearance-toggle',
        label: 'Theme',
        rightIconName: mode === 'dark' ? 'moon-outline' : 'sunny-outline',
        onPress: () => setMode(mode === 'dark' ? 'light' : 'dark'),
      },
    ],
    [mode, setMode]
  );

  const rightItems = useMemo<SlideMenuItem[]>(
    () => [
      { 
        key: 'my-profile', 
        label: 'My Profile', 
        onPress: () => navTo('ProfileViewScreen', { profileId: currentUser.userId }) 
      },
      { key: 'edit-profile', label: 'Edit Profile', onPress: () => navTo('SettingsProfileScreen') },
      { key: 'account-settings', label: 'Account Settings', onPress: () => navTo('SettingsAccountScreen') },
      { key: 'login-security', label: 'Login & Security', onPress: () => navTo('SettingsPasswordScreen') },
      { key: 'wallet', label: 'Wallet & Coins', onPress: () => navTo('WalletScreen') },
      { key: 'referrals', label: 'Referrals', onPress: () => navTo('ReferralsScreen') },
      { key: 'notifications', label: 'Notifications', onPress: () => navToTab('Noties') },
      { key: 'messages', label: 'Messages', onPress: () => navToTab('Messages') },
      { key: 'link-profile', label: 'Link Profile', onPress: () => navTo('LinkProfileScreen') },
      { key: 'link-mutuals', label: 'Link Mutuals', onPress: () => navTo('LinkMutualsScreen') },
      { key: 'creator-analytics', label: 'Creator Analytics', onPress: () => navTo('MyAnalyticsScreen') },
      { key: 'composer', label: 'Composer', onPress: () => navTo('ComposerScreen') },
      { key: 'go-live', label: 'Go Live', onPress: () => navToTab('Go Live') },
      { key: 'purchases', label: 'Purchases', disabled: true, pillText: 'SOON' },
      { key: 'logout', label: 'Logout', tone: 'danger' },
    ],
    [currentUser.userId]
  );

  return (
    <>
      <SlideMenu
        side="left"
        visible={menus.isLeftOpen}
        title="Menu"
        items={leftItems.map((it) => ({
          ...it,
          onPress: it.onPress
            ? () => {
                menus.closeAll();
                it.onPress?.();
              }
            : undefined,
        }))}
        onRequestClose={menus.closeLeft}
      />

      <SlideMenu
        side="right"
        visible={menus.isRightOpen}
        title="Profile"
        items={rightItems.map((it) => ({
          ...it,
          onPress: it.onPress
            ? () => {
                menus.closeAll();
                it.onPress?.();
              }
            : undefined,
        }))}
        onRequestClose={menus.closeRight}
      />
    </>
  );
}

