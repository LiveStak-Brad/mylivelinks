export interface TeamThemeTokens {
  primary: string;
  accent: string;
  fontFamily: string;
  emoteSet?: string;
}

export interface TeamIdentityContext {
  id: string;
  name: string;
  tag: string;
  iconUrl?: string;
  theme?: TeamThemeTokens | null;
}
