import AsyncStorage from '@react-native-async-storage/async-storage';

export type BrowseGenderFilter = 'All' | 'Men' | 'Women';

export type LiveBrowseFilters = {
  gender: BrowseGenderFilter;
  category: string; // 'All' or a category label
  special: string; // e.g. Trending / Featured / Rooms / Battles (UI parity)
};

export type LiveBrowseScreenKey = 'livetv' | 'trending';

const DEFAULT_FILTERS: LiveBrowseFilters = {
  gender: 'All',
  category: 'All',
  special: 'Trending',
};

function storageKey(screen: LiveBrowseScreenKey, profileId: string) {
  const safeProfileId = profileId || 'anon';
  if (screen === 'livetv') return `livetv_filters:${safeProfileId}`;
  return `trending_filters:${safeProfileId}`;
}

export async function loadLiveBrowseFilters(screen: LiveBrowseScreenKey, profileId: string): Promise<LiveBrowseFilters> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(screen, profileId));
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw) as Partial<LiveBrowseFilters> | null;
    if (!parsed) return DEFAULT_FILTERS;

    return {
      gender: (parsed.gender ?? DEFAULT_FILTERS.gender) as LiveBrowseFilters['gender'],
      category: typeof parsed.category === 'string' ? parsed.category : DEFAULT_FILTERS.category,
      special: typeof parsed.special === 'string' ? parsed.special : DEFAULT_FILTERS.special,
    };
  } catch (e) {
    console.warn('[liveBrowsePreferences] load failed:', e);
    return DEFAULT_FILTERS;
  }
}

export async function saveLiveBrowseFilters(
  screen: LiveBrowseScreenKey,
  profileId: string,
  filters: LiveBrowseFilters
): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(screen, profileId), JSON.stringify(filters));
  } catch (e) {
    console.warn('[liveBrowsePreferences] save failed:', e);
  }
}

