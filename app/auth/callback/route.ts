import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const returnTo = requestUrl.searchParams.get('returnTo');

  console.log('Auth callback received:', { 
    hasCode: !!code, 
    returnTo,
    url: requestUrl.toString() 
  });

  if (code) {
    const supabase = createClient();
    
    console.log('Attempting to exchange code for session...');
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent('Authentication failed. Please try again.')}`);
    }

    console.log('Session exchange successful:', { 
      userId: data.user?.id,
      email: data.user?.email 
    });

    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, date_of_birth')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }

      if (!profile) {
        const { error: insertError } = await supabase.from('profiles').insert({
          id: data.user.id,
          username: null,
          coin_balance: 0,
          earnings_balance: 0,
          gifter_level: 0,
        });
        
        if (insertError) {
          console.error('Profile creation error:', insertError);
          return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent('Failed to create profile. Please try again.')}`);
        }
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
