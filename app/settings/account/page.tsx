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

  const [googleConnected, setGoogleConnected] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleMessage, setGoogleMessage] = useState<string | null>(null);

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
      
      const hasGoogle = user.identities?.some(identity => identity.provider === 'google');
      setGoogleConnected(!!hasGoogle);
      
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

  const handleConnectGoogle = async () => {
    setConnectingGoogle(true);
    setGoogleError(null);
    setGoogleMessage(null);

    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?returnTo=/settings/account`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setGoogleError(err?.message || 'Unable to connect Google right now.');
      setConnectingGoogle(false);
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
                <div className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-foreground">Google</div>
                  <div className="text-sm text-muted-foreground">
                    {googleConnected ? 'Connected' : 'Not connected'}
                  </div>
                </div>
              </div>
              {!googleConnected && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={connectingGoogle}
                  isLoading={connectingGoogle}
                  onClick={handleConnectGoogle}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Connect
                </Button>
              )}
              {googleConnected && (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              )}
            </div>

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

            {googleError && (
              <div className="flex items-start gap-2 text-destructive text-sm">
                <AlertCircle size={18} />
                <span>{googleError}</span>
              </div>
            )}

            {googleMessage && (
              <div className="flex items-start gap-2 text-success text-sm">
                <CheckCircle2 size={18} />
                <span>{googleMessage}</span>
              </div>
            )}

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
