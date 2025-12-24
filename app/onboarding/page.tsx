'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';

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
    
    // Check if profile already complete
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, date_of_birth')
      .eq('id', user.id)
      .single();
    
    if (profile?.username && profile?.date_of_birth) {
      router.push('/live');
      return;
    }
    
    // Pre-fill username if exists
    if (profile?.username) {
      setFormData(prev => ({ ...prev, username: profile.username }));
    }
    
    setLoading(false);
  };

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const validateStep = (currentStep: number): boolean => {
    setError('');
    
    switch (currentStep) {
      case 1: // Username
        if (!formData.username.trim()) {
          setError('Username is required');
          return false;
        }
        if (formData.username.length < 3) {
          setError('Username must be at least 3 characters');
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
      
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: formData.username.trim(),
          display_name: formData.displayName.trim() || null,
          bio: formData.bio.trim() || null,
          date_of_birth: formData.dateOfBirth,
          adult_verified_at: age >= 18 ? new Date().toISOString() : null,
          adult_verified_method: age >= 18 ? 'self_attested' : null
        })
        .eq('id', userId);
      
      if (profileError) throw profileError;
      
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
          // Don't fail the whole onboarding if this fails
        }
      }
      
      // Redirect to profile or live room
      router.push('/live');
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Failed to complete profile setup');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center">
        <div className="animate-pulse text-white text-2xl">Loading...</div>
      </div>
    );
  }

  const isAdult = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) >= 18 : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 md:p-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Welcome to MyLiveLinks!</h1>
          <p className="text-gray-600">Let's set up your profile</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`w-1/4 h-2 mx-1 rounded-full transition ${
                  s <= step ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-gray-600">Step {step} of 4</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="mb-8">
          {/* Step 1: Username */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Choose Your Username</h2>
              <p className="text-gray-600 mb-6">
                This will be your unique identifier on MyLiveLinks. Choose wisely - you can't change it later!
              </p>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="username"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none text-lg"
                maxLength={30}
              />
              <p className="text-sm text-gray-500 mt-2">
                Your profile will be: mylivelinks.com/@{formData.username || 'username'}
              </p>
            </div>
          )}

          {/* Step 2: Age Verification */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Age Verification</h2>
              <p className="text-gray-600 mb-6">
                We need to verify your age to comply with regulations. You must be at least 13 years old to use this platform.
              </p>
              <label className="block mb-2 font-semibold text-gray-700">Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none text-lg"
                max={new Date().toISOString().split('T')[0]}
              />
              {formData.dateOfBirth && (
                <p className="text-sm text-gray-600 mt-2">
                  Age: {calculateAge(formData.dateOfBirth)} years old
                </p>
              )}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Privacy:</strong> Your date of birth is private and will never be shown publicly. 
                  It's only used for age verification.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Profile Details */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Tell Us About Yourself</h2>
              <p className="text-gray-600 mb-6">
                This information will be visible on your public profile (optional)
              </p>
              
              <div className="mb-4">
                <label className="block mb-2 font-semibold text-gray-700">Display Name (Optional)</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Your Name"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none"
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1">This is how you'll appear to others</p>
              </div>

              <div className="mb-4">
                <label className="block mb-2 font-semibold text-gray-700">Bio (Optional)</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell people a bit about yourself..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.bio.length}/500 characters
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Terms & Conditions */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Terms & Agreements</h2>
              
              <div className="mb-6 p-4 border-2 border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                <h3 className="font-bold mb-2">Terms of Service</h3>
                <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
                  <li>You must be at least 13 years old to use this service</li>
                  <li>You are responsible for all content you post</li>
                  <li>Harassment, hate speech, and illegal content are prohibited</li>
                  <li>We reserve the right to suspend or terminate accounts that violate our policies</li>
                  <li>Your data is handled according to our Privacy Policy</li>
                  <li>Virtual currency and gifts have no real-world cash value</li>
                </ul>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                    className="mt-1 w-5 h-5 text-purple-600"
                  />
                  <span className="text-gray-700">
                    I agree to the <span className="text-purple-600 underline">Terms of Service</span> and{' '}
                    <span className="text-purple-600 underline">Privacy Policy</span>
                  </span>
                </label>

                {isAdult && (
                  <label className="flex items-start gap-3 cursor-pointer p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <input
                      type="checkbox"
                      checked={formData.acceptAdultDisclaimer}
                      onChange={(e) => setFormData({ ...formData, acceptAdultDisclaimer: e.target.checked })}
                      className="mt-1 w-5 h-5 text-orange-600"
                    />
                    <div>
                      <span className="text-gray-700 font-semibold">
                        Adult Content Disclaimer (Optional)
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        I am 18 years or older and consent to viewing adult/sensitive content when available. 
                        Adult content is only available on web and requires consent.
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
            <button
              onClick={() => setStep(step - 1)}
              disabled={saving}
              className="flex-1 px-6 py-3 border-2 border-purple-600 text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition disabled:opacity-50"
            >
              Back
            </button>
          )}
          
          <button
            onClick={handleNext}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : step === 4 ? 'Complete Setup' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

