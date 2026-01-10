import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const returnTo = requestUrl.searchParams.get('returnTo');

  if (code) {
    const supabase = createClient();
    
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`);
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, date_of_birth')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!profile) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          username: null,
          coin_balance: 0,
          earnings_balance: 0,
          gifter_level: 0,
        });
      }

      if (returnTo) {
        return NextResponse.redirect(`${requestUrl.origin}${returnTo}`);
      }

      if (profile?.username && profile?.date_of_birth) {
        return NextResponse.redirect(`${requestUrl.origin}/${profile.username}`);
      } else {
        return NextResponse.redirect(`${requestUrl.origin}/onboarding`);
      }
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/login`);
}
