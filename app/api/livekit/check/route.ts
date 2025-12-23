import { NextRequest, NextResponse } from 'next/server';

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

export async function GET(request: NextRequest) {
  // This endpoint helps diagnose LiveKit credential issues
  // It doesn't require auth - just shows what Vercel sees
  
  const check = {
    hasUrl: !!LIVEKIT_URL,
    url: LIVEKIT_URL || 'NOT SET',
    urlStartsWith: LIVEKIT_URL?.substring(0, 6) || 'N/A',
    urlLength: LIVEKIT_URL?.length || 0,
    
    hasApiKey: !!LIVEKIT_API_KEY,
    apiKeyPrefix: LIVEKIT_API_KEY?.substring(0, 15) || 'NOT SET',
    apiKeyLength: LIVEKIT_API_KEY?.length || 0,
    
    hasApiSecret: !!LIVEKIT_API_SECRET,
    apiSecretPrefix: LIVEKIT_API_SECRET?.substring(0, 15) || 'NOT SET',
    apiSecretLength: LIVEKIT_API_SECRET?.length || 0,
    
    // Validation checks
    urlValid: LIVEKIT_URL?.startsWith('wss://') || LIVEKIT_URL?.startsWith('ws://'),
    apiKeyValid: LIVEKIT_API_KEY?.startsWith('AP') || LIVEKIT_API_KEY?.startsWith('api_'),
    apiSecretValid: LIVEKIT_API_SECRET && LIVEKIT_API_SECRET.length > 20,
    
    // All valid?
    allValid: !!(
      LIVEKIT_URL && 
      (LIVEKIT_URL.startsWith('wss://') || LIVEKIT_URL.startsWith('ws://')) &&
      LIVEKIT_API_KEY && 
      (LIVEKIT_API_KEY.startsWith('AP') || LIVEKIT_API_KEY.startsWith('api_')) &&
      LIVEKIT_API_SECRET && 
      LIVEKIT_API_SECRET.length > 20
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
    },
  });
}

