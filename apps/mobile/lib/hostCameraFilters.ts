import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HostCameraFilters {
  // Match web StreamFiltersModal + useVideoFilterPipeline
  smoothing: number; // 0..3 (int)
  blur: number; // 0..4 (px)
  brightness: number; // 0.5..1.5 (1 = normal)
  contrast: number; // 0.5..1.5 (1 = normal)
  saturation: number; // 0..2 (1 = normal)
  softSkinLevel: 0 | 1 | 2; // 0=off, 1=low, 2=medium
}

export const DEFAULT_HOST_CAMERA_FILTERS: HostCameraFilters = {
  smoothing: 0,
  blur: 0,
  brightness: 1,
  contrast: 1,
  saturation: 1,
  softSkinLevel: 0,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function storageKey(profileId: string) {
  // Stable key (host filters per profile)
  return `host_filters:${profileId}`;
}

function normalize(input: unknown): Partial<HostCameraFilters> {
  if (!input || typeof input !== 'object') return {};
  const obj = input as Record<string, unknown>;
  const out: Partial<HostCameraFilters> = {};

  const sm = obj.smoothing;
  const b = obj.brightness;
  const c = obj.contrast;
  const s = obj.saturation;
  const bl = obj.blur;
  const ss = (obj as any).softSkinLevel;

  // Migration: older builds stored 0..1 values for brightness/contrast/saturation/blur and had no smoothing.
  const isOld01 =
    typeof sm !== 'number' &&
    typeof b === 'number' &&
    typeof c === 'number' &&
    typeof s === 'number' &&
    typeof bl === 'number' &&
    b >= 0 &&
    b <= 1.0001 &&
    c >= 0 &&
    c <= 1.0001 &&
    s >= 0 &&
    s <= 1.0001 &&
    bl >= 0 &&
    bl <= 1.0001;

  if (isOld01) {
    out.smoothing = 0;
    out.blur = clamp(bl * 4, 0, 4);
    out.brightness = clamp(0.5 + b, 0.5, 1.5);
    out.contrast = clamp(0.5 + c, 0.5, 1.5);
    out.saturation = clamp(s * 2, 0, 2);
    out.softSkinLevel = 0;
    return out;
  }

  if (typeof sm === 'number' && Number.isFinite(sm)) out.smoothing = clamp(Math.round(sm), 0, 3);
  if (typeof bl === 'number' && Number.isFinite(bl)) out.blur = clamp(bl, 0, 4);
  if (typeof b === 'number' && Number.isFinite(b)) out.brightness = clamp(b, 0.5, 1.5);
  if (typeof c === 'number' && Number.isFinite(c)) out.contrast = clamp(c, 0.5, 1.5);
  if (typeof s === 'number' && Number.isFinite(s)) out.saturation = clamp(s, 0, 2);
  if (typeof ss === 'number' && Number.isFinite(ss)) out.softSkinLevel = clamp(Math.round(ss), 0, 2) as 0 | 1 | 2;

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

