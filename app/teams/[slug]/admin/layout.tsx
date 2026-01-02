import { ReactNode } from 'react';
import TeamAdminShell from '@/components/teamAdmin/TeamAdminShell';
import TeamAdminGate from '@/components/teamAdmin/TeamAdminGate';

export default function TeamAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <TeamAdminShell>
      <TeamAdminGate>{children}</TeamAdminGate>
    </TeamAdminShell>
  );
}
