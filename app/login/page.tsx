'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import SmartBrandLogo from '@/components/SmartBrandLogo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = createClient();

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <SmartBrandLogo />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            {isSignUp ? 'Sign up to get started' : 'Sign in to your account'}
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm">
              {message}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="you@example.com"
              />
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium mb-2">
                  Username
                </label>
                <input
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="username"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Letters, numbers, and underscores only (3-20 characters)
                </p>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="••••••••"
              />
              {isSignUp && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum 6 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          {/* Toggle Sign Up/Sign In */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
                setUsername(''); // Clear username when switching
              }}
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

