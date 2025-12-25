import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const username = searchParams.get('username') || 'User';
    const displayName = searchParams.get('displayName') || username;
    const bio = searchParams.get('bio') || 'Follow me on MyLiveLinks';
    
    // Get first letter for avatar
    const firstLetter = displayName.charAt(0).toUpperCase();
    
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '32px',
              padding: '60px',
              maxWidth: '900px',
            }}
          >
            {/* Avatar Circle */}
            <div
              style={{
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontSize: '72px',
                color: 'white',
                fontWeight: 'bold',
                marginBottom: '24px',
              }}
            >
              {firstLetter}
            </div>
            
            {/* Display Name */}
            <div
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#1a202c',
                marginBottom: '8px',
              }}
            >
              {displayName}
            </div>
            
            {/* Username */}
            <div
              style={{
                fontSize: '28px',
                color: '#718096',
                marginBottom: '24px',
              }}
            >
              @{username}
            </div>
            
            {/* Bio */}
            <div
              style={{
                fontSize: '24px',
                color: '#4a5568',
                marginBottom: '32px',
                maxWidth: '700px',
                textAlign: 'center',
              }}
            >
              {bio.substring(0, 120)}
            </div>
            
            {/* CTA */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '16px 32px',
                borderRadius: '50px',
                fontSize: '28px',
                fontWeight: 'bold',
              }}
            >
              🔥 Follow me on MyLiveLinks
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error('OG Image Error:', e);
    
    // Return a simple error image
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#667eea',
            color: 'white',
            fontSize: '32px',
          }}
        >
          MyLiveLinks Profile
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}
