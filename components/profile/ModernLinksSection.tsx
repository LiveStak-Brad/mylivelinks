'use client';

import { ExternalLink, Edit } from 'lucide-react';
import Link from 'next/link';

interface ProfileLink {
  id: number;
  title: string;
  url: string;
  icon?: string;
  click_count: number;
  display_order: number;
}

interface ModernLinksSectionProps {
  links: ProfileLink[];
  sectionTitle: string;
  cardStyle: React.CSSProperties;
  borderRadiusClass: string;
  accentColor: string;
  isOwner: boolean;
}

export default function ModernLinksSection({
  links,
  sectionTitle,
  cardStyle,
  borderRadiusClass,
  accentColor,
  isOwner
}: ModernLinksSectionProps) {
  const handleLinkClick = async (linkId: number) => {
    // Track click analytics
    try {
      await fetch('/api/profile/link-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId })
      });
    } catch (error) {
      console.error('Failed to track link click:', error);
    }
  };
  
  return (
    <div className={`${borderRadiusClass} shadow-lg overflow-hidden mb-6`} style={cardStyle}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{sectionTitle}</h3>
          {isOwner && (
            <Link
              href="/settings/profile#links"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1"
            >
              <Edit size={16} />
              Edit
            </Link>
          )}
        </div>
        
        <div className="space-y-3">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleLinkClick(link.id)}
              className="block w-full p-4 rounded-xl font-semibold transition transform hover:scale-[1.02] hover:shadow-lg text-center"
              style={{
                backgroundColor: accentColor,
                color: '#FFFFFF'
              }}
            >
              <div className="flex items-center justify-center gap-3">
                {link.icon && (
                  <span className="text-2xl">{link.icon}</span>
                )}
                <span>{link.title}</span>
                <ExternalLink size={18} />
              </div>
            </a>
          ))}
        </div>
        
        {isOwner && links.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No links added yet
            </p>
            <Link
              href="/settings/profile#links"
              className="inline-block px-6 py-2 rounded-lg font-semibold transition"
              style={{
                backgroundColor: accentColor,
                color: '#FFFFFF'
              }}
            >
              Add Links
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

