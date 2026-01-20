import { Audio } from 'expo-av';

let sharedSound: Audio.Sound | null = null;
let soundLoading = false;
let warnedOnce = false;
let modeSet = false;

const ensureAudioMode = async () => {
  if (modeSet) return;
  modeSet = true;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
    });
  } catch (err) {
    if (!warnedOnce) {
      warnedOnce = true;
      console.warn('[giftAudio] Failed to set audio mode', err);
    }
  }
};

export const playGiftSound = async (uri: string) => {
  if (!uri) return;
  if (soundLoading) return;

  await ensureAudioMode();

  try {
    if (!sharedSound) {
      soundLoading = true;
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      sharedSound = sound;
      soundLoading = false;
      return;
    }

    const status = await sharedSound.getStatusAsync();
    if ((status as any)?.isLoaded) {
      await sharedSound.replayAsync();
    } else {
      soundLoading = true;
      await sharedSound.loadAsync({ uri }, { shouldPlay: true }, true);
      soundLoading = false;
    }
  } catch (err) {
    soundLoading = false;
    if (!warnedOnce) {
      warnedOnce = true;
      console.warn('[giftAudio] Failed to play sound', err);
    }
  }
};
