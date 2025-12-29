import { NextRequest, NextResponse } from 'next/server';
import { retrieveAccount, logStripeAction } from '@/lib/stripe';
import {
  getConnectAccount,
  updateConnectAccountStatus,
} from '@/lib/supabase-admin';
import { getSessionUser } from '@/lib/admin';

/**
 * GET /api/connect/status
 * Get current user's Connect account status
 * 
 * Returns: {
 *   hasAccount: boolean,
 *   payoutsEnabled: boolean,
 *   onboardingComplete: boolean,
 *   country?: string,
 *   disabledReason?: string
 * }
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Get authenticated user (supports cookie auth on web + bearer auth on mobile)
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Connect account from database
    const account = await getConnectAccount(user.id);

    if (!account) {
      return NextResponse.json({
        hasAccount: false,
        payoutsEnabled: false,
        onboardingComplete: false,
      });
    }

    // Refresh status from Stripe
    try {
      const stripeAccount = await retrieveAccount(account.stripe_account_id);

      let disabledReason: string | undefined;
      if (!stripeAccount.payouts_enabled && stripeAccount.requirements) {
        const errors = stripeAccount.requirements.errors;
        if (errors && errors.length > 0) {
          disabledReason = errors.map(e => e.reason).join('; ');
        } else if (stripeAccount.requirements.disabled_reason) {
          disabledReason = stripeAccount.requirements.disabled_reason;
        }
      }

      // Update database with latest status
      await updateConnectAccountStatus({
        stripeAccountId: account.stripe_account_id,
        payoutsEnabled: stripeAccount.payouts_enabled || false,
        chargesEnabled: stripeAccount.charges_enabled || false,
        detailsSubmitted: stripeAccount.details_submitted || false,
        country: stripeAccount.country,
        disabledReason,
      });

      return NextResponse.json({
        hasAccount: true,
        payoutsEnabled: stripeAccount.payouts_enabled || false,
        chargesEnabled: stripeAccount.charges_enabled || false,
        detailsSubmitted: stripeAccount.details_submitted || false,
        onboardingComplete: (stripeAccount.payouts_enabled && stripeAccount.details_submitted) || false,
        country: stripeAccount.country,
        disabledReason,
      });
    } catch (stripeError) {
      // If Stripe call fails, return cached data
      logStripeAction('connect-status-stripe-error', {
        requestId,
        userId: user.id,
        error: stripeError instanceof Error ? stripeError.message : 'Unknown',
      });

      return NextResponse.json({
        hasAccount: true,
        payoutsEnabled: account.payouts_enabled,
        onboardingComplete: account.onboarding_complete,
        fromCache: true,
      });
    }
  } catch (error) {
    console.error('[CONNECT] Status error:', error);
    return NextResponse.json(
      { error: 'Failed to get Connect status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/connect/status
 * Refresh Connect account status from Stripe
 * Same as GET but explicit refresh
 */
export async function POST(request: NextRequest) {
  return GET(request);
}










