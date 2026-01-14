import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/useTheme';
import { useAuth } from '../state/AuthContext';
import { supabase } from '../lib/supabase';

interface OnboardingData {
  displayName: string;
  dateOfBirth: string;
  bio: string;
  acceptTerms: boolean;
  acceptAdultDisclaimer: boolean;
}

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { mode, colors } = useTheme();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [existingUsername, setExistingUsername] = useState<string | null>(null);

  const [formData, setFormData] = useState<OnboardingData>({
    displayName: '',
    dateOfBirth: '',
    bio: '',
    acceptTerms: false,
    acceptAdultDisclaimer: false,
  });

  const themed = useMemo(
    () => ({
      bg: colors.bg,
      surface: colors.surface,
      text: colors.text,
      mutedText: colors.mutedText,
      border: colors.border,
      subtleText: (colors as any).subtleText ?? colors.mutedText,
      dangerBg: mode === 'dark' ? 'rgba(239,68,68,0.15)' : '#fee',
      dangerBorder: mode === 'dark' ? 'rgba(239,68,68,0.35)' : '#fcc',
      dangerText: colors.danger,
      infoBg: mode === 'dark' ? 'rgba(59,130,246,0.15)' : '#eff6ff',
      infoBorder: mode === 'dark' ? 'rgba(59,130,246,0.35)' : '#bfdbfe',
      infoText: mode === 'dark' ? '#93c5fd' : '#1d4ed8',
      warningBg: mode === 'dark' ? 'rgba(245,158,11,0.15)' : '#fffbeb',
      warningBorder: mode === 'dark' ? 'rgba(245,158,11,0.35)' : '#fcd34d',
    }),
    [mode, colors]
  );

  useEffect(() => {
    checkProfile();
  }, [user]);

  const checkProfile = async () => {
    if (!user) {
      navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, date_of_birth')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.username && profile?.date_of_birth) {
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      return;
    }

    if (profile?.username) {
      setExistingUsername(profile.username);
    }

    setLoading(false);
  };

  const calculateAge = (dob: string): number => {
    const parts = dob.split('/');
    if (parts.length !== 3) return 0;
    const month = parseInt(parts[0]) - 1;
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]);

    const birthDate = new Date(year, month, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const validateDateFormat = (date: string): boolean => {
    const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    return regex.test(date);
  };

  const validateStep = (currentStep: number): boolean => {
    setError('');

    switch (currentStep) {
      case 1: // Age Verification
        if (!formData.dateOfBirth) {
          setError('Date of birth is required');
          return false;
        }
        if (!validateDateFormat(formData.dateOfBirth)) {
          setError('Please enter a valid date in MM/DD/YYYY format');
          return false;
        }
        const age = calculateAge(formData.dateOfBirth);
        if (age < 13) {
          setError('You must be at least 13 years old to use this platform');
          return false;
        }
        break;

      case 2: // Profile Info
        if (formData.displayName && formData.displayName.length > 50) {
          setError('Display name must be less than 50 characters');
          return false;
        }
        if (formData.bio && formData.bio.length > 500) {
          setError('Bio must be less than 500 characters');
          return false;
        }
        break;

      case 3: // Terms
        if (!formData.acceptTerms) {
          setError('You must accept the Terms of Service to continue');
          return false;
        }
        break;
    }

    return true;
  };

  const handleNext = async () => {
    if (!validateStep(step)) return;

    if (step < 3) {
      setStep(step + 1);
    } else {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setSaving(true);
    setError('');

    try {
      const age = calculateAge(formData.dateOfBirth);

      const parts = formData.dateOfBirth.split('/');
      const dbDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;

      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          display_name: formData.displayName.trim() || null,
          bio: formData.bio.trim() || null,
          date_of_birth: dbDate,
          adult_verified_at: age >= 18 ? new Date().toISOString() : null,
          adult_verified_method: age >= 18 ? 'self_attested' : null,
        },
        { onConflict: 'id' }
      );

      if (profileError) {
        throw new Error(`Failed to update profile: ${profileError.message}`);
      }

      try {
        await supabase.rpc('log_referral_activity', { p_event_type: 'profile_completed' });
      } catch (refErr) {
        console.warn('[referrals] log_referral_activity failed (non-blocking):', refErr);
      }

      if (age >= 18 && formData.acceptAdultDisclaimer) {
        await supabase.from('user_settings').upsert(
          {
            profile_id: user.id,
            has_accepted_adult_disclaimer: true,
            adult_disclaimer_accepted_at: new Date().toISOString(),
            adult_disclaimer_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            hide_adult_content: false,
          },
          { onConflict: 'profile_id' }
        );
      }

      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Failed to complete profile setup');
    } finally {
      setSaving(false);
    }
  };

  const isAdult = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) >= 18 : false;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themed.bg }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={[styles.loadingText, { color: themed.mutedText }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themed.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={[styles.logo, { color: '#6366f1' }]}>MyLiveLinks</Text>
            <Text style={[styles.title, { color: themed.text }]}>Complete Your Profile</Text>
            {existingUsername && (
              <Text style={[styles.subtitle, { color: themed.mutedText }]}>
                Welcome, @{existingUsername}!
              </Text>
            )}
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[
                  styles.progressBar,
                  { backgroundColor: themed.border },
                  s <= step && styles.progressBarActive,
                ]}
              />
            ))}
          </View>
          <Text style={[styles.stepText, { color: themed.mutedText }]}>Step {step} of 3</Text>

          {/* Error Message */}
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: themed.dangerBg, borderColor: themed.dangerBorder }]}>
              <Text style={[styles.errorText, { color: themed.dangerText }]}>{error}</Text>
            </View>
          ) : null}

          {/* Step 1: Age Verification */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: themed.text }]}>Age Verification</Text>
              <Text style={[styles.stepDescription, { color: themed.mutedText }]}>
                We need to verify your age. You must be at least 13 years old.
              </Text>

              <Text style={[styles.label, { color: themed.text }]}>Date of Birth</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themed.surface, borderColor: themed.border, color: themed.text }]}
                value={formData.dateOfBirth}
                onChangeText={(t) => setFormData({ ...formData, dateOfBirth: t })}
                placeholder="MM/DD/YYYY"
                placeholderTextColor={themed.subtleText}
                maxLength={10}
                keyboardType="numeric"
              />
              <Text style={[styles.hint, { color: themed.mutedText }]}>Example: 01/15/1990</Text>

              {formData.dateOfBirth && validateDateFormat(formData.dateOfBirth) && (
                <Text style={[styles.ageDisplay, { color: themed.mutedText }]}>
                  Age: {calculateAge(formData.dateOfBirth)} years old
                </Text>
              )}

              <View style={[styles.infoBox, { backgroundColor: themed.infoBg, borderColor: themed.infoBorder }]}>
                <Text style={[styles.infoText, { color: themed.infoText }]}>
                  Privacy: Your date of birth is private and will never be shown publicly.
                </Text>
              </View>
            </View>
          )}

          {/* Step 2: Profile Details */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: themed.text }]}>Tell Us About Yourself</Text>
              <Text style={[styles.stepDescription, { color: themed.mutedText }]}>
                This information will be visible on your public profile (optional)
              </Text>

              <Text style={[styles.label, { color: themed.text }]}>Display Name (Optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themed.surface, borderColor: themed.border, color: themed.text }]}
                value={formData.displayName}
                onChangeText={(t) => setFormData({ ...formData, displayName: t })}
                placeholder="Your Name"
                placeholderTextColor={themed.subtleText}
                maxLength={50}
              />
              <Text style={[styles.hint, { color: themed.mutedText }]}>This is how you'll appear to others</Text>

              <Text style={[styles.label, { color: themed.text, marginTop: 16 }]}>Bio (Optional)</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: themed.surface, borderColor: themed.border, color: themed.text }]}
                value={formData.bio}
                onChangeText={(t) => setFormData({ ...formData, bio: t })}
                placeholder="Tell people a bit about yourself..."
                placeholderTextColor={themed.subtleText}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={[styles.hint, { color: themed.mutedText }]}>{formData.bio.length}/500 characters</Text>
            </View>
          )}

          {/* Step 3: Terms */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: themed.text }]}>Terms & Agreements</Text>

              <View style={[styles.termsBox, { backgroundColor: themed.surface, borderColor: themed.border }]}>
                <Text style={[styles.termsTitle, { color: themed.text }]}>Terms of Service</Text>
                <Text style={[styles.termsItem, { color: themed.mutedText }]}>• You must be at least 13 years old</Text>
                <Text style={[styles.termsItem, { color: themed.mutedText }]}>• You are responsible for all content you post</Text>
                <Text style={[styles.termsItem, { color: themed.mutedText }]}>• Harassment and hate speech are prohibited</Text>
                <Text style={[styles.termsItem, { color: themed.mutedText }]}>• Virtual currency has no real-world cash value</Text>
              </View>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFormData({ ...formData, acceptTerms: !formData.acceptTerms })}
              >
                <View style={[styles.checkbox, formData.acceptTerms && styles.checkboxChecked]}>
                  {formData.acceptTerms && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.checkboxLabel, { color: themed.text }]}>
                  I agree to the Terms of Service and Privacy Policy
                </Text>
              </TouchableOpacity>

              {isAdult && (
                <View style={[styles.adultBox, { backgroundColor: themed.warningBg, borderColor: themed.warningBorder }]}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextContainer}>
                      <Text style={[styles.adultTitle, { color: themed.text }]}>Adult Content (Optional)</Text>
                      <Text style={[styles.adultDescription, { color: themed.mutedText }]}>
                        I am 18+ and consent to viewing adult content when available.
                      </Text>
                    </View>
                    <Switch
                      value={formData.acceptAdultDisclaimer}
                      onValueChange={(v) => setFormData({ ...formData, acceptAdultDisclaimer: v })}
                      trackColor={{ false: themed.border, true: '#f59e0b' }}
                      thumbColor={formData.acceptAdultDisclaimer ? '#fff' : '#f4f3f4'}
                    />
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            {step > 1 && (
              <TouchableOpacity
                style={[styles.backButton, { borderColor: themed.border }]}
                onPress={() => setStep(step - 1)}
                disabled={saving}
              >
                <Text style={[styles.backButtonText, { color: themed.text }]}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.nextButton, step === 1 && styles.nextButtonFull]}
              onPress={handleNext}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.nextButtonText}>{step === 3 ? 'Complete Setup' : 'Next'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  progressBarActive: {
    backgroundColor: '#6366f1',
  },
  stepText: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 24,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepContent: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 100,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  ageDisplay: {
    fontSize: 14,
    marginTop: 12,
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  termsBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  termsItem: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6366f1',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  adultBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  adultTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  adultDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});
