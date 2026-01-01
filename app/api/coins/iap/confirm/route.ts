import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PlatformName = 'ios' | 'android';

type ConfirmBody = {
  platform: PlatformName;
  productId: string;
  transactionId?: string | null;
  purchaseToken?: string | null;
  transactionReceipt?: string | null;
  packageName?: string | null;
};

type CoinPack = {
  productId: string;
  usdCents: number;
  coins: number;
};

const MOBILE_IAP_PACKS: CoinPack[] = [
  { productId: 'com.mylivelinks.app.coins_250', usdCents: 500, coins: 250 },
  { productId: 'com.mylivelinks.app.coins_500', usdCents: 1000, coins: 500 },
  { productId: 'com.mylivelinks.app.coins_1250', usdCents: 2500, coins: 1250 },
  { productId: 'com.mylivelinks.app.coins_2500', usdCents: 5000, coins: 2500 },
  { productId: 'com.mylivelinks.app.coins_5000', usdCents: 10000, coins: 5000 },
  { productId: 'com.mylivelinks.app.coins_12500', usdCents: 25000, coins: 12500 },
  { productId: 'com.mylivelinks.app.coins_25000', usdCents: 50000, coins: 25000 },
  { productId: 'com.mylivelinks.app.coins_50000', usdCents: 100000, coins: 50000 },
];

function findPack(productId: string): CoinPack | null {
  const match = MOBILE_IAP_PACKS.find((p) => p.productId === productId);
  return match ?? null;
}

function base64UrlEncode(input: string | Buffer) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function verifyAppleReceipt(params: {
  receiptData: string;
  productId: string;
  transactionId: string;
}) {
  const secret = process.env.APPLE_IAP_SHARED_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, error: 'APPLE_IAP_SHARED_SECRET not configured' } as const;
    }
    return { ok: true, environment: 'unverified-dev' } as const;
  }

  const payload = {
    'receipt-data': params.receiptData,
    password: secret,
    'exclude-old-transactions': true,
  };

  const call = async (url: string) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json() as Promise<any>;
  };

  const prodUrl = 'https://buy.itunes.apple.com/verifyReceipt';
  const sandboxUrl = 'https://sandbox.itunes.apple.com/verifyReceipt';

  let data = await call(prodUrl);
  if (data?.status === 21007) {
    data = await call(sandboxUrl);
  }

  if (data?.status !== 0) {
    return { ok: false, error: `Apple verifyReceipt status ${String(data?.status)}` } as const;
  }

  const inApp: any[] =
    Array.isArray(data?.receipt?.in_app)
      ? data.receipt.in_app
      : Array.isArray(data?.latest_receipt_info)
        ? data.latest_receipt_info
        : [];

  const match = inApp.find(
    (it) => String(it?.product_id ?? '') === params.productId && String(it?.transaction_id ?? '') === params.transactionId
  );

  if (!match) {
    return { ok: false, error: 'Receipt does not contain expected product/transaction' } as const;
  }

  return { ok: true, environment: data?.environment ?? null } as const;
}

async function getGoogleAccessToken() {
  const jsonRaw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!jsonRaw) return { ok: false, error: 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not configured' } as const;

  let svc: any;
  try {
    svc = JSON.parse(jsonRaw);
  } catch {
    return { ok: false, error: 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON invalid JSON' } as const;
  }

  const clientEmail = String(svc?.client_email ?? '');
  const privateKey = String(svc?.private_key ?? '');

  if (!clientEmail || !privateKey) {
    return { ok: false, error: 'Service account missing client_email/private_key' } as const;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 60 * 30,
  };

  const tokenBody = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;

  const crypto = await import('crypto');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(tokenBody);
  signer.end();
  const signature = signer.sign(privateKey);
  const jwt = `${tokenBody}.${base64UrlEncode(signature)}`;

  const form = new URLSearchParams();
  form.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  form.set('assertion', jwt);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return { ok: false, error: `Google token exchange failed (${res.status})` } as const;
  }

  const accessToken = String((data as any)?.access_token ?? '');
  if (!accessToken) {
    return { ok: false, error: 'Google token exchange returned no access_token' } as const;
  }

  return { ok: true, accessToken } as const;
}

