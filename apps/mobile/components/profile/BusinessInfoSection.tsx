import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface BusinessInfoSectionProps {
  profileId: string;
  isOwnProfile: boolean;
  onEdit?: () => void;
  colors: any;
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
}

interface BusinessInfo {
  id: string;
  business_name?: string;
  business_type?: string;
  description?: string;
  website_url?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
}

export default function BusinessInfoSection({
  profileId,
  isOwnProfile,
  onEdit,
  colors,
  cardStyle,
}: BusinessInfoSectionProps) {
  const cardBg = cardStyle?.backgroundColor || colors.surface;
  const cardRadius = cardStyle?.borderRadius || 12;
  const textColor = cardStyle?.textColor || colors.text;
  const [info, setInfo] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInfo();
  }, [profileId]);

  const loadInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_business')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          console.log('[BusinessInfoSection] Table not found, skipping');
          setInfo(null);
          return;
        }
        throw error;
      }
      setInfo(data);
    } catch (error: any) {
      if (error?.code === 'PGRST205' || error?.message?.includes('profile_business')) {
        console.log('[BusinessInfoSection] Table not found, skipping');
        setInfo(null);
      } else {
        console.error('Error loading business info:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWebsite = () => {
    if (info?.website_url) {
      Linking.openURL(info.website_url).catch(console.error);
    }
  };

  const handleEmail = () => {
    if (info?.contact_email) {
      Linking.openURL(`mailto:${info.contact_email}`).catch(console.error);
    }
  };

  const handlePhone = () => {
    if (info?.contact_phone) {
      Linking.openURL(`tel:${info.contact_phone}`).catch(console.error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const hasData = info && (info.business_name || info.description || info.website_url || info.contact_email || info.contact_phone);

  if (!hasData && !isOwnProfile) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderRadius: cardRadius }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="briefcase" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: textColor }]}>Business Info</Text>
        </View>
        {isOwnProfile && onEdit && (
          <Pressable onPress={onEdit} style={styles.editButton}>
            <Feather name="edit-2" size={16} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {!hasData ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>
            No business information yet
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          {info.business_name && (
            <Text style={[styles.businessName, { color: colors.text }]}>
              {info.business_name}
            </Text>
          )}
          
          {info.business_type && (
            <View style={[styles.typeBadge, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[styles.typeText, { color: colors.primary }]}>
                {info.business_type}
              </Text>
            </View>
          )}
          
          {info.description && (
            <Text style={[styles.description, { color: colors.text }]}>
              {info.description}
            </Text>
          )}

          <View style={styles.contactList}>
            {info.website_url && (
              <Pressable onPress={handleWebsite} style={styles.contactRow}>
                <Feather name="globe" size={16} color={colors.primary} />
                <Text style={[styles.contactText, { color: colors.primary }]} numberOfLines={1}>
                  Visit Website
                </Text>
                <Feather name="external-link" size={14} color={colors.mutedText} />
              </Pressable>
            )}
            
            {info.contact_email && (
              <Pressable onPress={handleEmail} style={styles.contactRow}>
                <Feather name="mail" size={16} color={colors.primary} />
                <Text style={[styles.contactText, { color: colors.text }]} numberOfLines={1}>
                  {info.contact_email}
                </Text>
              </Pressable>
            )}
            
            {info.contact_phone && (
              <Pressable onPress={handlePhone} style={styles.contactRow}>
                <Feather name="phone" size={16} color={colors.primary} />
                <Text style={[styles.contactText, { color: colors.text }]} numberOfLines={1}>
                  {info.contact_phone}
                </Text>
              </Pressable>
            )}
            
            {info.address && (
              <View style={styles.contactRow}>
                <Feather name="map-pin" size={16} color={colors.primary} />
                <Text style={[styles.contactText, { color: colors.text }]} numberOfLines={2}>
                  {info.address}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    padding: 8,
  },
  emptyState: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  content: {
    gap: 12,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '700',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  contactList: {
    marginTop: 8,
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 14,
    flex: 1,
  },
});
