'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import SmartBrandLogo from '@/components/SmartBrandLogo';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { PolicyFooter } from '@/components/PolicyFooter';

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

  useEffect(() => {
    const urlError = searchParams?.get('error');
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [searchParams]);

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
          // Profile complete, redirect to next URL or Watch (default landing)
          // Set flag so home page knows initial redirect is done
          try { sessionStorage.setItem('mll:home_redirected', 'true'); } catch {}
          const next = new URLSearchParams(window.location.search).get('next');
          const safeNext = next && next.startsWith('/') && !next.startsWith('//') && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(next) && next !== '/login' && next !== '/signup' ? next : '/watch';
          router.push(safeNext);
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
            // Profile complete, redirect to next URL or Watch (default landing)
            // Set flag so home page knows initial redirect is done
            try { sessionStorage.setItem('mll:home_redirected', 'true'); } catch {}
            const next = new URLSearchParams(window.location.search).get('next');
            const safeNext = next && next.startsWith('/') && !next.startsWith('//') && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(next) && next !== '/login' && next !== '/signup' ? next : '/watch';
            router.push(safeNext);
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
    <main id="main" className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 flex flex-col items-center justify-center p-4">
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
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    Password
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => router.push('/reset-password')}
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
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

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    const nextParam = new URLSearchParams(window.location.search).get('next');
                    const callbackUrl = new URL('/auth/callback', window.location.origin);
                    if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
                      callbackUrl.searchParams.set('next', nextParam);
                    }
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: callbackUrl.toString(),
                      },
                    });
                    if (error) throw error;
                  } catch (err: any) {
                    setError(err.message || 'Failed to connect with Google');
                    setLoading(false);
                  }
                }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    const nextParam = new URLSearchParams(window.location.search).get('next');
                    const callbackUrl = new URL('/auth/callback', window.location.origin);
                    if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
                      callbackUrl.searchParams.set('next', nextParam);
                    }
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: 'apple',
                      options: {
                        redirectTo: callbackUrl.toString(),
                      },
                    });
                    if (error) throw error;
                  } catch (err: any) {
                    setError(err.message || 'Failed to connect with Apple');
                    setLoading(false);
                  }
                }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    const nextParam = new URLSearchParams(window.location.search).get('next');
                    const callbackUrl = new URL('/auth/callback', window.location.origin);
                    if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
                      callbackUrl.searchParams.set('next', nextParam);
                    }
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: 'facebook',
                      options: {
                        redirectTo: callbackUrl.toString(),
                      },
                    });
                    if (error) throw error;
                  } catch (err: any) {
                    setError(err.message || 'Failed to connect with Facebook');
                    setLoading(false);
                  }
                }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Continue with Facebook
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    const nextParam = new URLSearchParams(window.location.search).get('next');
                    const callbackUrl = new URL('/auth/callback', window.location.origin);
                    if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
                      callbackUrl.searchParams.set('next', nextParam);
                    }
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: 'twitch',
                      options: {
                        redirectTo: callbackUrl.toString(),
                      },
                    });
                    if (error) throw error;
                  } catch (err: any) {
                    setError(err.message || 'Failed to connect with Twitch');
                    setLoading(false);
                  }
                }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                </svg>
                Continue with Twitch
              </Button>
            </div>

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

      <div className="mt-10 w-full">
        <PolicyFooter />
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
