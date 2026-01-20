export const TEST_GIFT_KEY = 'mylivelinks_logo_test';
export const TEST_GIFT_NAME = 'MyLiveLinks';

export const TEST_GIFT_MEDIA = {
  key: TEST_GIFT_KEY,
  name: TEST_GIFT_NAME,
  animationUrl: '/gifts/logogift.mp4',
  iconUrl: '/gifts/mylivelinks_logo.png',
  soundUrl: '/sfx/live_alert.wav',
  maxSize: 280,
  chromaKey: {
    minGreen: 140,
    greenDelta: 40,
  },
};

// TODO(mobile): add mobile gift overlay handling before using this media on native.

export type GiftTypeMediaRow = {
  name?: string | null;
  animation_url?: string | null;
  icon_url?: string | null;
};

const normalizeName = (value?: string | null) => (value || '').trim().toLowerCase();

export const isTestGiftType = (gift?: GiftTypeMediaRow | null) => {
  if (!gift) return false;
  const nameMatch = normalizeName(gift.name) === normalizeName(TEST_GIFT_NAME);
  const animationMatch =
    gift.animation_url && gift.animation_url.trim() === TEST_GIFT_MEDIA.animationUrl;
  const iconMatch = gift.icon_url && gift.icon_url.trim() === TEST_GIFT_MEDIA.iconUrl;
  return nameMatch || animationMatch || iconMatch;
};

export const resolveTestGiftAnimationUrl = (gift?: GiftTypeMediaRow | null) => {
  if (!isTestGiftType(gift)) return null;
  return gift?.animation_url?.trim() || TEST_GIFT_MEDIA.animationUrl;
};
