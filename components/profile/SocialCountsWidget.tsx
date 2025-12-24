'use client';

import { Users, UserPlus, Heart } from 'lucide-react';

interface SocialCountsWidgetProps {
  followerCount: number;
  followingCount: number;
  friendsCount: number;
  onShowFollowers: () => void;
  onShowFollowing: () => void;
  onShowFriends: () => void;
  cardStyle: React.CSSProperties;
  borderRadiusClass: string;
  accentColor: string;
}

export default function SocialCountsWidget({
  followerCount,
  followingCount,
  friendsCount,
  onShowFollowers,
  onShowFollowing,
  onShowFriends,
  cardStyle,
  borderRadiusClass,
  accentColor
}: SocialCountsWidgetProps) {
  return (
    <div className={`${borderRadiusClass} shadow-lg overflow-hidden`} style={cardStyle}>
      <div className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Users size={20} style={{ color: accentColor }} />
          Social
        </h3>
        
        <div className="space-y-3">
          <button
            onClick={onShowFollowers}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                <UserPlus size={18} style={{ color: accentColor }} />
              </div>
              <span className="font-semibold">Followers</span>
            </div>
            <span className="text-2xl font-bold" style={{ color: accentColor }}>
              {followerCount.toLocaleString()}
            </span>
          </button>
          
          <button
            onClick={onShowFollowing}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                <Users size={18} style={{ color: accentColor }} />
              </div>
              <span className="font-semibold">Following</span>
            </div>
            <span className="text-2xl font-bold" style={{ color: accentColor }}>
              {followingCount.toLocaleString()}
            </span>
          </button>
          
          <button
            onClick={onShowFriends}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                <Heart size={18} style={{ color: accentColor }} />
              </div>
              <span className="font-semibold">Friends</span>
            </div>
            <span className="text-2xl font-bold" style={{ color: accentColor }}>
              {friendsCount.toLocaleString()}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

