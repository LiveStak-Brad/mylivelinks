import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface InfoTabProps {
  children: React.ReactNode;
  profile: any;
  locationText?: string;
  colors: any;
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
}

export default function InfoTab({ children, profile, locationText, colors, cardStyle }: InfoTabProps) {
  const cardBg = cardStyle?.backgroundColor || colors.card;
  const cardRadius = cardStyle?.borderRadius || 12;
  const textColor = cardStyle?.textColor || colors.text;
  
  return (
    <View>
      {(profile.bio || locationText) && (
        <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor: colors.border, borderRadius: cardRadius }]}>
          {profile.bio && (
            <View style={styles.bioSection}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>About</Text>
              <Text style={[styles.bioText, { color: textColor }]}>
                {profile.bio}
              </Text>
            </View>
          )}
          
          {locationText && !profile.location_hidden && (
            <View style={styles.locationSection}>
              <Feather name="map-pin" size={16} color={colors.primary} />
              <Text style={[styles.locationText, { color: textColor }]}>
                {locationText}
              </Text>
            </View>
          )}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  bioSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  locationText: {
    fontSize: 15,
  },
});
