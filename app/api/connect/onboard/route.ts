import { NextRequest, NextResponse } from 'next/server';
import {
  createConnectAccount,
  createAccountLink,
  logStripeAction,
} from '@/lib/stripe';
import {
  getConnectAccount,
  saveConnectAccount,
} from '@/lib/supabase-admin';
import { getSessionUser } from '@/lib/admin';

/**
 * POST /api/connect/onboard
 * Create Stripe Connect Express account and return onboarding URL
 * 
 * Returns: { url: string } - Stripe onboarding URL
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Get authenticated user (supports cookie auth on web + bearer auth on mobile)
    const user = await getSessionUser(request);
    if (!user) {
      logStripeAction('connect-onboard-unauthorized', { requestId });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mylivelinks.com';

    // Check if user already has a Connect account
    let existingAccount = await getConnectAccount(user.id);

    if (existingAccount) {
      // User already has account, create new onboarding link
      logStripeAction('connect-onboard-existing', {
        requestId,
        userId: user.id,
        accountId: existingAccount.stripe_account_id,
      });

      const accountLink = await createAccountLink({
        accountId: existingAccount.stripe_account_id,
        refreshUrl: `${baseUrl}/wallet?connect=refresh`,
        returnUrl: `${baseUrl}/wallet?connect=complete`,
      });

      return NextResponse.json({ url: accountLink.url });
    }

    // Create new Connect Express account
    logStripeAction('connect-onboard-creating', {
      requestId,
      userId: user.id,
    });

    const account = await createConnectAccount({
      userId: user.id,
      email: user.email,
    });

    // Save to database
    const saveResult = await saveConnectAccount({
      userId: user.id,
      stripeAccountId: account.id,
      accountType: 'express',
    });

    if (!saveResult.success) {
      logStripeAction('connect-onboard-save-failed', {
        requestId,
        userId: user.id,
        error: saveResult.error,
      });
      // Continue anyway, account exists in Stripe
    }

    // Create onboarding link
    const accountLink = await createAccountLink({
      accountId: account.id,
      refreshUrl: `${baseUrl}/wallet?connect=refresh`,
      returnUrl: `${baseUrl}/wallet?connect=complete`,
    });

    logStripeAction('connect-onboard-success', {
      requestId,
      userId: user.id,
      accountId: account.id,
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    logStripeAction('connect-onboard-error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    console.error('[CONNECT] Onboard error:', error);
    return NextResponse.json(
      { error: 'Failed to start onboarding' },
      { status: 500 }
    );
  }
}








