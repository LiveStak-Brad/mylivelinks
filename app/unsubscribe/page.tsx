import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams?: { token?: string | string[] };
}) {
  const tokenRaw = searchParams?.token;
  const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;
  const validToken = typeof token === 'string' && isUuid(token);

  if (validToken) {
    try {
      const admin = getSupabaseAdmin();
      await admin
        .from('waitlist_mobile')
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq('unsubscribe_token', token);
    } catch (err) {
      // If backend isn't wired, still show success (per requirements).
      console.error('[unsubscribe] update failed:', err);
    }
  }

  // Non-enumerable UX: if token *looks* valid, show success even if row doesn't exist.
  const showSuccess = validToken;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-6">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card/95 shadow-sm p-8 text-center">
        {showSuccess ? (
          <>
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-7 w-7 text-green-600" aria-hidden />
            </div>
            <h1 className="text-lg font-extrabold tracking-tight text-foreground mb-1">You’ve been unsubscribed</h1>
            <p className="text-muted-foreground text-sm">You’ll no longer receive mobile app launch updates.</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <AlertTriangle className="h-7 w-7 text-amber-600" aria-hidden />
            </div>
            <h1 className="text-lg font-extrabold tracking-tight text-foreground mb-1">Invalid unsubscribe link</h1>
            <p className="text-muted-foreground text-sm">The link is incorrect or missing.</p>
          </>
        )}
      </div>
    </div>
  );
}
