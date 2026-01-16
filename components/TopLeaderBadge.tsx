'use client';

export type LeaderType = 'streamer' | 'gifter' | 'referrer';

const LEADER_CONFIG: Record<LeaderType, { icon: string; label: string; color: string }> = {
  streamer: { icon: '🎬', label: '#1 Streamer', color: '#8b5cf6' },
  gifter: { icon: '🎁', label: '#1 Gifter', color: '#f59e0b' },
  referrer: { icon: '🤝', label: '#1 Referrer', color: '#10b981' },
};

export interface TopLeaderBadgeProps {
  type: LeaderType;
  size?: 'sm' | 'md';
  className?: string;
}

export default function TopLeaderBadge({
  type,
  size = 'sm',
  className = '',
}: TopLeaderBadgeProps) {
  const config = LEADER_CONFIG[type];
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-bold whitespace-nowrap ${sizeClasses[size]} ${className}`}
      style={{ color: config.color }}
      title={`${config.label} All-Time`}
    >
      <span role="img" aria-label={config.label}>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
