import { Metadata } from 'next';
import { createClient } from '@/lib/supabase';
import ModernProfilePage from './modern-page';

// Generate dynamic metadata for SEO and social sharing
export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const supabase = createClient();
  
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name, bio, avatar_url')
      .eq('username', params.username)
      .single();
    
    if (!profile) {
      return {
        title: 'Profile Not Found | MyLiveLinks',
        description: 'This profile does not exist on MyLiveLinks.',
      };
    }
    
    const displayName = profile.display_name || profile.username;
    const bio = profile.bio || `Check out ${displayName}'s profile on MyLiveLinks - Live streaming, links, and exclusive content all in one place.`;
    const avatarUrl = profile.avatar_url || 'https://mylivelinks.com/default-avatar.png';
    const profileUrl = `https://mylivelinks.com/${profile.username}`;
    
    // Generate dynamic OG image URL
    const ogImageUrl = `https://mylivelinks.com/api/og?username=${encodeURIComponent(profile.username)}&displayName=${encodeURIComponent(displayName)}&bio=${encodeURIComponent(bio.substring(0, 120))}&avatarUrl=${encodeURIComponent(avatarUrl)}`;
    
    return {
      title: `${displayName} (@${profile.username}) | MyLiveLinks`,
      description: `${bio.substring(0, 160)} - View ${displayName}'s profile, links, and live streams on MyLiveLinks! 🔥`,
      
      // Open Graph (Facebook, LinkedIn, Discord)
      openGraph: {
        type: 'profile',
        url: profileUrl,
        title: `${displayName} is on MyLiveLinks! 🔥`,
        description: `${bio.substring(0, 200)}\n\n👉 Click to view profile, links, and exclusive content!`,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `${displayName}'s MyLiveLinks Profile`,
            type: 'image/png',
          },
        ],
        siteName: 'MyLiveLinks',
      },
      
      // Twitter Card
      twitter: {
        card: 'summary_large_image',
        site: '@MyLiveLinks',
        creator: `@${profile.username}`,
        title: `${displayName} is on MyLiveLinks! 🔥`,
        description: `${bio.substring(0, 160)}\n\nView profile, links & live streams 👉`,
        images: [ogImageUrl],
      },
      
      // Additional metadata
      robots: {
        index: true,
        follow: true,
      },
      
      // Alternate languages (future)
      alternates: {
        canonical: profileUrl,
      },
      
      // Other metadata
      other: {
        'profile:username': profile.username,
        'og:see_also': profileUrl,
        'og:locale': 'en_US',
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Profile | MyLiveLinks',
      description: 'Live streaming and link sharing platform',
    };
  }
}

export default ModernProfilePage;
