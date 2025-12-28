import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase, supabaseConfigured } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { Button, Input, PageShell } from '../components/ui';
import { ProfileTypePickerModal, type ProfileType } from '../components/ProfileTypePickerModal';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

type ProfileRow = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  bio?: string | null;
  profile_type?: ProfileType | null;
};

export function EditProfileScreen({ navigation }: Props) {
  const { session } = useAuthContext();
  const userId = session?.user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileType, setProfileType] = useState<ProfileType>('creator');
  const [showTypePickerModal, setShowTypePickerModal] = useState(false);

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
        .select('id, username, display_name, bio, profile_type')
        .eq('id', userId)
        .single();

      if (e) throw e;

      const row = data as any as ProfileRow;
      setProfile(row);
      setDisplayName(String(row.display_name ?? ''));
      setBio(String(row.bio ?? ''));
      // Load profile type from backend
      setProfileType((row as any).profile_type || 'creator');
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

  return (
    <PageShell
      title="Edit Profile"
      left={<Button title="Back" variant="secondary" onPress={() => navigation.goBack()} style={styles.headerButton} />}
      contentStyle={styles.container}
    >
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
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            <Text style={styles.readonlyValue}>@{String(profile.username ?? '')}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Display Name</Text>
            <Input value={displayName} onChangeText={setDisplayName} placeholder="Display name" autoCapitalize="words" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Bio</Text>
            <Input
              value={bio}
              onChangeText={setBio}
              placeholder="Bio"
              multiline
              style={styles.bioInput}
            />
          </View>

          {/* Profile Type Row */}
          <View style={styles.field}>
            <Text style={styles.label}>Profile Type</Text>
            <Pressable
              style={({ pressed }) => [
                styles.profileTypeRow,
                pressed && styles.profileTypeRowPressed,
              ]}
              onPress={() => setShowTypePickerModal(true)}
            >
              <Text style={styles.profileTypeValue}>{formatProfileType(profileType)}</Text>
              <Text style={styles.profileTypeChevron}>›</Text>
            </Pressable>
            <Text style={styles.warningText}>
              Changing type may hide/show sections. Nothing is deleted.
            </Text>
          </View>

          <Button title={saving ? 'Saving…' : 'Save'} onPress={save} disabled={!canSave} loading={saving} />
        </View>
      )}

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
    </PageShell>
  );
}

// Helper function to format profile type for display
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

const styles = StyleSheet.create({
  headerButton: {
    height: 36,
    paddingHorizontal: 12,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mutedText: {
    color: '#bdbdbd',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  form: {
    gap: 14,
  },
  field: {
    gap: 8,
  },
  label: {
    color: '#9aa0a6',
    fontSize: 12,
    fontWeight: '800',
  },
  readonlyValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
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
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  profileTypeRowPressed: {
    opacity: 0.7,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  profileTypeValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  profileTypeChevron: {
    color: '#9aa0a6',
    fontSize: 24,
    fontWeight: '300',
  },
  warningText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});
