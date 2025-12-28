/**
 * SocialMediaIcons - Mobile component for social media icons
 * 
 * PARITY WITH WEB:
 * - Web uses lucide-react and custom SVG icons (components/profile/SocialMediaBar.tsx)
 * - Mobile uses styled Unicode symbols (no external icon dependencies in mobile/package.json)
 * - Both show clickable icons with platform-specific colors
 * - Both support same platforms: Instagram, Twitter, YouTube, TikTok, Facebook, 
 *   Twitch, Discord, Snapchat, LinkedIn, GitHub, Spotify, OnlyFans
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';

interface SocialMediaIconsProps {
  socials: {
    social_instagram?: string;
    social_twitter?: string;
    social_youtube?: string;
    social_tiktok?: string;
    social_facebook?: string;
    social_twitch?: string;
    social_discord?: string;
    social_snapchat?: string;
    social_linkedin?: string;
    social_github?: string;
    social_spotify?: string;
    social_onlyfans?: string;
  };
}

interface SocialIcon {
  platform: string;
  username: string;
  url: string;
  icon: string;
  color: string;
}

export function SocialMediaIcons({ socials }: SocialMediaIconsProps) {
  const socialLinks: SocialIcon[] = [];

  // Instagram
  if (socials.social_instagram) {
    socialLinks.push({
      platform: 'Instagram',
      username: socials.social_instagram,
      url: `https://instagram.com/${socials.social_instagram}`,
      icon: '📸',
      color: '#E4405F',
    });
  }

  // Twitter/X
  if (socials.social_twitter) {
    socialLinks.push({
      platform: 'Twitter',
      username: socials.social_twitter,
      url: `https://twitter.com/${socials.social_twitter}`,
      icon: '𝕏',
      color: '#000000',
    });
  }

  // YouTube
  if (socials.social_youtube) {
    socialLinks.push({
      platform: 'YouTube',
      username: socials.social_youtube,
      url: `https://youtube.com/@${socials.social_youtube}`,
      icon: '▶',
      color: '#FF0000',
    });
  }

  // TikTok
  if (socials.social_tiktok) {
    socialLinks.push({
      platform: 'TikTok',
      username: socials.social_tiktok,
      url: `https://tiktok.com/@${socials.social_tiktok}`,
      icon: '♪',
      color: '#000000',
    });
  }

  // Facebook
  if (socials.social_facebook) {
    socialLinks.push({
      platform: 'Facebook',
      username: socials.social_facebook,
      url: `https://facebook.com/${socials.social_facebook}`,
      icon: 'f',
      color: '#1877F2',
    });
  }

  // Twitch
  if (socials.social_twitch) {
    socialLinks.push({
      platform: 'Twitch',
      username: socials.social_twitch,
      url: `https://twitch.tv/${socials.social_twitch}`,
      icon: '🎮',
      color: '#9146FF',
    });
  }

  // Discord
  if (socials.social_discord) {
    socialLinks.push({
      platform: 'Discord',
      username: socials.social_discord,
      url: socials.social_discord.startsWith('http')
        ? socials.social_discord
        : `https://discord.gg/${socials.social_discord}`,
      icon: '💬',
      color: '#5865F2',
    });
  }

  // Snapchat
  if (socials.social_snapchat) {
    socialLinks.push({
      platform: 'Snapchat',
      username: socials.social_snapchat,
      url: `https://snapchat.com/add/${socials.social_snapchat}`,
      icon: '👻',
      color: '#FFFC00',
    });
  }

  // LinkedIn
  if (socials.social_linkedin) {
    socialLinks.push({
      platform: 'LinkedIn',
      username: socials.social_linkedin,
      url: `https://linkedin.com/in/${socials.social_linkedin}`,
      icon: 'in',
      color: '#0A66C2',
    });
  }

  // GitHub
  if (socials.social_github) {
    socialLinks.push({
      platform: 'GitHub',
      username: socials.social_github,
      url: `https://github.com/${socials.social_github}`,
      icon: '⌘',
      color: '#181717',
    });
  }

  // Spotify
  if (socials.social_spotify) {
    socialLinks.push({
      platform: 'Spotify',
      username: socials.social_spotify,
      url: `https://open.spotify.com/artist/${socials.social_spotify}`,
      icon: '🎧',
      color: '#1DB954',
    });
  }

  // OnlyFans
  if (socials.social_onlyfans) {
    socialLinks.push({
      platform: 'OnlyFans',
      username: socials.social_onlyfans,
      url: `https://onlyfans.com/${socials.social_onlyfans}`,
      icon: 'OF',
      color: '#00AFF0',
    });
  }

  if (socialLinks.length === 0) {
    return null;
  }

  const handlePress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  return (
    <View style={styles.container}>
      {socialLinks.map((social) => (
        <Pressable
          key={social.platform}
          style={[styles.iconButton, { backgroundColor: social.color }]}
          onPress={() => handlePress(social.url)}
        >
          <Text
            style={[
              styles.iconText,
              // Special styling for text-based icons (not emojis)
              ['f', 'in', '𝕏', 'OF', '▶', '⌘', '♪'].includes(social.icon) && styles.textIcon,
              // Snapchat needs black text
              social.platform === 'Snapchat' && { color: '#000' },
            ]}
          >
            {social.icon}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
    color: '#fff',
  },
  textIcon: {
    fontWeight: '900',
    fontSize: 18,
  },
});



