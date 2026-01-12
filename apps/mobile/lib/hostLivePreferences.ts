import AsyncStorage from '@react-native-async-storage/async-storage';

import { CHAT_FONT_COLORS, type ChatFontColor } from '../components/live/ChatOverlay';

export type ChatFontSize = 'small' | 'medium' | 'large';

export interface HostLiveFilters {
  chatVisible: boolean;
  chatFontSize: ChatFontSize;
  chatFontColor: ChatFontColor;
  showTopGifters: boolean;
  showViewerCountBadge: boolean;
  compactMode: boolean;
}

export const DEFAULT_HOST_LIVE_FILTERS: HostLiveFilters = {
  chatVisible: true,
  chatFontSize: 'medium',
  chatFontColor: '#FFFFFF',
  showTopGifters: true,
  showViewerCountBadge: true,
  compactMode: false,
};

function storageKey(profileId: string) {
  return `host_filters:${profileId}`;
}

function isChatFontSize(v: unknown): v is ChatFontSize {
  return v === 'small' || v === 'medium' || v === 'large';
}

function isChatFontColor(v: unknown): v is ChatFontColor {
  return typeof v === 'string' && (CHAT_FONT_COLORS as readonly string[]).includes(v);
}

function normalizeFilters(input: unknown): Partial<HostLiveFilters> {
  if (!input || typeof input !== 'object') return {};
  const obj = input as Record<string, unknown>;

  const out: Partial<HostLiveFilters> = {};

  if (typeof obj.chatVisible === 'boolean') out.chatVisible = obj.chatVisible;
  if (isChatFontSize(obj.chatFontSize)) out.chatFontSize = obj.chatFontSize;
  if (isChatFontColor(obj.chatFontColor)) out.chatFontColor = obj.chatFontColor;
  if (typeof obj.showTopGifters === 'boolean') out.showTopGifters = obj.showTopGifters;
  if (typeof obj.showViewerCountBadge === 'boolean') out.showViewerCountBadge = obj.showViewerCountBadge;
  if (typeof obj.compactMode === 'boolean') out.compactMode = obj.compactMode;

  return out;
}

export async function loadHostLiveFilters(profileId: string): Promise<HostLiveFilters> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(profileId));
    if (!raw) return { ...DEFAULT_HOST_LIVE_FILTERS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_HOST_LIVE_FILTERS, ...normalizeFilters(parsed) };
  } catch (err) {
    console.warn('[hostLivePreferences] Failed to load host filters:', err);
    return { ...DEFAULT_HOST_LIVE_FILTERS };
  }
}

export async function saveHostLiveFilters(profileId: string, next: HostLiveFilters): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(profileId), JSON.stringify(next));
  } catch (err) {
    console.warn('[hostLivePreferences] Failed to save host filters:', err);
  }
}

export async function updateHostLiveFilters(
  profileId: string,
  patch: Partial<HostLiveFilters>
): Promise<HostLiveFilters> {
  const current = await loadHostLiveFilters(profileId);
  const merged: HostLiveFilters = { ...current, ...normalizeFilters(patch) } as HostLiveFilters;
  await saveHostLiveFilters(profileId, merged);
  return merged;
}

