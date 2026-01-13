import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface InfoTabProps {
  children: React.ReactNode;
  profile: any;
  locationText?: string;
  colors: any;
}

export default function InfoTab({ children, profile, locationText, colors }: InfoTabProps) {
  return (
    <View>
      {(profile.bio || locationText) && (
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {profile.bio && (
            <View style={styles.bioSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
              <Text style={[styles.bioText, { color: colors.text }]}>
                {profile.bio}
              </Text>
            </View>
          )}
          
          {locationText && !profile.location_hidden && (
            <View style={styles.locationSection}>
              <Feather name="map-pin" size={16} color={colors.primary} />
              <Text style={[styles.locationText, { color: colors.text }]}>
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
