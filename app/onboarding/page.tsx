'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button, Input, Textarea, Card, CardContent } from '@/components/ui';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import SmartBrandLogo from '@/components/SmartBrandLogo';

interface OnboardingData {
  username: string;
  displayName: string;
  dateOfBirth: string;
  bio: string;
  acceptTerms: boolean;
  acceptAdultDisclaimer: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<OnboardingData>({
    username: '',
    displayName: '',
    dateOfBirth: '',
    bio: '',
    acceptTerms: false,
    acceptAdultDisclaimer: false
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    setUserId(user.id);
    
    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, date_of_birth')
      .eq('id', user.id)
      .maybeSingle();
    
    // If profile doesn't exist at all, create a minimal one
    if (!profile && !profileError) {
      console.log('[ONBOARDING] No profile found, creating minimal profile...');
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: null,
          coin_balance: 0,
          earnings_balance: 0,
          gifter_level: 0
        });
      
      if (createError) {
        console.error('[ONBOARDING] Failed to create minimal profile:', createError);
      }
    }
    
    if (profile?.username && profile?.date_of_birth) {
      // Profile complete, redirect to next URL or Watch (default landing)
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(next) && next !== '/login' && next !== '/signup' ? next : '/watch';
      router.push(safeNext);
      return;
    }
    
    // Pre-fill username if exists
    if (profile?.username) {
      setFormData(prev => ({ ...prev, username: profile.username }));
    }
    
