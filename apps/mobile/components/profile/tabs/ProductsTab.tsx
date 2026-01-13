import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';

interface ProductsTabProps {
  profileId: string;
  colors: any;
}

interface BusinessInfo {
  profile_id: string;
  business_description?: string;
  website_url?: string;
  contact_email?: string;
  contact_phone?: string;
  location_or_service_area?: string;
  hours?: any;
}

export default function ProductsTab({ profileId, colors }: ProductsTabProps) {
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusinessInfo();
  }, [profileId]);

  const loadBusinessInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_business')
        .select('*')
        .eq('profile_id', profileId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setBusinessInfo(data);
    } catch (error) {
      console.error('Error loading business info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWebsite = () => {
    if (businessInfo?.website_url) {
      Linking.openURL(businessInfo.website_url);
    }
  };

  const handleEmail = () => {
    if (businessInfo?.contact_email) {
      Linking.openURL(`mailto:${businessInfo.contact_email}`);
    }
  };

  const handlePhone = () => {
    if (businessInfo?.contact_phone) {
      Linking.openURL(`tel:${businessInfo.contact_phone}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!businessInfo) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Feather name="briefcase" size={48} color={colors.mutedText} />
        <Text style={[styles.emptyText, { color: colors.mutedText }]}>
          No business information available
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {businessInfo.business_description && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
          <Text style={[styles.description, { color: colors.text }]}>
            {businessInfo.business_description}
          </Text>
        </View>
      )}

      {businessInfo.location_or_service_area && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Service Area</Text>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {businessInfo.location_or_service_area}
            </Text>
          </View>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact</Text>
        
        {businessInfo.website_url && (
          <Pressable onPress={handleOpenWebsite} style={styles.contactRow}>
            <Feather name="globe" size={18} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.primary }]}>
              Visit Website
            </Text>
            <Feather name="external-link" size={16} color={colors.mutedText} style={styles.contactIcon} />
          </Pressable>
        )}

        {businessInfo.contact_email && (
          <Pressable onPress={handleEmail} style={styles.contactRow}>
            <Feather name="mail" size={18} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.primary }]}>
              {businessInfo.contact_email}
            </Text>
          </Pressable>
        )}

        {businessInfo.contact_phone && (
          <Pressable onPress={handlePhone} style={styles.contactRow}>
            <Feather name="phone" size={18} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.primary }]}>
              {businessInfo.contact_phone}
            </Text>
          </Pressable>
        )}
      </View>

      {businessInfo.hours && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Hours</Text>
          <Text style={[styles.hoursText, { color: colors.text }]}>
            {JSON.stringify(businessInfo.hours, null, 2)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 15,
    flex: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  contactText: {
    fontSize: 15,
    flex: 1,
  },
  contactIcon: {
    marginLeft: 'auto',
  },
  hoursText: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
});
