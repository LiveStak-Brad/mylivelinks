import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const username = searchParams.get('username') || 'User';
    const displayName = searchParams.get('displayName') || username;
    const bio = searchParams.get('bio') || 'Follow me on MyLiveLinks';
    const avatarUrl = searchParams.get('avatarUrl') || '';
    
    // Fetch avatar as base64 if provided (for edge runtime compatibility)
    let avatarDataUrl = avatarUrl;
    if (avatarUrl && avatarUrl.startsWith('http')) {
      try {
        const avatarResponse = await fetch(avatarUrl);
        const avatarBlob = await avatarResponse.arrayBuffer();
        const base64 = Buffer.from(avatarBlob).toString('base64');
        const mimeType = avatarResponse.headers.get('content-type') || 'image/jpeg';
        avatarDataUrl = `data:${mimeType};base64,${base64}`;
      } catch (e) {
        console.error('Error fetching avatar:', e);
        avatarDataUrl = '';
      }
    }
    
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontFamily: 'system-ui, sans-serif',
            position: 'relative',
          }}
        >
          {/* Background Pattern */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              opacity: 0.1,
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '30px 30px',
            }}
          />
          
          {/* Content Container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '32px',
              padding: '60px 80px',
              boxShadow: '0 40px 100px rgba(0, 0, 0, 0.3)',
              maxWidth: '1000px',
              textAlign: 'center',
            }}
          >
            {/* Profile Photo */}
            {avatarDataUrl && (
              <div
                style={{
                  width: '180px',
                  height: '180px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '6px solid white',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
                  marginBottom: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                <img
                  src={avatarDataUrl}
                  alt={displayName}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            )}
            
            {!avatarDataUrl && (
              <div
                style={{
                  width: '180px',
                  height: '180px',
                  borderRadius: '50%',
                  border: '6px solid white',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
                  marginBottom: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  fontSize: '80px',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              >
                {displayName[0]?.toUpperCase() || '?'}
              </div>
            )}
            
            {/* Display Name */}
            <div
              style={{
                fontSize: '56px',
                fontWeight: 'bold',
                color: '#1a202c',
                marginBottom: '12px',
                lineHeight: 1.2,
              }}
            >
              {displayName}
            </div>
            
            {/* Username */}
            <div
              style={{
                fontSize: '32px',
                color: '#718096',
                marginBottom: '30px',
              }}
            >
              @{username}
            </div>
            
            {/* Bio */}
            {bio && bio.length > 0 && (
              <div
                style={{
                  fontSize: '28px',
                  color: '#4a5568',
                  marginBottom: '40px',
                  maxWidth: '800px',
                  lineHeight: 1.5,
                }}
              >
                {bio.substring(0, 120)}
                {bio.length > 120 ? '...' : ''}
              </div>
            )}
            
            {/* CTA Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '20px 40px',
                borderRadius: '50px',
                fontSize: '32px',
                fontWeight: 'bold',
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
              }}
            >
              <span style={{ fontSize: '40px' }}>🔥</span>
              Follow me on MyLiveLinks
            </div>
          </div>
          
          {/* Bottom Brand */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              color: 'white',
              fontSize: '28px',
              fontWeight: 'bold',
            }}
          >
            <span style={{ fontSize: '36px' }}>⭐</span>
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
    console.error('Error generating OG image:', e);
    return new Response(`Failed to generate image: ${e.message}`, {
      status: 500,
    });
  }
}
