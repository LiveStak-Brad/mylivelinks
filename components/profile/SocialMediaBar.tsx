'use client';

import { 
  Instagram, 
  Twitter, 
  Youtube, 
  Facebook, 
  Linkedin, 
  Github,
  Music,
  MessageCircle
} from 'lucide-react';

interface SocialMediaBarProps {
  socials: {
    social_instagram?: string;
    social_twitter?: string;
    social_youtube?: string;
    social_tiktok?: string;
    social_facebook?: string;
    social_twitch?: string;
    social_discord?: string;
    social_snapchat?: string;
    social_linkedin?: string;
    social_github?: string;
    social_spotify?: string;
    social_onlyfans?: string;
  };
  accentColor?: string;
}

interface SocialLink {
  platform: string;
  username: string;
  url: string;
  icon: React.ReactNode;
  color: string;
}

export default function SocialMediaBar({ socials, accentColor = '#3B82F6' }: SocialMediaBarProps) {
  const socialLinks: SocialLink[] = [];

  // Instagram
  if (socials.social_instagram) {
    socialLinks.push({
      platform: 'Instagram',
      username: socials.social_instagram,
      url: `https://instagram.com/${socials.social_instagram}`,
      icon: <Instagram size={24} />,
      color: '#E4405F'
    });
  }

  // Twitter/X
  if (socials.social_twitter) {
    socialLinks.push({
      platform: 'Twitter',
      username: socials.social_twitter,
      url: `https://twitter.com/${socials.social_twitter}`,
      icon: <Twitter size={24} />,
      color: '#1DA1F2'
    });
  }

  // YouTube
  if (socials.social_youtube) {
    socialLinks.push({
      platform: 'YouTube',
      username: socials.social_youtube,
      url: `https://youtube.com/@${socials.social_youtube}`,
      icon: <Youtube size={24} />,
      color: '#FF0000'
    });
  }

  // TikTok
  if (socials.social_tiktok) {
    socialLinks.push({
      platform: 'TikTok',
      username: socials.social_tiktok,
      url: `https://tiktok.com/@${socials.social_tiktok}`,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      ),
      color: '#000000'
    });
  }

  // Facebook
  if (socials.social_facebook) {
    socialLinks.push({
      platform: 'Facebook',
      username: socials.social_facebook,
      url: `https://facebook.com/${socials.social_facebook}`,
      icon: <Facebook size={24} />,
      color: '#1877F2'
    });
  }

  // Twitch
  if (socials.social_twitch) {
    socialLinks.push({
      platform: 'Twitch',
      username: socials.social_twitch,
      url: `https://twitch.tv/${socials.social_twitch}`,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
        </svg>
      ),
      color: '#9146FF'
    });
  }

  // Discord
  if (socials.social_discord) {
    socialLinks.push({
      platform: 'Discord',
      username: socials.social_discord,
      url: socials.social_discord.startsWith('http') ? socials.social_discord : `https://discord.gg/${socials.social_discord}`,
      icon: <MessageCircle size={24} />,
      color: '#5865F2'
    });
  }

  // Snapchat
  if (socials.social_snapchat) {
    socialLinks.push({
      platform: 'Snapchat',
      username: socials.social_snapchat,
      url: `https://snapchat.com/add/${socials.social_snapchat}`,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-1.208-.498-2.52-1.857-2.52-.428 0-.767.106-.767.106s.151-.365.151-.608c0-.512-.26-.913-.67-.913-.828 0-.893 1.523-.893 1.523s-.165.045-.234.045c-.068 0-.234-.045-.234-.045s-.064-1.523-.892-1.523c-.41 0-.67.401-.67.913 0 .243.151.608.151.608s-.339-.106-.767-.106c-1.359 0-2.157 1.312-1.857 2.52.198 0 .326-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.86 1.069 11.216.793 12.206.793z"/>
        </svg>
      ),
      color: '#FFFC00'
    });
  }

  // LinkedIn
  if (socials.social_linkedin) {
    socialLinks.push({
      platform: 'LinkedIn',
      username: socials.social_linkedin,
      url: `https://linkedin.com/in/${socials.social_linkedin}`,
      icon: <Linkedin size={24} />,
      color: '#0A66C2'
    });
  }

  // GitHub
  if (socials.social_github) {
    socialLinks.push({
      platform: 'GitHub',
      username: socials.social_github,
      url: `https://github.com/${socials.social_github}`,
      icon: <Github size={24} />,
      color: '#181717'
    });
  }

  // Spotify
  if (socials.social_spotify) {
    socialLinks.push({
      platform: 'Spotify',
      username: socials.social_spotify,
      url: `https://open.spotify.com/artist/${socials.social_spotify}`,
      icon: <Music size={24} />,
      color: '#1DB954'
    });
  }

  // OnlyFans
  if (socials.social_onlyfans) {
    socialLinks.push({
      platform: 'OnlyFans',
      username: socials.social_onlyfans,
      url: `https://onlyfans.com/${socials.social_onlyfans}`,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.441 14.613c-.765 1.421-2.161 2.341-3.841 2.341-1.68 0-3.076-.92-3.841-2.341h7.682zM12 8.52c1.094 0 1.98.886 1.98 1.98S13.094 12.48 12 12.48s-1.98-.886-1.98-1.98S10.906 8.52 12 8.52z"/>
        </svg>
      ),
      color: '#00AFF0'
    });
  }

  // Don't render if no social links
  if (socialLinks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {socialLinks.map((social) => (
        <a
          key={social.platform}
          href={social.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative"
          title={`@${social.username} on ${social.platform}`}
        >
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all transform group-hover:scale-110 group-hover:shadow-lg"
            style={{ 
              backgroundColor: social.color,
              color: social.platform === 'Snapchat' ? '#000' : '#fff'
            }}
          >
            {social.icon}
          </div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            @{social.username}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
          </div>
        </a>
      ))}
    </div>
  );
}

