import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createTransfer, logStripeAction } from '@/lib/stripe';
import { getSupabaseAdmin, completeCashout, failCashout } from '@/lib/supabase-admin';

/**
 * POST /api/cashout/request
 * Request diamond cashout via Stripe Connect Transfer
 * 
 * Body: { diamondsRequested?: number } - If not provided, cashes out max available
 * Returns: { success: boolean, cashoutId: number, amountUsd: number }
 * 
 * IMPORTANT:
 * - Minimum 10,000 diamonds = $100
 * - 100 diamonds = $1
 * - NO additional fee at cashout (40% already taken when diamonds were earned)
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Parse request
    const body = await request.json().catch(() => ({}));
    const diamondsRequested = body.diamondsRequested || 99999999; // Max if not specified

    // Get authenticated user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logStripeAction('cashout-unauthorized', { requestId });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminSupabase = getSupabaseAdmin();

    logStripeAction('cashout-start', {
      requestId,
      userId: user.id,
      diamondsRequested,
    });

    // Call RPC to create cashout record and debit diamonds
    const { data: cashoutData, error: rpcError } = await adminSupabase.rpc('request_cashout', {
      p_user_id: user.id,
      p_diamonds_requested: diamondsRequested,
      p_request_id: requestId,
    });

    if (rpcError) {
      logStripeAction('cashout-rpc-error', {
        requestId,
        userId: user.id,
        error: rpcError.message,
      });
      return NextResponse.json(
        { error: rpcError.message },
        { status: 400 }
      );
    }

    // Check if this was a duplicate request
    if (cashoutData.already_exists) {
      logStripeAction('cashout-duplicate', {
        requestId,
        userId: user.id,
        cashoutId: cashoutData.cashout_id,
      });
      return NextResponse.json({
        success: true,
        duplicate: true,
        cashoutId: cashoutData.cashout_id,
        diamondsDebited: cashoutData.diamonds_debited,
        amountUsd: cashoutData.amount_usd_cents / 100,
        status: cashoutData.status,
      });
    }

    logStripeAction('cashout-created', {
      requestId,
      userId: user.id,
      cashoutId: cashoutData.cashout_id,
      diamondsDebited: cashoutData.diamonds_debited,
      amountCents: cashoutData.amount_usd_cents,
    });

    // Create Stripe Transfer
    try {
      const transfer = await createTransfer({
        amountCents: cashoutData.amount_usd_cents,
        destinationAccountId: cashoutData.stripe_account_id,
        cashoutId: cashoutData.cashout_id,
        userId: user.id,
        diamondsDebited: cashoutData.diamonds_debited,
      });

      // Update cashout with transfer ID
      const completeResult = await completeCashout(
        cashoutData.cashout_id,
        transfer.id
      );

      if (!completeResult.success) {
        logStripeAction('cashout-complete-failed', {
          requestId,
          cashoutId: cashoutData.cashout_id,
          error: completeResult.error,
        });
        // Transfer was created but DB update failed - log but continue
      }

      logStripeAction('cashout-success', {
        requestId,
        userId: user.id,
        cashoutId: cashoutData.cashout_id,
        transferId: transfer.id,
        amountCents: cashoutData.amount_usd_cents,
      });

      // Get updated balance
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('earnings_balance')
        .eq('id', user.id)
        .single();

      return NextResponse.json({
        success: true,
        cashoutId: cashoutData.cashout_id,
        diamondsDebited: cashoutData.diamonds_debited,
        amountUsd: cashoutData.amount_usd_cents / 100,
        transferId: transfer.id,
        status: 'transferred',
        remainingDiamonds: profile?.earnings_balance || 0,
      });
    } catch (transferError) {
      // Transfer failed - refund diamonds
      logStripeAction('cashout-transfer-failed', {
        requestId,
        userId: user.id,
        cashoutId: cashoutData.cashout_id,
        error: transferError instanceof Error ? transferError.message : 'Unknown',
      });

      await failCashout(
        cashoutData.cashout_id,
        transferError instanceof Error ? transferError.message : 'Transfer failed'
      );

      return NextResponse.json(
        { error: 'Transfer failed. Your diamonds have been refunded.' },
        { status: 500 }
      );
    }
  } catch (error) {
    logStripeAction('cashout-error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    console.error('[CASHOUT] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Failed to process cashout' },
      { status: 500 }
    );
  }
}

