'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { PageShell, PageHeader, PageSection } from '@/components/layout';
import { Button, Input } from '@/components/ui';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ChangePasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setLoading(false);
    };
    load();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      setMessage(null);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setMessage(null);
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setMessage('Password updated. You may need to log in again on other devices.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err?.message || 'Failed to update password.');
    } finally {
      setSaving(false);
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
        title="Change Password"
        description="Update the password for your account."
        backLink="/settings/profile"
        backLabel="Back to profile settings"
      />

      <PageSection card>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {error && (
            <div className="flex items-start gap-2 text-destructive text-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="flex items-start gap-2 text-success text-sm">
              <CheckCircle2 size={18} />
              <span>{message}</span>
            </div>
          )}

          <Button type="submit" disabled={saving} isLoading={saving}>
            Update Password
          </Button>
        </form>
      </PageSection>
    </PageShell>
  );
}
