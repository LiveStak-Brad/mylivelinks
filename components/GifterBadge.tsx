'use client';

interface GifterLevel {
  level: number;
  badge_name: string;
  badge_color: string;
  badge_icon_url?: string;
}

interface GifterBadgeProps {
  level: number;
  badgeName?: string;
  badgeColor?: string;
  size?: 'sm' | 'md' | 'lg';
  showLevel?: boolean;
}

export default function GifterBadge({
  level,
  badgeName,
  badgeColor,
  size = 'md',
  showLevel = true,
}: GifterBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const defaultColor = badgeColor || '#94A3B8'; // Default gray
  const label = 'Gifter';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${defaultColor}20`, // 20% opacity
        color: defaultColor,
        border: `1px solid ${defaultColor}40`, // 40% opacity
      }}
    >
      {showLevel && <span className="font-bold">Lv {level}</span>}
      <span>{label}</span>
    </span>
  );
}

// Hook to fetch gifter level info
export async function getGifterLevelInfo(level: number, supabase: any) {
  try {
    const { data, error } = await supabase
      .from('gifter_levels')
      .select('*')
      .eq('level', level)
      .single();

    if (!error && data) {
      return data;
    }
  } catch {
  }

  try {
    const res = await fetch('/api/gifter-levels', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      const levels = Array.isArray(json?.levels) ? json.levels : [];
      const match = levels.find((l: any) => Number(l?.level) === Number(level));
      if (match) {
        return {
          level: Number(match.level),
          badge_name: String(match.name ?? `Level ${level}`),
          badge_color: String(match.color ?? '#94A3B8'),
        };
      }
    }
  } catch {
  }

  return {
    level,
    badge_name: `Level ${level}`,
    badge_color: '#94A3B8',
  };
}


