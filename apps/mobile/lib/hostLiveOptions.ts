import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChatSize = 'small' | 'medium' | 'large';

export interface HostLiveOptions {
  allowGuestRequests: boolean;
  mirrorCamera: boolean;
  mutedWords: string[];
  moderators: string[];
  mergeChat: boolean; // not implemented yet; persisted UI state
  chatSize: ChatSize;
}

export const DEFAULT_HOST_LIVE_OPTIONS: HostLiveOptions = {
  allowGuestRequests: true,
  mirrorCamera: true,
  mutedWords: [],
  moderators: [],
  mergeChat: false,
  chatSize: 'medium',
};

function storageKey(profileId: string) {
  return `host_live_options:${profileId}`;
}

function isChatSize(v: unknown): v is ChatSize {
  return v === 'small' || v === 'medium' || v === 'large';
}

function normalizeStringList(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const next = v
    .filter((x) => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean);
  return Array.from(new Set(next));
}

function normalizeOptions(input: unknown): Partial<HostLiveOptions> {
  if (!input || typeof input !== 'object') return {};
  const obj = input as Record<string, unknown>;

  const out: Partial<HostLiveOptions> = {};

  if (typeof obj.allowGuestRequests === 'boolean') out.allowGuestRequests = obj.allowGuestRequests;
  if (typeof obj.mirrorCamera === 'boolean') out.mirrorCamera = obj.mirrorCamera;
  if (typeof obj.mergeChat === 'boolean') out.mergeChat = obj.mergeChat;
  if (isChatSize(obj.chatSize)) out.chatSize = obj.chatSize;

  const mutedWords = normalizeStringList(obj.mutedWords);
  if (mutedWords) out.mutedWords = mutedWords;

  const moderators = normalizeStringList(obj.moderators);
  if (moderators) out.moderators = moderators;

  return out;
}

export async function loadHostLiveOptions(profileId: string): Promise<HostLiveOptions> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(profileId));
    if (!raw) return { ...DEFAULT_HOST_LIVE_OPTIONS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_HOST_LIVE_OPTIONS, ...normalizeOptions(parsed) };
  } catch (err) {
    console.warn('[hostLiveOptions] Failed to load:', err);
    return { ...DEFAULT_HOST_LIVE_OPTIONS };
  }
}

export async function saveHostLiveOptions(profileId: string, next: HostLiveOptions): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(profileId), JSON.stringify(next));
  } catch (err) {
    console.warn('[hostLiveOptions] Failed to save:', err);
  }
}

