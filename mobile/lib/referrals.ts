import AsyncStorage from '@react-native-async-storage/async-storage';

const REFERRAL_CODE_KEY = 'mylivelinks_pending_referral_code';

export async function setPendingReferralCode(code: string): Promise<void> {
  const cleaned = (code || '').trim();
  if (!cleaned) return;
  await AsyncStorage.setItem(REFERRAL_CODE_KEY, cleaned);
}

export async function getPendingReferralCode(): Promise<string | null> {
  const existing = await AsyncStorage.getItem(REFERRAL_CODE_KEY);
  const cleaned = (existing || '').trim();
  return cleaned ? cleaned : null;
}

export async function clearPendingReferralCode(): Promise<void> {
  await AsyncStorage.removeItem(REFERRAL_CODE_KEY);
}
