import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

// Trim whitespace from environment variables
const LIVEKIT_URL = process.env.LIVEKIT_URL?.trim();
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY?.trim();
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET?.trim();

export async function GET(request: NextRequest) {
  // This endpoint helps diagnose LiveKit credential issues
  // It doesn't require auth - just shows what Vercel sees
  
  // Check for whitespace issues
  const originalUrl = process.env.LIVEKIT_URL;
  const originalKey = process.env.LIVEKIT_API_KEY;
  const originalSecret = process.env.LIVEKIT_API_SECRET;
  
  const hasWhitespaceIssues = {
    url: originalUrl !== LIVEKIT_URL,
    apiKey: originalKey !== LIVEKIT_API_KEY,
    apiSecret: originalSecret !== LIVEKIT_API_SECRET,
  };
  
  // Try to generate a test token to verify credentials work
  let tokenTest: { success: boolean; error?: string; tokenLength?: number } = { success: false };
  if (LIVEKIT_API_KEY && LIVEKIT_API_SECRET) {
    try {
      const testToken = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: 'test-user',
        name: 'Test',
        ttl: '1h',
      });
      testToken.addGrant({
        room: 'test-room',
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
      });
      const jwt = await testToken.toJwt();
      tokenTest = { success: true, tokenLength: jwt.length };
    } catch (err: any) {
      tokenTest = { success: false, error: err.message };
    }
  }
  
  const check = {
    hasUrl: !!LIVEKIT_URL,
    url: LIVEKIT_URL || 'NOT SET',
    urlStartsWith: LIVEKIT_URL?.substring(0, 6) || 'N/A',
    urlLength: LIVEKIT_URL?.length || 0,
    urlOriginalLength: originalUrl?.length || 0,
    
    hasApiKey: !!LIVEKIT_API_KEY,
    apiKeyPrefix: LIVEKIT_API_KEY?.substring(0, 15) || 'NOT SET',
    apiKeyLength: LIVEKIT_API_KEY?.length || 0,
    apiKeyOriginalLength: originalKey?.length || 0,
    
    hasApiSecret: !!LIVEKIT_API_SECRET,
    apiSecretPrefix: LIVEKIT_API_SECRET?.substring(0, 15) || 'NOT SET',
    apiSecretLength: LIVEKIT_API_SECRET?.length || 0,
    apiSecretOriginalLength: originalSecret?.length || 0,
    
    // Whitespace issues
    whitespaceIssues: hasWhitespaceIssues,
    
    // Validation checks
    urlValid: LIVEKIT_URL?.startsWith('wss://') || LIVEKIT_URL?.startsWith('ws://'),
    apiKeyValid: LIVEKIT_API_KEY?.startsWith('AP') || LIVEKIT_API_KEY?.startsWith('api_'),
    apiSecretValid: LIVEKIT_API_SECRET && LIVEKIT_API_SECRET.length > 20,
    
    // Token generation test
    tokenTest,
    
    // All valid?
    allValid: !!(
      LIVEKIT_URL && 
      (LIVEKIT_URL.startsWith('wss://') || LIVEKIT_URL.startsWith('ws://')) &&
      LIVEKIT_API_KEY && 
      (LIVEKIT_API_KEY.startsWith('AP') || LIVEKIT_API_KEY.startsWith('api_')) &&
      LIVEKIT_API_SECRET && 
      LIVEKIT_API_SECRET.length > 20 &&
      tokenTest.success
    ),
  };
  
  return NextResponse.json({
    message: 'LiveKit Credentials Check',
    environment: process.env.VERCEL_ENV || 'development',
    credentials: check,
    instructions: {
      url: 'Should start with wss:// and match your LiveKit dashboard Server URL',
      apiKey: 'Should start with AP... and match your LiveKit dashboard API Key',
      apiSecret: 'Should be a long string matching your LiveKit dashboard API Secret',
      note: 'If tokenTest.success is false, the API key/secret pair may not match or be invalid',
    },
  });
}

