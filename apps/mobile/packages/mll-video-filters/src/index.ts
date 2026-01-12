import { NativeModules, Platform } from 'react-native';

export type FilterParams = {
  brightness: number; // default 1.0
  contrast: number; // default 1.0
  saturation: number; // default 1.0
  softSkinLevel?: 0 | 1 | 2; // 0=off, 1=low, 2=medium
};

type NativeVideoFiltersModule = {
  install(): void;
  setFilterParams(params: FilterParams): void;
};

const Native = NativeModules.MLLVideoFilters as NativeVideoFiltersModule | undefined;
let warnedMissing = false;

export function installVideoFilters() {
  // Safe no-op if module isn't linked yet (dev builds will link it once native is added)
  if (!Native?.install) {
    if (!warnedMissing) {
      warnedMissing = true;
      console.warn('[mll-video-filters] Native module MLLVideoFilters is missing. install() is a no-op.');
    }
    return;
  }
  Native.install();
}

export function setFilterParams(params: FilterParams) {
  if (!Native?.setFilterParams) {
    if (!warnedMissing) {
      warnedMissing = true;
      console.warn('[mll-video-filters] Native module MLLVideoFilters is missing. setFilterParams() is a no-op.');
    }
    return;
  }
  Native.setFilterParams({
    brightness: params.brightness,
    contrast: params.contrast,
    saturation: params.saturation,
    softSkinLevel: params.softSkinLevel ?? 0,
  });
}

export function isVideoFiltersAvailable() {
  return !!Native?.setFilterParams && (Platform.OS === 'android' || Platform.OS === 'ios');
}

