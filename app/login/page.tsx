'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import SmartBrandLogo from '@/components/SmartBrandLogo';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = createClient();

  const referralCode = (searchParams?.get('ref') || '').trim();
  const referralClickId = (searchParams?.get('click_id') || '').trim();

  const withTimeout = async <T = any,>(p: PromiseLike<T>, ms: number, label: string): Promise<T> => {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    });
    try {
      return await Promise.race([Promise.resolve(p), timeoutPromise]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  };

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: any } }) => {
      if (user) {
        // Check if profile is complete - use maybeSingle() to avoid error if no row
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username, date_of_birth')
          .eq('id', user.id)
          .maybeSingle();
        
        // If no profile exists, create minimal one
        if (!profile && !profileError) {
          await supabase
            .from('profiles')
            .insert({
              id: user.id,
              username: null,
              coin_balance: 0,
              earnings_balance: 0,
              gifter_level: 0
            });
        }
        
        if (profile?.username && profile?.date_of_birth) {
          // Profile complete, redirect to return URL or user's own profile
          const returnUrl = new URLSearchParams(window.location.search).get('returnUrl') || `/${profile.username}`;
          router.push(returnUrl);
        } else {
          // Profile incomplete, redirect to onboarding
          router.push('/onboarding');
        }
      }
    });
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Clear any mock user data
      localStorage.removeItem('mock_user');

      if (isSignUp) {
        // Validate username
        if (!username || username.length < 4) {
          throw new Error('Username must be at least 4 characters');
        }
        
        // Validate username format (alphanumeric and underscores only)
        if (!/^[a-z0-9_]+$/.test(username.toLowerCase())) {
          throw new Error('Username can only contain letters, numbers, and underscores');
        }

        // Sign up - with auto-confirm since auth is disabled on Supabase
        const { data, error: signUpError } = await withTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/settings/profile`,
              data: {
                username: username.toLowerCase(),
              },
            },
          }),
          10000,
          'Sign up'
        );

        if (signUpError) throw signUpError;

        if (data.user) {
          // Clear any mock user data
          localStorage.removeItem('mock_user');
          
          // IMPORTANT: Sign in FIRST before creating profile (RLS requires auth.uid() = id)
          // Since auth is disabled, user should be auto-confirmed, but we need to establish session
          const { error: signInError } = await withTimeout(
            supabase.auth.signInWithPassword({
              email,
              password,
            }),
            10000,
            'Auto sign-in'
          );

          if (signInError) {
            console.error('Auto-login error:', signInError);
            // If sign-in fails, try to create profile anyway (might work if user is confirmed)
            // But this is less ideal - better to ensure sign-in works
            setMessage('Account created but sign-in failed. Please try signing in manually.');
            setIsSignUp(false);
            return;
          }

          // Now create profile AFTER signing in (so auth.uid() is set)
          const cleanUsername = username.toLowerCase().trim();
          const { error: profileError } = await (supabase.from('profiles') as any).upsert({
            id: data.user.id,
            username: cleanUsername,
            display_name: username, // Use original case for display
            coin_balance: 0,
            earnings_balance: 0,
            gifter_level: 0,
          });

          if (profileError) {
            console.error('Profile creation error:', profileError);
            // If username already exists, suggest alternatives
            if (profileError.code === '23505') { // Unique violation
              throw new Error(`Username "${cleanUsername}" is already taken. Please choose another.`);
            }
            throw profileError;
          }

          if (referralCode) {
            try {
              await supabase.rpc('claim_referral', {
                p_code: referralCode,
                p_click_id: referralClickId || null,
                p_device_id: null,
              });
            } catch (claimErr) {
              console.warn('[referrals] claim_referral failed (non-blocking):', claimErr);
            }
          }

          setMessage('Account created successfully! Redirecting...');
          // Redirect to onboarding to complete profile setup
          setTimeout(() => {
            router.push('/onboarding');
          }, 1000);
        }
      } else {
        // Sign in
        const { data, error: signInError } = await withTimeout(
          supabase.auth.signInWithPassword({
            email,
            password,
          }),
          10000,
          'Sign in'
        );

        if (signInError) throw signInError;

        if (data.user) {
          // Clear any mock user data
          localStorage.removeItem('mock_user');
          
          // Check if profile is complete
          const { data: profile, error: profileError } = await withTimeout(
            supabase
              .from('profiles')
              .select('username, date_of_birth')
              .eq('id', data.user.id)
              .maybeSingle(),
            10000,
            'Loading profile'
          );

          if (!profile && !profileError) {
            await withTimeout(
              supabase
                .from('profiles')
                .insert({
                  id: data.user.id,
                  username: null,
                  coin_balance: 0,
                  earnings_balance: 0,
                  gifter_level: 0,
                }),
              10000,
              'Creating profile'
            );
          }

          if (referralCode) {
            try {
              await supabase.rpc('claim_referral', {
                p_code: referralCode,
                p_click_id: referralClickId || null,
                p_device_id: null,
              });
            } catch (claimErr) {
              console.warn('[referrals] claim_referral failed (non-blocking):', claimErr);
            }
          }
          
          if (profile?.username && profile?.date_of_birth) {
            // Profile complete, redirect to return URL or user's own profile
            const returnUrl = new URLSearchParams(window.location.search).get('returnUrl') || `/${profile.username}`;
            router.push(returnUrl);
          } else {
            // Profile incomplete, redirect to onboarding
            router.push('/onboarding');
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main" className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardContent className="p-8">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <SmartBrandLogo />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-center mb-2 text-foreground">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-center text-muted-foreground mb-8">
              {isSignUp ? 'Sign up to get started' : 'Sign in to your account'}
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {message && (
              <div className="mb-4 p-3 rounded-lg bg-success/10 border border-success/30 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                <p className="text-sm text-success">{message}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-foreground">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>

              {isSignUp && (
                <div>
                  <label htmlFor="username" className="block text-sm font-medium mb-2 text-foreground">
                    Username
                  </label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      // Only allow lowercase letters, numbers, and underscores
                      const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                      setUsername(value);
                    }}
                    required
                    minLength={3}
                    maxLength={20}
                    pattern="[a-z0-9_]+"
                    placeholder="username"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Letters, numbers, and underscores only (3-20 characters)
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2 text-foreground">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                />
                {isSignUp && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum 6 characters
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                isLoading={loading}
                size="lg"
                className="w-full"
              >
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Button>
            </form>

            {/* Toggle Sign Up/Sign In */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setMessage(null);
                  setUsername(''); // Clear username when switching
                }}
                className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
