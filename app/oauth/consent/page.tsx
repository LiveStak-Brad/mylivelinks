'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import SmartBrandLogo from '@/components/SmartBrandLogo';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase';

// Force dynamic rendering; this page needs live auth/session + URL params.
export const dynamic = 'force-dynamic';
export const revalidate = false;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

type ConsentStatus = 'idle' | 'loading';

// Validate the redirect URI is at least a proper http/https URL before we bounce the user.
function getSafeRedirectUri(raw: string | null) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
    return null;
  } catch {
    return null;
  }
}

function OAuthConsentInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [status, setStatus] = useState<ConsentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const clientId = searchParams.get('client_id');
  const redirectUri = getSafeRedirectUri(searchParams.get('redirect_uri'));
  const state = searchParams.get('state');
  const scope = searchParams.get('scope') || '';
  const responseType = searchParams.get('response_type') || 'code';
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');
  const appName = searchParams.get('app_name') || 'This application';

  const missingParams =
    !clientId || !redirectUri || !state || !responseType;

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      if (sessionError || !data.session) {
        setUserEmail(null);
        setSessionToken(null);
        return;
      }
      setUserEmail(data.session.user.email ?? null);
      setSessionToken(data.session.access_token);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  const handleDeny = () => {
    if (!redirectUri) return;
    try {
      const url = new URL(redirectUri);
      url.searchParams.set('error', 'access_denied');
      if (state) url.searchParams.set('state', state);
      window.location.href = url.toString();
    } catch {
      router.push('/');
    }
  };

  const handleApprove = async () => {
    setError(null);
    if (missingParams) {
      setError('Missing required OAuth parameters. Please restart from the application.');
      return;
    }
    if (!sessionToken) {
      setError('Please sign in again to approve access.');
      router.push(`/login?returnUrl=${encodeURIComponent(window.location.href)}`);
      return;
    }

    setStatus('loading');
    try {
      const payload: Record<string, string> = {
        client_id: clientId!,
        redirect_uri: redirectUri!,
        state: state || '',
        scope,
        response_type: responseType,
      };
      if (codeChallenge) payload.code_challenge = codeChallenge;
      if (codeChallengeMethod) payload.code_challenge_method = codeChallengeMethod;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/oauth/authorize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            ...payload,
            consent: true,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        // The Auth API should give us a URL to continue the flow.
        const redirectTo: string | undefined =
          data.redirect_to || data.redirectTo || data.url;

        if (redirectTo) {
          window.location.href = redirectTo;
          return;
        }

        // Fallback: try redirect_uri with state if API didn't send a URL.
        const url = new URL(redirectUri!);
        url.searchParams.set('state', state || '');
        window.location.href = url.toString();
        return;
      }

      const msg =
        data?.error_description ||
        data?.error ||
        'We could not complete the authorization. Please try again.';
      setError(msg);
    } catch (err: any) {
      setError(err?.message || 'Unexpected error while authorizing.');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-xl border-0">
          <CardHeader className="flex items-center gap-3">
            <SmartBrandLogo />
            <div>
              <CardTitle className="text-2xl">Authorize {appName}</CardTitle>
              <CardDescription>
                Approve access so this app can use your MyLiveLinks account.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {missingParams && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                Missing required OAuth parameters. Ask the requesting app to restart the authorization flow.
              </div>
            )}

            {!userEmail && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                You need to sign in before approving.{' '}
                <Link
                  className="font-semibold underline"
                  href={`/login?returnUrl=${encodeURIComponent('/oauth/consent?' + searchParams.toString())}`}
                >
                  Sign in to continue
                </Link>
                .
              </div>
            )}

            {userEmail && (
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <div className="font-semibold text-foreground">Signed in as</div>
                <div className="text-foreground">{userEmail}</div>
                <div className="text-xs">
                  If this is not you, please sign out and sign back in with the correct account.
                </div>
              </div>
            )}

            <div className="bg-muted/40 rounded-lg p-4 border border-muted/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-foreground">Requested scopes</span>
                <Badge variant="secondary">{scope ? scope : 'basic'}</Badge>
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>View your profile basics.</li>
                <li>Update account data you explicitly allow.</li>
                <li>Act on your behalf within granted scopes.</li>
              </ul>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleDeny}
                disabled={!redirectUri || status === 'loading'}
              >
                Deny
              </Button>
              <Button
                onClick={handleApprove}
                disabled={status === 'loading' || missingParams || !userEmail}
                isLoading={status === 'loading'}
              >
                Approve & Continue
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              We never share your password. You can revoke access at any time in your account security settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function OAuthConsentPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10">
          <div className="animate-pulse h-10 w-32 rounded-full bg-muted" />
        </main>
      }
    >
      <OAuthConsentInner />
    </Suspense>
  );
}
