import Constants from 'expo-constants';

const expoExtra: Record<string, any> =
  (Constants.expoConfig?.extra as any) ?? (Constants as any).manifest?.extra ?? (Constants as any).manifest2?.extra ?? {};

export function getRuntimeEnv(key: string): string | undefined {
  try {
    const procEnv = typeof process !== 'undefined' ? (process as any)?.env : undefined;
    const fromProcess = procEnv ? procEnv[key] : undefined;
    if (typeof fromProcess === 'string' && fromProcess.length > 0) return fromProcess;
  } catch {
    // ignore
  }

  try {
    const fromExtra = expoExtra?.[key];
    if (typeof fromExtra === 'string' && fromExtra.length > 0) return fromExtra;
  } catch {
    // ignore
  }

  return undefined;
}