async function verifyGooglePurchase(params: {
  productId: string;
  purchaseToken: string;
  packageName: string;
}) {
  const tokenRes = await getGoogleAccessToken();
  if (!tokenRes.ok) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, error: tokenRes.error } as const;
    }
    return { ok: true, environment: 'unverified-dev' } as const;
  }

  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(
    params.packageName
  )}/purchases/products/${encodeURIComponent(params.productId)}/tokens/${encodeURIComponent(params.purchaseToken)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${tokenRes.accessToken}`,
      Accept: 'application/json',
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return { ok: false, error: `Google verify failed (${res.status})` } as const;
  }

  const purchaseState = (data as any)?.purchaseState;
  if (purchaseState !== 0 && purchaseState !== undefined) {
    return { ok: false, error: `Google purchaseState ${String(purchaseState)}` } as const;
  }

  return { ok: true, environment: 'google' } as const;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as ConfirmBody | null;

    const platform = body?.platform;
    const productId = body?.productId ? String(body.productId) : '';

    if ((platform !== 'ios' && platform !== 'android') || !productId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const pack = findPack(productId);
    if (!pack) {
      return NextResponse.json({ error: 'Unknown productId' }, { status: 400 });
    }

    if (platform === 'ios') {
      const transactionId = body?.transactionId ? String(body.transactionId) : '';
      const receipt = body?.transactionReceipt ? String(body.transactionReceipt) : '';

      if (!transactionId || !receipt) {
        return NextResponse.json({ error: 'Missing transactionId or transactionReceipt' }, { status: 400 });
      }

      const verify = await verifyAppleReceipt({
        receiptData: receipt,
        productId,
        transactionId,
      });

      if (!verify.ok) {
        return NextResponse.json({ error: 'Receipt verification failed', message: verify.error }, { status: 400 });
      }

      const providerRef = `iap:ios:${transactionId}`;
      const idempotencyKey = providerRef;

      const supabase = getSupabaseAdmin();
      const { data: ledgerId, error: finalizeError } = await supabase.rpc('finalize_coin_purchase', {
        p_idempotency_key: idempotencyKey,
        p_user_id: user.id,
        p_coins_amount: pack.coins,
        p_amount_usd_cents: pack.usdCents,
        p_provider_ref: providerRef,
      });

      if (finalizeError) {
        return NextResponse.json({ error: 'Finalize failed', message: finalizeError.message }, { status: 500 });
      }

      const timestamp = new Date().toISOString();
      const { data: existingPurchase } = await supabase
        .from('coin_purchases')
        .select('id')
        .eq('provider_payment_id', providerRef)
        .maybeSingle();

      if (existingPurchase?.id) {
        await supabase
          .from('coin_purchases')
          .update({
            ledger_entry_id: ledgerId,
            status: 'confirmed',
            confirmed_at: timestamp,
          })
          .eq('id', existingPurchase.id);
      } else {
        await supabase.from('coin_purchases').insert({
          profile_id: user.id,
          platform: 'ios',
          payment_provider: 'apple',
          provider_payment_id: providerRef,
          coin_amount: pack.coins,
          coins_awarded: pack.coins,
          amount_usd_cents: pack.usdCents,
          status: 'confirmed',
          confirmed_at: timestamp,
          ledger_entry_id: ledgerId,
          metadata: {
            product_id: productId,
            transaction_id: transactionId,
            verification_environment: (verify as any)?.environment ?? null,
          },
        });
      }

      return NextResponse.json({ ok: true, ledgerId });
    }

    const purchaseToken = body?.purchaseToken ? String(body.purchaseToken) : '';
    const packageName = body?.packageName ? String(body.packageName) : process.env.GOOGLE_PLAY_PACKAGE_NAME || '';

    if (!purchaseToken || !packageName) {
      return NextResponse.json({ error: 'Missing purchaseToken or packageName' }, { status: 400 });
    }

    const verify = await verifyGooglePurchase({
      productId,
      purchaseToken,
      packageName,
    });

    if (!verify.ok) {
      return NextResponse.json({ error: 'Receipt verification failed', message: verify.error }, { status: 400 });
    }

    const providerRef = `iap:android:${purchaseToken}`;
    const idempotencyKey = providerRef;

    const supabase = getSupabaseAdmin();
    const { data: ledgerId, error: finalizeError } = await supabase.rpc('finalize_coin_purchase', {
      p_idempotency_key: idempotencyKey,
      p_user_id: user.id,
      p_coins_amount: pack.coins,
      p_amount_usd_cents: pack.usdCents,
      p_provider_ref: providerRef,
    });

    if (finalizeError) {
      return NextResponse.json({ error: 'Finalize failed', message: finalizeError.message }, { status: 500 });
    }

    const timestamp = new Date().toISOString();
    const { data: existingPurchase } = await supabase
      .from('coin_purchases')
      .select('id')
      .eq('provider_payment_id', providerRef)
      .maybeSingle();

    if (existingPurchase?.id) {
      await supabase
        .from('coin_purchases')
        .update({
          ledger_entry_id: ledgerId,
          status: 'confirmed',
          confirmed_at: timestamp,
        })
        .eq('id', existingPurchase.id);
    } else {
      await supabase.from('coin_purchases').insert({
        profile_id: user.id,
        platform: 'android',
        payment_provider: 'google',
        provider_payment_id: providerRef,
        provider_order_id: null,
        coin_amount: pack.coins,
        coins_awarded: pack.coins,
        amount_usd_cents: pack.usdCents,
        status: 'confirmed',
        confirmed_at: timestamp,
        ledger_entry_id: ledgerId,
        metadata: {
          product_id: productId,
          purchase_token: purchaseToken,
          package_name: packageName,
          verification_environment: (verify as any)?.environment ?? null,
        },
      });
    }

    return NextResponse.json({ ok: true, ledgerId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Confirm failed', message }, { status: 500 });
  }
}
