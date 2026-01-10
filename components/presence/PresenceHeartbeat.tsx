'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useGlobalPresenceHeartbeat } from '@/hooks/useGlobalPresenceHeartbeat';

export function PresenceHeartbeat() {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      setUserId(user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setUsername(profile.username);
      }
      setIsLoading(false);
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUsername(data.username);
            }
          });
      } else {
        setUserId(null);
        setUsername(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (isLoading || !userId || !username) {
    return null;
  }

  return <PresenceHeartbeatActive userId={userId} username={username} />;
}

function PresenceHeartbeatActive({ userId, username }: { userId: string; username: string }) {
  useGlobalPresenceHeartbeat({ userId, username, enabled: true });
  return null;
}
