import React from 'react';
import { View, StyleSheet, Pressable, Linking } from 'react-native';
import { Feather, FontAwesome, FontAwesome5, Ionicons } from '@expo/vector-icons';

interface SocialMediaBarProps {
  instagram?: string | null;
  twitter?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  facebook?: string | null;
  twitch?: string | null;
  discord?: string | null;
  snapchat?: string | null;
  linkedin?: string | null;
  github?: string | null;
  spotify?: string | null;
  onlyfans?: string | null;
  colors: any;
}

// Convert username/handle to full URL for each platform
function buildSocialUrl(platform: string, value: string): string {
  // If already a full URL, return as-is
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  
  // Remove @ prefix if present
  const handle = value.replace(/^@/, '');
  
  switch (platform) {
    case 'instagram':
      return `https://instagram.com/${handle}`;
    case 'twitter':
      return `https://twitter.com/${handle}`;
    case 'youtube':
      // Could be channel ID or username
      return handle.startsWith('UC') || handle.startsWith('@') 
        ? `https://youtube.com/${handle}` 
        : `https://youtube.com/@${handle}`;
    case 'tiktok':
      return `https://tiktok.com/@${handle}`;
    case 'facebook':
      return `https://facebook.com/${handle}`;
    case 'twitch':
      return `https://twitch.tv/${handle}`;
    case 'discord':
      // Discord invites or server IDs
      return value.includes('discord') ? value : `https://discord.gg/${handle}`;
    case 'snapchat':
      return `https://snapchat.com/add/${handle}`;
    case 'linkedin':
      return `https://linkedin.com/in/${handle}`;
    case 'github':
      return `https://github.com/${handle}`;
    case 'spotify':
      return value.includes('spotify') ? value : `https://open.spotify.com/artist/${handle}`;
    case 'onlyfans':
      return `https://onlyfans.com/${handle}`;
    default:
      return value;
  }
}

export default function SocialMediaBar(props: SocialMediaBarProps) {
  const { colors } = props;

  const socials = [
    { key: 'instagram', value: props.instagram, icon: 'instagram', library: 'Feather' },
    { key: 'twitter', value: props.twitter, icon: 'twitter', library: 'Feather' },
    { key: 'youtube', value: props.youtube, icon: 'youtube', library: 'Feather' },
    { key: 'tiktok', value: props.tiktok, icon: 'musical-notes', library: 'Ionicons' },
    { key: 'facebook', value: props.facebook, icon: 'facebook', library: 'Feather' },
    { key: 'twitch', value: props.twitch, icon: 'twitch', library: 'FontAwesome' },
    { key: 'discord', value: props.discord, icon: 'discord', library: 'FontAwesome5' },
    { key: 'snapchat', value: props.snapchat, icon: 'snapchat-ghost', library: 'FontAwesome' },
    { key: 'linkedin', value: props.linkedin, icon: 'linkedin', library: 'Feather' },
    { key: 'github', value: props.github, icon: 'github', library: 'Feather' },
    { key: 'spotify', value: props.spotify, icon: 'spotify', library: 'FontAwesome' },
    { key: 'onlyfans', value: props.onlyfans, icon: 'link', library: 'Feather' },
  ]
    .filter(s => s.value)
    .map(s => ({ ...s, url: buildSocialUrl(s.key, s.value!) }));

  if (socials.length === 0) {
    return null;
  }

  const handlePress = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
  };

  const renderIcon = (social: typeof socials[0]) => {
    const iconColor = colors.text;
    const size = 24;

    switch (social.library) {
      case 'Feather':
        return <Feather name={social.icon as any} size={size} color={iconColor} />;
      case 'FontAwesome':
        return <FontAwesome name={social.icon as any} size={size} color={iconColor} />;
      case 'FontAwesome5':
        return <FontAwesome5 name={social.icon as any} size={size} color={iconColor} />;
      case 'Ionicons':
        return <Ionicons name={social.icon as any} size={size} color={iconColor} />;
      default:
        return <Feather name="link" size={size} color={iconColor} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.iconsRow}>
        {socials.map((social) => (
          <Pressable
            key={social.key}
            onPress={() => handlePress(social.url!)}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            {renderIcon(social)}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  iconsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  iconButton: {
    padding: 8,
  },
});
