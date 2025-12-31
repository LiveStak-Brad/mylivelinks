import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server';

/**
 * POST /api/profile/change-email
 * Updates the authenticated user's email and triggers Supabase confirmation
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);

    // Require auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { newEmail } = await request.json();

    if (!newEmail || typeof newEmail !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const trimmedEmail = newEmail.trim().toLowerCase();

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    // Prevent no-op updates
    if (trimmedEmail === (user.email || '').toLowerCase()) {
      return NextResponse.json({ error: 'That is already your email' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://mylivelinks.com';
    const emailRedirectTo = `${origin}/settings/profile`;

    const { error: updateError } = await supabase.auth.updateUser(
      { email: trimmedEmail },
      { emailRedirectTo }
    );

    if (updateError) {
      console.error('Email change error:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to change email' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Check your email to confirm the change. The update will complete after you click the confirmation link.',
      emailRedirectTo,
    });
  } catch (error) {
    console.error('Change email API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

