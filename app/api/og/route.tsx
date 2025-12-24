import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const displayName = searchParams.get('displayName') || username || 'User';
    const bio = searchParams.get('bio') || `Check out ${displayName}'s profile on MyLiveLinks`;
    const avatarUrl = searchParams.get('avatarUrl');
    
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a2e',
            backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          }}
        >
          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '30px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              maxWidth: '1000px',
              width: '90%',
            }}
          >
            {/* Avatar */}
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt={displayName || 'Profile'}
                width="180"
                height="180"
                style={{
                  borderRadius: '50%',
                  border: '8px solid white',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                  marginBottom: '30px',
                }}
              />
            )}
            
            {/* Name */}
            <div
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                color: '#1a1a2e',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              {displayName}
            </div>
            
            {/* Username */}
            <div
              style={{
                fontSize: '40px',
                color: '#666',
                marginBottom: '30px',
                textAlign: 'center',
              }}
            >
              @{username}
            </div>
            
            {/* Bio */}
            <div
              style={{
                fontSize: '32px',
                color: '#444',
                marginBottom: '50px',
                textAlign: 'center',
                maxWidth: '800px',
                lineHeight: 1.4,
              }}
            >
              {bio.substring(0, 120)}
            </div>
            
            {/* CTA Button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#667eea',
                color: 'white',
                fontSize: '42px',
                fontWeight: 'bold',
                padding: '25px 60px',
                borderRadius: '15px',
                boxShadow: '0 10px 25px rgba(102, 126, 234, 0.4)',
              }}
            >
              View Profile on MyLiveLinks →
            </div>
          </div>
          
          {/* Powered By Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '40px',
              color: 'white',
              fontSize: '28px',
              fontWeight: '600',
            }}
          >
            Powered by MyLiveLinks
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e: any) {
    console.error('OG Image generation error:', e.message);
    return new Response(`Failed to generate image: ${e.message}`, {
      status: 500,
    });
  }
}

