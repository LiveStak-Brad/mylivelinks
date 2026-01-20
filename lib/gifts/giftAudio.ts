const audioPool: HTMLAudioElement[] = [];
const MAX_POOL_SIZE = 3;
let warnedOnce = false;

const resolveAudioSrc = (src: string) => {
  try {
    return new URL(src, window.location.href).toString();
  } catch {
    return src;
  }
};

export const playGiftSound = (src: string) => {
  if (typeof window === 'undefined') return;
  if (!src) return;

  const resolvedSrc = resolveAudioSrc(src);
  let audio = audioPool.find((item) => item.paused || item.ended);

  if (!audio) {
    if (audioPool.length >= MAX_POOL_SIZE) {
      audio = audioPool[0];
    } else {
      audio = new Audio(resolvedSrc);
      audio.preload = 'auto';
      audioPool.push(audio);
    }
  }

  if (audio.src !== resolvedSrc) {
    audio.src = resolvedSrc;
  }

  audio.currentTime = 0;

  const result = audio.play();
  if (result && typeof result.catch === 'function') {
    result.catch((err) => {
      if (!warnedOnce) {
        warnedOnce = true;
        console.warn('[GiftAudio] Audio playback blocked:', err);
      }
    });
  }
};
