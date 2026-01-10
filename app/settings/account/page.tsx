'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { PageShell, PageHeader, PageSection } from '@/components/layout';
import { Button, Input } from '@/components/ui';
import { AlertCircle, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

export default function AccountSettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
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

  const [facebookConnected, setFacebookConnected] = useState(false);
  const [connectingFacebook, setConnectingFacebook] = useState(false);
  const [facebookError, setFacebookError] = useState<string | null>(null);
  const [facebookMessage, setFacebookMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/login');
        return;
      }
      setUser(user);
      setUserEmail(user.email || '');
      setNewEmail(user.email || '');
      
      const hasFacebook = user.identities?.some(identity => identity.provider === 'facebook');
      setFacebookConnected(!!hasFacebook);
      
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

  const handleConnectFacebook = async () => {
    setConnectingFacebook(true);
    setFacebookError(null);
    setFacebookMessage(null);

    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?returnTo=/settings/account`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setFacebookError(err?.message || 'Unable to connect Facebook right now.');
      setConnectingFacebook(false);
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
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground mb-1">Connected Accounts</h2>
            <p className="text-sm text-muted-foreground">Link your social accounts for easier sign-in</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-foreground">Facebook</div>
                  <div className="text-sm text-muted-foreground">
                    {facebookConnected ? 'Connected' : 'Not connected'}
                  </div>
                </div>
              </div>
              {!facebookConnected && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={connectingFacebook}
                  isLoading={connectingFacebook}
                  onClick={handleConnectFacebook}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Connect
                </Button>
              )}
              {facebookConnected && (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              )}
            </div>

            {facebookError && (
              <div className="flex items-start gap-2 text-destructive text-sm">
                <AlertCircle size={18} />
                <span>{facebookError}</span>
              </div>
            )}

            {facebookMessage && (
              <div className="flex items-start gap-2 text-success text-sm">
                <CheckCircle2 size={18} />
                <span>{facebookMessage}</span>
              </div>
            )}
          </div>
        </PageSection>

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
