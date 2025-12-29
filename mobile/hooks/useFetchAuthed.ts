import { useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { fetchAuthed as fetchAuthedRaw } from '../lib/api';

/**
 * Hook that provides fetchAuthed with automatic token injection from AuthContext
 * This ensures all API calls use the single source of truth for auth state
 */
export function useFetchAuthed() {
  const { getAccessToken } = useAuthContext();

  const fetchAuthed = useCallback(
    async (input: string, init: RequestInit = {}) => {
      const token = await getAccessToken();
      return fetchAuthedRaw(input, init, token);
    },
    [getAccessToken]
  );

  return { fetchAuthed };
}






