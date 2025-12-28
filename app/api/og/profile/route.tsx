import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

function toAbsoluteUrl(origin: string, raw: string) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('data:')) return s;
  if (s.startsWith('/')) return `${origin}${s}`;
  return `${origin}/${s}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = new URL(request.url).origin;
    const mode = (searchParams.get('mode') || '').trim().toLowerCase();
    const avatarUrl = toAbsoluteUrl(origin, searchParams.get('avatar') || '');
    const username = searchParams.get('username') || 'User';
    const logoUrl = `${origin}/branding/mylivelinkstransparent.png`;
    
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
            {mode === 'invite' ? `Join ${username} on MyLiveLinks` : `${username} on MyLiveLinks`}
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
              background: 'rgba(0, 0, 0, 0.6)',
              padding: '10px 14px',
              borderRadius: '14px',
            }}
          >
            <img
              src={logoUrl}
              alt="MyLiveLinks"
              style={{
                height: '54px',
                width: 'auto',
              }}
            />
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

