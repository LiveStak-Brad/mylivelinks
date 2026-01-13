'use client';

// Tab definitions with display labels and API values
const WATCH_TABS = [
  { label: 'Trending', value: 'trending' },
  { label: 'New', value: 'new' },
  { label: 'Nearby', value: 'nearby' },
  { label: 'Following', value: 'following' },
  { label: 'For You', value: 'for_you' },
] as const;

type WatchTabValue = (typeof WATCH_TABS)[number]['value'];

interface WatchTabSelectorProps {
  activeTab?: WatchTabValue;
  onTabChange?: (tab: string) => void;
  className?: string;
}

/**
 * Watch Tab Selector
 * 
 * Top navigation tabs matching TikTok's layout.
 * Tabs: Trending | New | Nearby | Following | For You
 * 
 * Search is in the main header - no duplicate here.
 * UI only - tab change is handled externally.
 */
export function WatchTabSelector({
  activeTab = 'for_you',
  onTabChange,
  className = '',
}: WatchTabSelectorProps) {
  const handleTabClick = (value: string) => {
    onTabChange?.(value);
  };

  return (
    <div className={`watch-tab-selector ${className}`}>
      <div className="watch-tab-list">
        {WATCH_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => handleTabClick(tab.value)}
            className={`watch-tab-item ${activeTab === tab.value ? 'watch-tab-active' : ''}`}
            aria-selected={activeTab === tab.value}
            role="tab"
          >
            <span className="watch-tab-label">{tab.label}</span>
            {activeTab === tab.value && <span className="watch-tab-indicator" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export default WatchTabSelector;
