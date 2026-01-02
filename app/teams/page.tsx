'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import { PageShell, PageHeader, PageSection } from '@/components/layout';
import { Button } from '@/components/ui';

export default function TeamsIndexPage() {
  return (
    <PageShell maxWidth="lg" padding="md">
      <PageHeader
        title="Teams"
        description="UI-only placeholder index"
        icon={<Users className="w-6 h-6 text-primary" />}
      />

      <PageSection card>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This is a placeholder route so you can access the Team Admin panel UI.
          </p>
          <Link href="/teams/team_demo_001/admin?role=Team_Admin">
            <Button variant="primary">Open Team Admin Demo</Button>
          </Link>
        </div>
      </PageSection>
    </PageShell>
  );
}
