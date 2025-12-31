'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { PageShell, PageHeader, PageSection } from '@/components/layout';
import { Button, Input } from '@/components/ui';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AccountSettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [updatingEmail, setUpdatingEmail] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/login');
        return;
      }
      setUserEmail(user.email || '');
      setNewEmail(user.email || '');
      setLoading(false);
    };

    load();
  }, [router, supabase]);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail === userEmail) {
      setEmailMessage('That is already your current email.');
      setEmailError(null);
      return;
    }

    setUpdatingEmail(true);
    setEmailError(null);
    setEmailMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      setEmailMessage('Check your new inbox to confirm the email change.');
      setUserEmail(newEmail);
    } catch (err: any) {
      setEmailError(err?.message || 'Unable to update email right now.');
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      setPasswordMessage(null);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      setPasswordMessage(null);
      return;
    }

    setUpdatingPassword(true);
    setPasswordError(null);
    setPasswordMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordMessage('Password updated. You may need to log in again on other devices.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err?.message || 'Unable to update password right now.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-pulse h-10 w-40 rounded-full bg-muted" />
      </div>
    );
  }

  return (
    <PageShell maxWidth="md" padding="md">
      <PageHeader
        title="Account & Security"
        description="Update your login email and password."
        backLink="/settings/profile"
        backLabel="Back to profile settings"
      />

      <div className="space-y-6">
        <PageSection card>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Current Email</label>
              <Input type="email" value={userEmail} disabled />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">New Email</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>

            {emailError && (
              <div className="flex items-start gap-2 text-destructive text-sm">
                <AlertCircle size={18} />
                <span>{emailError}</span>
              </div>
            )}

            {emailMessage && (
              <div className="flex items-start gap-2 text-success text-sm">
                <CheckCircle2 size={18} />
                <span>{emailMessage}</span>
              </div>
            )}

            <Button type="submit" disabled={updatingEmail} isLoading={updatingEmail}>
              Update Email
            </Button>
          </form>
        </PageSection>

        <PageSection card>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Confirm Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
                placeholder="••••••••"
              />
            </div>

            {passwordError && (
              <div className="flex items-start gap-2 text-destructive text-sm">
                <AlertCircle size={18} />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordMessage && (
              <div className="flex items-start gap-2 text-success text-sm">
                <CheckCircle2 size={18} />
                <span>{passwordMessage}</span>
              </div>
            )}

            <Button type="submit" disabled={updatingPassword} isLoading={updatingPassword}>
              Update Password
            </Button>
          </form>
        </PageSection>
      </div>
    </PageShell>
  );
}
