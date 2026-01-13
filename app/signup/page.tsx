'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import SmartBrandLogo from '@/components/SmartBrandLogo';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { PolicyFooter } from '@/components/PolicyFooter';

function SignUpPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = createClient();

  const referralCode = (searchParams?.get('ref') || '').trim();
  const referralClickId = (searchParams?.get('click_id') || '').trim();

  useEffect(() => {
    // Check if already logged in
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      
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
          router.push('/');
        } else {
          router.push('/onboarding');
        }
      }
    };
    
    checkAuth();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Validate passwords match
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Sign up
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Auto sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setMessage('Account created! Please sign in to continue.');
          setTimeout(() => {
            router.push('/login');
          }, 2000);
          return;
        }

        // Create basic profile
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          coin_balance: 0,
          earnings_balance: 0,
          gifter_level: 0,
        });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        if (referralCode) {
          try {
            await supabase.rpc('claim_referral', {
              p_code: referralCode,
              p_click_id: referralClickId || null,
              p_device_id: null,
            });
          } catch (claimErr) {
            console.warn('Referral claim failed (non-blocking):', claimErr);
          }
        }

        setMessage('Account created! Redirecting to setup...');
        setTimeout(() => {
          router.push('/onboarding');
        }, 1000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
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

            {/* Header */}
            <h1 className="text-3xl font-bold text-center mb-2 text-foreground">Create Account</h1>
            <p className="text-center text-muted-foreground mb-8">Join MyLiveLinks today</p>

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
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email Address
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

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
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
                <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                isLoading={loading}
                size="lg"
                className="w-full"
              >
                Create Account
              </Button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                  Sign In
                </Link>
              </p>
            </div>

            {/* Terms */}
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                By signing up, you agree to our{' '}
                <Link href="/policies/terms-of-service" className="text-primary hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/policies/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-4">
          <Link 
            href="/home" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>

      <div className="mt-10 w-full">
        <PolicyFooter />
      </div>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpPageInner />
    </Suspense>
  );
}
