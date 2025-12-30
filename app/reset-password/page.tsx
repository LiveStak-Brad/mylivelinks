'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import SmartBrandLogo from '@/components/SmartBrandLogo';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const supabase = createClient();

  // Check if this is a password reset callback (from email link)
  const accessToken = searchParams?.get('access_token');
  const type = searchParams?.get('type');

  useState(() => {
    if (accessToken && type === 'recovery') {
      setStep('reset');
    }
  });

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      setMessage('Password reset email sent! Check your inbox (and spam folder) for the reset link.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setMessage('Password updated successfully! Redirecting to login...');
      
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardContent className="p-8">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <SmartBrandLogo />
            </div>

            {/* Back to Login */}
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>

            {step === 'request' ? (
              <>
                {/* Request Reset */}
                <h1 className="text-3xl font-bold text-center mb-2 text-foreground">
                  Reset Password
                </h1>
                <p className="text-center text-muted-foreground mb-8">
                  Enter your email and we'll send you a reset link
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

                <form onSubmit={handleRequestReset} className="space-y-4">
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
                      autoFocus
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    isLoading={loading}
                    size="lg"
                    className="w-full"
                  >
                    Send Reset Link
                  </Button>
                </form>
              </>
            ) : (
              <>
                {/* Set New Password */}
                <h1 className="text-3xl font-bold text-center mb-2 text-foreground">
                  Set New Password
                </h1>
                <p className="text-center text-muted-foreground mb-8">
                  Enter your new password below
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

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label htmlFor="new-password" className="block text-sm font-medium mb-2 text-foreground">
                      New Password
                    </label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum 6 characters
                    </p>
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium mb-2 text-foreground">
                      Confirm Password
                    </label>
                    <Input
                      id="confirm-password"
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
                    Update Password
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}

