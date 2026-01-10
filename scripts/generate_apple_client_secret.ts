/**
 * Generate Apple Client Secret JWT for Supabase Auth
 * 
 * This script generates the JWT token required for Apple Sign-In configuration in Supabase.
 * 
 * USAGE:
 * 1. Create a .env.local file in the root with:
 *    APPLE_TEAM_ID=FJ4YP4929K
 *    APPLE_KEY_ID=S25WT34A2F
 *    APPLE_SERVICE_ID=FJ4YP4929K.com.mylivelinks.app
 *    APPLE_PRIVATE_KEY_P8="-----BEGIN PRIVATE KEY-----
 *    MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgdBb3ynD2wML6R2r3
 *    36nzrNB1suQaQgAjdZK+zLtO5aigCgYIKoZIzj0DAQehRANCAATS6uxV4SjrJ7dp
 *    O8xgGLZKn2sDHYBAFo0MwgciVTl0OSU8XnCWvLMo2bCr0DsVsOFxN8OfMJ0Px8Pz
 *    D0Fv5Z2v
 *    -----END PRIVATE KEY-----"
 * 
 * 2. Run: npx tsx scripts/generate_apple_client_secret.ts
 * 3. Copy the output JWT
 * 4. Paste into Supabase Dashboard → Authentication → Providers → Apple → Secret Key
 * 
 * The JWT is valid for 180 days (Apple's maximum).
 */

import * as jose from 'jose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function generateAppleClientSecret() {
  const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
  const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
  const APPLE_SERVICE_ID = process.env.APPLE_SERVICE_ID;
  const APPLE_PRIVATE_KEY_P8 = process.env.APPLE_PRIVATE_KEY_P8;

  // Validate required environment variables
  if (!APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_SERVICE_ID || !APPLE_PRIVATE_KEY_P8) {
    console.error('❌ Missing required environment variables in .env.local:');
    if (!APPLE_TEAM_ID) console.error('  - APPLE_TEAM_ID');
    if (!APPLE_KEY_ID) console.error('  - APPLE_KEY_ID');
    if (!APPLE_SERVICE_ID) console.error('  - APPLE_SERVICE_ID');
    if (!APPLE_PRIVATE_KEY_P8) console.error('  - APPLE_PRIVATE_KEY_P8');
    process.exit(1);
  }

  try {
    // Parse the private key
    const privateKey = await jose.importPKCS8(APPLE_PRIVATE_KEY_P8, 'ES256');

    // Generate JWT with required claims
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 180 * 24 * 60 * 60; // 180 days in seconds (Apple's maximum)

    const jwt = await new jose.SignJWT({})
      .setProtectedHeader({
        alg: 'ES256',
        kid: APPLE_KEY_ID,
      })
      .setIssuer(APPLE_TEAM_ID)
      .setSubject(APPLE_SERVICE_ID)
      .setAudience('https://appleid.apple.com')
      .setIssuedAt(now)
      .setExpirationTime(now + expiresIn)
      .sign(privateKey);

    console.log('\n✅ Apple Client Secret JWT generated successfully!\n');
    console.log('📋 Copy this JWT and paste it into Supabase Dashboard:');
    console.log('   Authentication → Providers → Apple → Secret Key\n');
    console.log('━'.repeat(80));
    console.log(jwt);
    console.log('━'.repeat(80));
    console.log('\n⏰ This JWT is valid for 180 days.');
    console.log('📅 Expires:', new Date((now + expiresIn) * 1000).toISOString());
    console.log('\n');
  } catch (error) {
    console.error('❌ Error generating JWT:', error);
    process.exit(1);
  }
}

generateAppleClientSecret();
