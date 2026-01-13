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

export default function SocialMediaBar(props: SocialMediaBarProps) {
  const { colors } = props;

  const socials = [
    { key: 'instagram', url: props.instagram, icon: 'instagram', library: 'Feather' },
    { key: 'twitter', url: props.twitter, icon: 'twitter', library: 'Feather' },
    { key: 'youtube', url: props.youtube, icon: 'youtube', library: 'Feather' },
    { key: 'tiktok', url: props.tiktok, icon: 'musical-notes', library: 'Ionicons' },
    { key: 'facebook', url: props.facebook, icon: 'facebook', library: 'Feather' },
    { key: 'twitch', url: props.twitch, icon: 'twitch', library: 'FontAwesome' },
    { key: 'discord', url: props.discord, icon: 'discord', library: 'FontAwesome5' },
    { key: 'snapchat', url: props.snapchat, icon: 'snapchat-ghost', library: 'FontAwesome' },
    { key: 'linkedin', url: props.linkedin, icon: 'linkedin', library: 'Feather' },
    { key: 'github', url: props.github, icon: 'github', library: 'Feather' },
    { key: 'spotify', url: props.spotify, icon: 'spotify', library: 'FontAwesome' },
    { key: 'onlyfans', url: props.onlyfans, icon: 'link', library: 'Feather' },
  ].filter(s => s.url);

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
