/**
 * OwnerPanelShell Component
 * Shared shell with sidebar navigation for owner panel
 */

'use client';

import { ReactNode, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Radio,
  AlertTriangle,
  Gift,
  BarChart3,
  UserCog,
  Settings,
  Menu,
  X,
  Activity,
} from 'lucide-react';
import { IconButton, ToastProvider } from '@/components/ui';

export interface OwnerPanelShellProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/owner', icon: LayoutDashboard },
  { label: 'Live Ops', href: '/owner/live-ops', icon: Activity },
  { label: 'Users', href: '/owner/users', icon: Users },
  { label: 'Rooms', href: '/owner/rooms', icon: Radio },
  { label: 'Reports', href: '/owner/reports', icon: AlertTriangle },
  { label: 'Analytics', href: '/owner/analytics', icon: BarChart3 },
  { label: 'Referrals', href: '/owner/referrals', icon: Gift },
  { label: 'Roles', href: '/owner/roles', icon: UserCog },
  { label: 'Settings', href: '/owner/settings', icon: Settings },
];

export function OwnerPanelShell({ children }: OwnerPanelShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === '/owner') {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-50 bg-card border-b border-border px-4 h-16 flex items-center justify-between">
          <h1 className="text-lg font-bold">Owner Panel</h1>
          <IconButton
            aria-label="Toggle menu"
            variant="ghost"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </IconButton>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside
            className={`
              fixed lg:sticky top-0 left-0 z-40
              h-screen w-64 bg-card border-r border-border
              transition-transform duration-300 ease-in-out
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}
          >
            <div className="flex flex-col h-full">
              {/* Logo / Header */}
              <div className="hidden lg:flex items-center gap-3 px-6 py-6 border-b border-border">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <LayoutDashboard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Owner Panel</h1>
                  <p className="text-xs text-muted-foreground">Admin Dashboard</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <button
                      key={item.href}
                      onClick={() => {
                        router.push(item.href);
                        setSidebarOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-lg
                        transition-colors duration-150
                        ${
                          active
                            ? 'bg-primary text-white'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  MyLiveLinks Admin v1.0
                </p>
              </div>
            </div>
          </aside>

          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
