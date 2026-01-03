import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { supabase, supabaseConfigured } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { Button, Input, PageShell } from '../components/ui';
import { LegalFooter } from '../components/LegalFooter';
import { ProfileTypePickerModal, type ProfileType } from '../components/ProfileTypePickerModal';
import ProfileModulePicker from '../components/ProfileModulePicker';
import ProfileTabPicker from '../components/ProfileTabPicker';
import type { ProfileSection, ProfileTab } from '../config/profileTypeConfig';
import type { RootStackParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

type ProfileRow = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  bio?: string | null;
  profile_type?: ProfileType | null;
  enabled_modules?: string[] | null;
  location_zip?: string | null;
  location_city?: string | null;
  location_region?: string | null;
  location_label?: string | null;
  location_hidden?: boolean | null;
  location_show_zip?: boolean | null;
};

export function EditProfileScreen({ navigation }: Props) {
  const { session } = useAuthContext();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const userId = session?.user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileType, setProfileType] = useState<ProfileType>('creator');
  const [showTypePickerModal, setShowTypePickerModal] = useState(false);
  const [enabledModules, setEnabledModules] = useState<ProfileSection[] | null>(null);
  const [enabledTabs, setEnabledTabs] = useState<ProfileTab[] | null>(null);
  const [locationZip, setLocationZip] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [locationHidden, setLocationHidden] = useState(false);
  const [locationShowZip, setLocationShowZip] = useState(false);
  const [locationDisplay, setLocationDisplay] = useState('');
  const [locationSaving, setLocationSaving] = useState(false);

  const canSave = useMemo(() => !!userId && !saving && !loading, [loading, saving, userId]);

  const load = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false);
      setError('Offline mode: Supabase is not configured.');
      setProfile(null);
      return;
    }
    if (!userId) {
      setLoading(false);
      setProfile(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: e } = await supabase
        .from('profiles')
        .select('id, username, display_name, bio, profile_type, location_zip, location_city, location_region, location_label, location_hidden, location_show_zip')
        .eq('id', userId)
        .single();

      if (e) throw e;

      const row = data as any as ProfileRow;
      setProfile(row);
      setDisplayName(String(row.display_name ?? ''));
      setBio(String(row.bio ?? ''));
      // Load profile type from backend
      setProfileType((row as any).profile_type || 'creator');
      setLocationZip(String((row as any).location_zip ?? ''));
      setLocationLabel(String((row as any).location_label ?? ''));
      setLocationHidden(Boolean((row as any).location_hidden));
      setLocationShowZip(Boolean((row as any).location_show_zip));
      if ((row as any).location_city || (row as any).location_region) {
        const cityRegion = [String((row as any).location_city ?? ''), String((row as any).location_region ?? '')]
          .filter((part) => part && part.trim().length > 0)
          .join(', ');
        setLocationDisplay(cityRegion);
      } else {
        setLocationDisplay('');
      }
      // Load enabled modules (optional modules only)
      if (row.enabled_modules && Array.isArray(row.enabled_modules)) {
        setEnabledModules(row.enabled_modules as ProfileSection[]);
      } else {
        setEnabledModules(null); // null = use profile_type defaults
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    if (!supabaseConfigured) {
      setError('Offline mode: Supabase is not configured.');
      return;
    }
    if (!userId) {
      setError('Not authenticated.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let profileTypeSavedViaRpc = false;
      try {
        const { error: typeErr } = await supabase.rpc('set_profile_type', {
          p_profile_type: profileType,
        });
        if (!typeErr) {
          profileTypeSavedViaRpc = true;
        }
      } catch {
        profileTypeSavedViaRpc = false;
      }

      const updatePayload: any = {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        enabled_modules: enabledModules || null,
        enabled_tabs: enabledTabs || null,
        updated_at: new Date().toISOString(),
      };

      if (!profileTypeSavedViaRpc) {
        updatePayload.profile_type = profileType;
      }

      const { error: e } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId);

      if (e) throw e;

      navigation.goBack();
    } catch (e: any) {
      setError(e?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [bio, displayName, navigation, profileType, userId]);

  const handleLocationSave = useCallback(async () => {
    if (!supabaseConfigured) {
      Alert.alert('Offline', 'Supabase is not configured.');
      return;
    }
    if (!userId) {
      Alert.alert('Not signed in', 'Please log in to update your location.');
      return;
    }
    if (!locationZip.trim()) {
      Alert.alert('ZIP required', 'Enter a 5-digit ZIP to set your location.');
      return;
    }

    setLocationSaving(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('rpc_update_profile_location', {
        p_zip: locationZip.trim(),
        p_label: locationLabel.trim() || null,
        p_hide: locationHidden,
        p_show_zip: locationShowZip,
      });

      if (rpcError) {
        throw rpcError;
      }

      const payload = Array.isArray(data) ? data[0] : data;
      if (payload) {
        const cityRegion = [payload.location_city, payload.location_region].filter(Boolean).join(', ');
        setLocationDisplay(cityRegion);
        setLocationZip(payload.location_zip || locationZip);
      }
      Alert.alert('Location updated', 'Your manual location was saved.');
    } catch (err: any) {
      Alert.alert('Location error', err?.message || 'Failed to update location.');
    } finally {
      setLocationSaving(false);
    }
  }, [locationHidden, locationLabel, locationShowZip, locationZip, supabase, supabaseConfigured, userId]);

  return (
    <PageShell
      title="Edit Profile"
      left={<Button title="Back" variant="secondary" onPress={() => navigation.goBack()} style={styles.headerButton} />}
      contentStyle={styles.container}
    >
      <View style={styles.body}>
        {!userId ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Please log in to edit your profile.</Text>
            <Button title="Go to Login" onPress={() => navigation.getParent()?.navigate?.('Auth')} />
          </View>
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#5E9BFF" />
            <Text style={styles.mutedText}>Loading…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Retry" onPress={() => void load()} />
          </View>
        ) : !profile ? (
          <View style={styles.center}>
            <Text style={styles.mutedText}>No profile data.</Text>
            <Button title="Retry" onPress={() => void load()} />
          </View>
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
            {/* Basic Info Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="user" size={18} color={theme.colors.accent} />
                <Text style={styles.sectionTitle}>Basic Information</Text>
              </View>

            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.readonlyContainer}>
                <Text style={styles.readonlyValue}>@{String(profile.username ?? '')}</Text>
              </View>
              <Text style={styles.fieldHint}>Username cannot be changed</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Display Name</Text>
              <Input value={displayName} onChangeText={setDisplayName} placeholder="Display name" autoCapitalize="words" />
              <Text style={styles.fieldHint}>How your name appears on your profile</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Bio</Text>
              <Input
                value={bio}
                onChangeText={setBio}
                placeholder="Tell people about yourself..."
                multiline
                style={styles.bioInput}
              />
              <Text style={styles.fieldHint}>A brief description for your profile</Text>
            </View>
            </View>

            {/* Location Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="map-pin" size={18} color={theme.colors.accent} />
                <Text style={styles.sectionTitle}>Manual Location</Text>
              </View>
              <Text style={styles.fieldHint}>
                Manual ZIP for discovery. No GPS tracking. Leave blank to hide.
              </Text>
              <View style={styles.field}>
                <Text style={styles.label}>ZIP Code</Text>
                <Input
                  value={locationZip}
                  onChangeText={setLocationZip}
                  placeholder="90012"
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Area Label</Text>
                <Input
                  value={locationLabel}
                  onChangeText={setLocationLabel}
                  placeholder="St. Louis Metro"
                />
              </View>
              {locationDisplay ? (
                <Text style={styles.locationHelper}>Current: {locationDisplay}</Text>
              ) : null}
              <View style={styles.toggleRow}>
                <Text style={styles.label}>Hide location</Text>
                <Switch value={locationHidden} onValueChange={setLocationHidden} />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.label}>Show ZIP publicly</Text>
                <Switch
                  value={locationShowZip}
                  onValueChange={setLocationShowZip}
                  disabled={locationHidden}
                />
              </View>
              <Button
                title={locationSaving ? 'Saving…' : 'Set Location'}
                onPress={handleLocationSave}
                loading={locationSaving}
                style={styles.locationButton}
              />
            </View>

            {/* Profile Type Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="star" size={18} color={theme.colors.accent} />
                <Text style={styles.sectionTitle}>Profile Type</Text>
              </View>
            
            <View style={styles.field}>
              <Text style={styles.label}>Current Type</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.profileTypeRow,
                  pressed && styles.profileTypeRowPressed,
                ]}
                onPress={() => setShowTypePickerModal(true)}
              >
                <Text style={styles.profileTypeValue}>{formatProfileType(profileType)}</Text>
                <Feather name="chevron-right" size={20} color={theme.colors.textSecondary} />
              </Pressable>
              <Text style={styles.warningText}>
                Changing type may hide/show sections. Nothing is deleted.
              </Text>
            </View>
          </View>

          {/* Customization Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="sliders" size={18} color={theme.colors.accent} />
              <Text style={styles.sectionTitle}>Profile Customization</Text>
            </View>

            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Profile Sections</Text>
              <Text style={styles.subsectionHint}>Choose which sections appear on your profile</Text>
              <ProfileModulePicker
                profileType={profileType}
                currentEnabledModules={enabledModules}
                onChange={setEnabledModules}
              />
            </View>

            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Profile Tabs</Text>
              <Text style={styles.subsectionHint}>Choose which tabs are visible to visitors</Text>
              <ProfileTabPicker
                profileType={profileType}
                currentEnabledTabs={enabledTabs}
                onChange={setEnabledTabs}
              />
            </View>
          </View>

          {/* Placeholder for future features */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="link" size={18} color={theme.colors.textMuted} />
              <Text style={styles.sectionTitle}>Links & Social Media</Text>
            </View>
            <View style={styles.placeholderBox}>
              <Feather name="link-2" size={32} color={theme.colors.textMuted} />
              <Text style={styles.placeholderText}>Social links coming soon</Text>
              <Text style={styles.placeholderSubtext}>Connect your Instagram, Twitter, and more</Text>
            </View>
          </View>

          <Button title={saving ? 'Saving…' : 'Save Changes'} onPress={save} disabled={!canSave} loading={saving} />
          <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </View>

      {/* Profile Type Picker Modal */}
      <ProfileTypePickerModal
        visible={showTypePickerModal}
        onClose={() => setShowTypePickerModal(false)}
        currentType={profileType}
        onSelect={(type) => {
          setProfileType(type);
          // TODO: Save to backend when field is added
        }}
      />

      <LegalFooter />
    </PageShell>
  );

}

function formatProfileType(type: ProfileType): string {
  const labels: Record<ProfileType, string> = {
    streamer: 'Streamer',
    musician: 'Musician / Artist',
    comedian: 'Comedian',
    business: 'Business / Brand',
    creator: 'Creator',
  };
  return labels[type];
}

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;
  return StyleSheet.create({
    headerButton: {
      height: 32,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    container: {
      flex: 1,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    body: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    mutedText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    form: {
      padding: 16,
      gap: 16,
    },
    section: {
      backgroundColor: theme.colors.cardSurface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 14,
      padding: 16,
      gap: 14,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
    },
    subsection: {
      gap: 8,
    },
    subsectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    subsectionHint: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 4,
    },
    field: {
      gap: 8,
    },
    label: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    fieldHint: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      marginTop: -4,
    },
    locationHelper: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    locationButton: {
      marginTop: 12,
    },
    readonlyContainer: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.tokens.backgroundPrimary,
    },
    readonlyValue: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    bioInput: {
      height: 110,
      textAlignVertical: 'top',
      paddingTop: 12,
    },
    profileTypeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.tokens.backgroundPrimary,
    },
    profileTypeRowPressed: {
      opacity: 0.7,
      backgroundColor: theme.colors.surface,
    },
    profileTypeValue: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    warningText: {
      color: theme.colors.warning,
      fontSize: 11,
      fontWeight: '600',
      marginTop: -2,
    },
    placeholderBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      paddingHorizontal: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      backgroundColor: theme.tokens.backgroundPrimary,
      gap: 8,
    },
    placeholderText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    placeholderSubtext: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
