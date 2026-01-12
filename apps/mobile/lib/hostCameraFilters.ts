import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HostCameraFilters {
  brightness: number; // 0..1
  contrast: number; // 0..1
  saturation: number; // 0..1
  blur: number; // 0..1
}

export const DEFAULT_HOST_CAMERA_FILTERS: HostCameraFilters = {
  brightness: 0.5,
  contrast: 0.5,
  saturation: 0.5,
  blur: 0,
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function storageKey(profileId: string) {
  // Stable key (host filters per profile)
  return `host_filters:${profileId}`;
}

function normalize(input: unknown): Partial<HostCameraFilters> {
  if (!input || typeof input !== 'object') return {};
  const obj = input as Record<string, unknown>;
  const out: Partial<HostCameraFilters> = {};

  const b = obj.brightness;
  const c = obj.contrast;
  const s = obj.saturation;
  const bl = obj.blur;

  if (typeof b === 'number' && Number.isFinite(b)) out.brightness = clamp01(b);
  if (typeof c === 'number' && Number.isFinite(c)) out.contrast = clamp01(c);
  if (typeof s === 'number' && Number.isFinite(s)) out.saturation = clamp01(s);
  if (typeof bl === 'number' && Number.isFinite(bl)) out.blur = clamp01(bl);

  return out;
}

export async function loadHostCameraFilters(profileId: string): Promise<HostCameraFilters> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(profileId));
    if (!raw) return { ...DEFAULT_HOST_CAMERA_FILTERS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_HOST_CAMERA_FILTERS, ...normalize(parsed) };
  } catch (err) {
    console.warn('[hostCameraFilters] Failed to load host camera filters:', err);
    return { ...DEFAULT_HOST_CAMERA_FILTERS };
  }
}

export async function saveHostCameraFilters(profileId: string, next: HostCameraFilters): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(profileId), JSON.stringify(next));
  } catch (err) {
    console.warn('[hostCameraFilters] Failed to save host camera filters:', err);
  }
}

