'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Compass, Search, Users } from 'lucide-react';
import { PageShell, PageHeader, PageSection } from '@/components/layout';
import { Button, Chip, Input } from '@/components/ui';
import DiscoverTeamsOverlay from '@/components/teams/DiscoverTeamsOverlay';

export default function TeamsIndexPage() {
  const [query, setQuery] = useState('');
  const [showDiscover, setShowDiscover] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const focusSearch = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.setTimeout(() => searchRef.current?.focus(), 50);
    };

    window.addEventListener('mll:teams:focus', focusSearch as EventListener);
    window.addEventListener('teams:focusSearch', focusSearch as EventListener);
    return () => {
      window.removeEventListener('mll:teams:focus', focusSearch as EventListener);
      window.removeEventListener('teams:focusSearch', focusSearch as EventListener);
    };
  }, []);

  return (
    <>
      <PageShell maxWidth="lg" padding="md">
        <PageHeader
          title="Teams"
          description="UI-only placeholder index"
          icon={<Users className="w-6 h-6 text-primary" />}
        />

        <PageSection card>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search teams"
                  className="pl-10"
                />
              </div>
              <Chip
                variant="outline"
                size="lg"
                className="font-semibold"
                icon={<Compass className="h-4 w-4" />}
                onClick={() => setShowDiscover(true)}
              >
                Discover Teams
              </Chip>
            </div>

            <p className="text-sm text-muted-foreground">
              Use the discovery overlay to browse public teams, send join requests, or unlock private teams with invite codes.
            </p>

            <Link href="/teams/team_demo_001/admin?role=Team_Admin">
              <Button variant="primary">Open Team Admin Demo</Button>
            </Link>
          </div>
        </PageSection>
      </PageShell>

      <DiscoverTeamsOverlay isOpen={showDiscover} onClose={() => setShowDiscover(false)} />
    </>
  );
}
