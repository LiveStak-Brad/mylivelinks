import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Server-side callback handler for password reset links.
 * Exchanges the PKCE code for a session server-side (where cookies are accessible),
 * then redirects to the reset-password page with session ready.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  console.log('Reset callback received:', { 
    hasCode: !!code, 
    error,
    url: requestUrl.toString() 
  });

  // Handle error from Supabase (e.g., expired link)
  if (error) {
    console.error('Reset callback error from Supabase:', error, errorDescription);
    return NextResponse.redirect(
      `${requestUrl.origin}/reset-password?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code) {
    console.error('Reset callback: No code provided');
    return NextResponse.redirect(
      `${requestUrl.origin}/reset-password?error=${encodeURIComponent('Invalid reset link. Please request a new one.')}`
    );
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  console.log('Attempting to exchange reset code for session...');
  const { error: exchangeError, data } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error('Reset code exchange error:', exchangeError);
    return NextResponse.redirect(
      `${requestUrl.origin}/reset-password?error=${encodeURIComponent(exchangeError.message || 'Failed to verify reset link. Please request a new one.')}`
    );
  }

  console.log('Reset session exchange successful:', { 
    userId: data.user?.id,
    email: data.user?.email 
  });

  // Redirect to reset-password page with mode=reset to show password form
  return NextResponse.redirect(`${requestUrl.origin}/reset-password?mode=reset`);
}
