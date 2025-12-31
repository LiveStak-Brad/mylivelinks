'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { PageShell, PageHeader, PageSection } from '@/components/layout';
import { Button, Input } from '@/components/ui';
import { AlertCircle, MailCheck } from 'lucide-react';

export default function ChangeEmailPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const email = user.email || '';
    setCurrentEmail(email);
    setNewEmail(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/profile/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to change email');
        return;
      }

      setMessage(data.message || 'Check your email to confirm the change.');
      setCurrentEmail(newEmail);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell maxWidth="md" padding="md">
      <PageHeader
        title="Change Email"
        description="Update the email you use to sign in."
        backLink="/settings/profile"
        backLabel="Back to Profile Settings"
      />

      <PageSection card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Email */}
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Current Email</label>
            <Input type="email" value={currentEmail} disabled />
          </div>

          {/* New Email */}
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">New Email</label>
            <Input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <p className="text-xs text-muted-foreground mt-2">
              We’ll send a confirmation link to the new address. The change completes after you confirm.
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <AlertCircle size={18} className="mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="flex items-start gap-2 text-success text-sm bg-success/10 border border-success/30 rounded-lg p-3">
              <MailCheck size={18} className="mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" disabled={submitting || !newEmail} className="flex-1" size="lg">
              {submitting ? 'Sending...' : 'Send Confirmation Email'}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => router.push('/settings/profile')}>
              Cancel
            </Button>
          </div>
        </form>
      </PageSection>

      <div className="mt-6 bg-muted/50 border border-muted rounded-xl p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">What to expect</p>
        <ul className="list-disc list-inside space-y-1">
          <li>You’ll receive a confirmation link at your new email.</li>
          <li>The change isn’t complete until you click the link.</li>
          <li>If you don’t see the email, check spam or try again.</li>
        </ul>
      </div>
    </PageShell>
  );
}

