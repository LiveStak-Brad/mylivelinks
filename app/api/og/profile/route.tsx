import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const avatarUrl = searchParams.get('avatar') || '';
    const username = searchParams.get('username') || 'User';
    
    if (!avatarUrl) {
      // No avatar, return simple branded card
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
              color: 'white',
              fontSize: '48px',
              fontWeight: 'bold',
            }}
          >
            {username} on MyLiveLinks 🔥
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }
    
    // Return avatar with MyLiveLinks watermark
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            position: 'relative',
            background: '#000',
          }}
        >
          {/* Avatar Image */}
          <img
            src={avatarUrl}
            alt={username}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          
          {/* Watermark in bottom-left */}
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(0, 0, 0, 0.7)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '20px',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            <span style={{ fontSize: '24px' }}>⭐</span>
            MyLiveLinks.com
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error('OG Profile Error:', e);
    return new Response(`Error: ${e.message}`, { status: 500 });
  }
}