    setLoading(false);
  };

  const calculateAge = (dob: string): number => {
    // Parse MM/DD/YYYY format
    const parts = dob.split('/');
    if (parts.length !== 3) return 0;
    const month = parseInt(parts[0]) - 1; // JS months are 0-indexed
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
      case 1: // Username
        if (!formData.username.trim()) {
          setError('Username is required');
          return false;
        }
        if (formData.username.length < 4) {
          setError('Username must be at least 4 characters');
          return false;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
          setError('Username can only contain letters, numbers, hyphens, and underscores');
          return false;
        }
        break;
        
      case 2: // Age Verification
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
        
      case 3: // Profile Info
        // Optional fields, just validate if provided
        if (formData.displayName && formData.displayName.length > 50) {
          setError('Display name must be less than 50 characters');
          return false;
        }
        if (formData.bio && formData.bio.length > 500) {
          setError('Bio must be less than 500 characters');
          return false;
        }
        break;
        
      case 4: // Terms
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
    
    // Check username availability on step 1
    if (step === 1) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', formData.username)
        .neq('id', userId!)
        .single();
      
      if (existing) {
        setError('Username is already taken');
        return;
      }
    }
    
    if (step < 4) {
      setStep(step + 1);
    } else {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!userId) return;
    
    setSaving(true);
    setError('');
    
    try {
      const age = calculateAge(formData.dateOfBirth);
      
      // Convert MM/DD/YYYY to YYYY-MM-DD for database
      const parts = formData.dateOfBirth.split('/');
      const dbDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      
      // UPSERT profile (create if doesn't exist, update if it does)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          username: formData.username.trim(),
          display_name: formData.displayName.trim() || null,
          bio: formData.bio.trim() || null,
          date_of_birth: dbDate,
          adult_verified_at: age >= 18 ? new Date().toISOString() : null,
          adult_verified_method: age >= 18 ? 'self_attested' : null,
          coin_balance: 0,
          earnings_balance: 0,
          gifter_level: 0
        }, {
          onConflict: 'id'
        });
      
      if (profileError) {
        console.error('Profile upsert error:', profileError);
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      try {
        await supabase.rpc('log_referral_activity', { p_event_type: 'profile_completed' });
      } catch (refErr) {
        console.warn('[referrals] log_referral_activity failed (non-blocking):', refErr);
      }
      
      // If user is 18+ and accepted adult disclaimer, set up user_settings
      if (age >= 18 && formData.acceptAdultDisclaimer) {
        const { error: settingsError } = await supabase
          .from('user_settings')
          .upsert({
            profile_id: userId,
            has_accepted_adult_disclaimer: true,
            adult_disclaimer_accepted_at: new Date().toISOString(),
            adult_disclaimer_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            hide_adult_content: false
          }, {
            onConflict: 'profile_id'
          });
        
        if (settingsError) {
          console.warn('Could not set adult settings:', settingsError);
        }
      }
      
      // Redirect to next URL or Watch (default landing)
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(next) && next !== '/login' && next !== '/signup' ? next : '/watch';
      router.push(safeNext);
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Failed to complete profile setup');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main id="main" className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center">
        <div className="animate-pulse text-white text-2xl">Loading...</div>
      </main>
    );
  }

  const isAdult = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) >= 18 : false;

  return (
    <main id="main" className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-0">
        <CardContent className="p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <SmartBrandLogo size={80} />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Welcome to MyLiveLinks!</h1>
            <p className="text-muted-foreground">Let's set up your profile</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-2 mx-1 rounded-full transition-colors ${
                    s <= step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">Step {step} of 4</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Step Content */}
          <div className="mb-8">
            {/* Step 1: Username */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Choose Your Username</h2>
                <p className="text-muted-foreground">
                  This will be your unique identifier on MyLiveLinks. Choose wisely - you can't change it later!
                </p>
                <Input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="username"
                  maxLength={30}
                  inputSize="lg"
                />
                <p className="text-sm text-muted-foreground">
                  Your profile will be: mylivelinks.com/@{formData.username || 'username'}
                </p>
              </div>
            )}

            {/* Step 2: Age Verification */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Age Verification</h2>
                <p className="text-muted-foreground">
                  We need to verify your age to comply with regulations. You must be at least 13 years old to use this platform.
                </p>
                <div>
                  <label className="block mb-2 font-medium text-foreground">Date of Birth</label>
                  <Input
                    type="text"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    placeholder="MM/DD/YYYY"
                    maxLength={10}
                    inputSize="lg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Example: 01/15/1990</p>
                </div>
                {formData.dateOfBirth && (
                  <p className="text-sm text-muted-foreground">
                    Age: {calculateAge(formData.dateOfBirth)} years old
                  </p>
                )}
                <div className="p-4 rounded-lg bg-info/10 border border-info/30 flex items-start gap-2">
                  <Info className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-info">
                    <strong>Privacy:</strong> Your date of birth is private and will never be shown publicly.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Profile Details */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Tell Us About Yourself</h2>
                <p className="text-muted-foreground">
                  This information will be visible on your public profile (optional)
                </p>
                
                <div>
                  <label className="block mb-2 font-medium text-foreground">Display Name (Optional)</label>
                  <Input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Your Name"
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground mt-1">This is how you'll appear to others</p>
                </div>

                <div>
                  <label className="block mb-2 font-medium text-foreground">Bio (Optional)</label>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell people a bit about yourself..."
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.bio.length}/500 characters
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Terms & Conditions */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Terms & Agreements</h2>
                
                <div className="p-4 border border-border rounded-lg max-h-64 overflow-y-auto bg-muted/30">
                  <h3 className="font-bold mb-2 text-foreground">Terms of Service</h3>
                  <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                    <li>You must be at least 13 years old to use this service</li>
                    <li>You are responsible for all content you post</li>
                    <li>Harassment, hate speech, and illegal content are prohibited</li>
                    <li>We reserve the right to suspend or terminate accounts that violate our policies</li>
                    <li>Your data is handled according to our Privacy Policy</li>
                    <li>Virtual currency and gifts have no real-world cash value</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.acceptTerms}
                      onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                      className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-foreground group-hover:text-primary transition-colors">
                      I agree to the <span className="text-primary underline">Terms of Service</span> and{' '}
                      <span className="text-primary underline">Privacy Policy</span>
                    </span>
                  </label>

                  {isAdult && (
                    <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg bg-warning/10 border border-warning/30 group">
                      <input
                        type="checkbox"
                        checked={formData.acceptAdultDisclaimer}
                        onChange={(e) => setFormData({ ...formData, acceptAdultDisclaimer: e.target.checked })}
                        className="mt-1 w-5 h-5 rounded border-warning text-warning focus:ring-warning"
                      />
                      <div>
                        <span className="text-foreground font-semibold">
                          Adult Content Disclaimer (Optional)
                        </span>
                        <p className="text-sm text-muted-foreground mt-1">
                          I am 18 years or older and consent to viewing adult/sensitive content when available.
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            {step > 1 && (
              <Button
                type="button"
                onClick={() => setStep(step - 1)}
                disabled={saving}
                variant="outline"
                size="lg"
                className="flex-1"
              >
                Back
              </Button>
            )}
            
            <Button
              type="button"
              onClick={handleNext}
              disabled={saving}
              isLoading={saving}
              size="lg"
              className="flex-1"
            >
              {step === 4 ? 'Complete Setup' : 'Next'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
