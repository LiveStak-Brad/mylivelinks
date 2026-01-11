import React from 'react';

import type { Session, User } from '@supabase/supabase-js';

import { useAuth } from '../hooks/useAuth';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signOut: () => Promise<void>;
  // CRITICAL: Expose getAccessToken for API calls
  // This ensures all auth checks use the SAME session source (AuthContext)
  // instead of calling supabase.auth.getSession() directly
  getAccessToken: () => Promise<string | null>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return ctx;
}
