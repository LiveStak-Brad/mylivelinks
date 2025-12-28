import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../lib/supabase';
import { Button, Checkbox, Input, Modal, PageShell } from '../components/ui';
import { useAuthContext } from '../contexts/AuthContext';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateProfile'>;

function calculateAge(dobISODate: string): number {
  const birthDate = new Date(dobISODate);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

function formatISODateOnly(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function CreateProfileScreen({ navigation }: Props) {
  const { session } = useAuthContext();
  const userId = session?.user?.id;
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [adultOptIn, setAdultOptIn] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const dobISO = useMemo(() => (dob ? formatISODateOnly(dob) : null), [dob]);
  const age = useMemo(() => (dobISO ? calculateAge(dobISO) : null), [dobISO]);

  const canShowAdultOptIn = useMemo(() => (age ?? 0) >= 18, [age]);

  const stepTitle = useMemo(() => {
    if (step === 1) return 'Choose Username';
    if (step === 2) return 'Date of Birth';
    if (step === 3) return 'Profile Details';
    return 'Terms';
  }, [step]);

  const validateStep = async (): Promise<boolean> => {
    setError(null);

    if (!userId) {
      setError('Not authenticated.');
      return false;
    }

    if (step === 1) {
      const clean = username.trim().toLowerCase();
      if (!clean) {
        setError('Username is required.');
        return false;
      }
      if (clean.length < 4) {
        setError('Username must be at least 4 characters.');
        return false;
      }
      if (!/^[a-z0-9_-]+$/.test(clean)) {
        setError('Username can only contain letters, numbers, hyphens, and underscores.');
        return false;
      }

      const { data: existing, error: existingError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', clean)
        .neq('id', userId)
        .maybeSingle();

      if (existingError) {
        setError(existingError.message);
        return false;
      }

      if (existing?.id) {
        setError('That username is already taken.');
        return false;
      }

      return true;
    }

    if (step === 2) {
      if (!dobISO) {
        setError('Date of birth is required.');
        return false;
      }
      if (age === null) {
        setError('Invalid date of birth.');
        return false;
      }
      if (age < 13) {
        setError('You must be at least 13 years old to use this platform.');
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (displayName.trim().length > 50) {
        setError('Display name must be 50 characters or less.');
        return false;
      }
      if (bio.trim().length > 500) {
        setError('Bio must be 500 characters or less.');
        return false;
      }
      return true;
    }

    if (step === 4) {
      if (!acceptTerms) {
        setError('You must accept the Terms to continue.');
        return false;
      }
      return true;
    }

    return false;
  };

  const next = async () => {
    const ok = await validateStep();
    if (!ok) return;

    if (step < 4) {
      setStep((step + 1) as any);
      return;
    }

    await save();
  };

  const back = () => {
    if (step > 1) {
      setError(null);
      setStep((step - 1) as any);
    }
  };

  const save = async () => {
    if (!userId) {
      setError('Not authenticated.');
      return;
    }

    if (!dobISO) {
      setError('Date of birth is required.');
      return;
    }

    const cleanUsername = username.trim().toLowerCase();

    setSubmitting(true);
    setError(null);

    try {
      const profilePayload: Record<string, any> = {
        id: userId,
        username: cleanUsername,
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        date_of_birth: dobISO,
      };

      if (canShowAdultOptIn && adultOptIn) {
        profilePayload.adult_verified_at = new Date().toISOString();
        profilePayload.adult_verified_method = 'self_attested';
      }

      const { error: upsertError } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });

      if (upsertError) {
        if ((upsertError as any)?.code === '23505') {
          setError(`Username "${cleanUsername}" is already taken.`);
          setStep(1);
          return;
        }
        setError(upsertError.message);
        return;
      }

      try {
        await supabase.rpc('log_referral_activity', { p_event_type: 'profile_completed' });
      } catch (refErr) {
        console.warn('[referrals] log_referral_activity failed (non-blocking):', refErr);
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'Gate' }],
      });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell title="Create Profile" contentStyle={styles.page}>
      <View style={styles.card}>
        <Text style={styles.stepTitle}>{stepTitle}</Text>
        <Text style={styles.stepSubtitle}>Step {step} of 4</Text>

        {step === 1 ? (
          <View style={styles.section}>
            <Text style={styles.label}>Username</Text>
            <Input value={username} onChangeText={setUsername} placeholder="yourname" autoCapitalize="none" />
            <Text style={styles.help}>Lowercase recommended. Letters, numbers, - and _ only.</Text>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.section}>
            <Text style={styles.label}>Date of birth</Text>
            <Button title={dobISO ? dobISO : 'Pick date'} onPress={() => setShowDobPicker(true)} variant="secondary" />
            <Text style={styles.help}>You must be at least 13.</Text>

            {showDobPicker ? (
              <DateTimePicker
                value={dob ?? new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(_event: DateTimePickerEvent, selectedDate?: Date) => {
                  if (Platform.OS !== 'ios') {
                    setShowDobPicker(false);
                  }
                  if (selectedDate) setDob(selectedDate);
                }}
              />
            ) : null}

            {Platform.OS === 'ios' && showDobPicker ? (
              <View style={styles.inlineActions}>
                <Button title="Done" onPress={() => setShowDobPicker(false)} />
              </View>
            ) : null}

            {age !== null ? <Text style={styles.help}>Age: {age}</Text> : null}
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.section}>
            <Text style={styles.label}>Display name (optional)</Text>
            <Input value={displayName} onChangeText={setDisplayName} placeholder="Display name" autoCapitalize="words" />

            <View style={styles.spacer} />

            <Text style={styles.label}>Bio (optional)</Text>
            <Input
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about you"
              autoCapitalize="sentences"
              multiline
              style={styles.bioInput}
            />
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.section}>
            <Checkbox value={acceptTerms} onValueChange={setAcceptTerms} label="I accept the Terms of Service" />

            <View style={styles.linkRow}>
              <Button title="View Terms" onPress={() => setShowTermsModal(true)} variant="secondary" />
            </View>

            {canShowAdultOptIn ? (
              <Checkbox
                value={adultOptIn}
                onValueChange={setAdultOptIn}
                label="I am 18+ (optional adult opt-in)"
              />
            ) : null}
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <View style={styles.actionLeft}>
            {step > 1 ? <Button title="Back" onPress={back} variant="secondary" disabled={submitting} /> : null}
          </View>
          <View style={styles.actionRight}>
            <Button title={step === 4 ? 'Finish' : 'Next'} onPress={() => void next()} loading={submitting} />
          </View>
        </View>

        {submitting ? (
          <View style={styles.submittingRow}>
            <ActivityIndicator color="#5E9BFF" />
            <Text style={styles.help}>Saving…</Text>
          </View>
        ) : null}
      </View>

      <Modal visible={showTermsModal} onRequestClose={() => setShowTermsModal(false)}>
        <Text style={styles.modalTitle}>Terms of Service</Text>
        <Text style={styles.modalText}>
          By using MyLiveLinks, you agree to behave respectfully and follow all applicable laws. This is a simplified mobile
          summary.
        </Text>
        <View style={styles.modalActions}>
          <Button title="Close" onPress={() => setShowTermsModal(false)} />
        </View>
      </Modal>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 16,
    gap: 10,
  },
  stepTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  stepSubtitle: {
    color: '#9aa0a6',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  section: {
    gap: 8,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  help: {
    color: '#9aa0a6',
    fontSize: 12,
    fontWeight: '600',
  },
  spacer: {
    height: 10,
  },
  bioInput: {
    height: 120,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  linkRow: {
    marginTop: 6,
  },
  error: {
    color: '#ff6b6b',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  actions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
  },
  actionLeft: {
    flex: 1,
  },
  actionRight: {
    flex: 1,
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  inlineActions: {
    marginTop: 8,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  modalText: {
    color: '#c9c9c9',
    fontSize: 13,
    lineHeight: 18,
  },
  modalActions: {
    marginTop: 16,
  },
});
