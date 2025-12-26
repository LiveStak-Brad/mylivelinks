'use client';

/**
 * DetailPage Pattern Template
 * 
 * Use for: Single item views, profile pages, content details
 * Examples: /rooms/[id], /users/[id], /templates/[id]
 * 
 * Features:
 * - Hero section with image/avatar
 * - Title, subtitle, and metadata
 * - Action buttons
 * - Tab navigation (optional)
 * - Content sections
 * - Related items sidebar (optional)
 */

import { ReactNode, useState } from 'react';
import { PageShell, PageHeader, PageSection } from '../PageShell';
import { Skeleton, SkeletonAvatar, SkeletonText } from '../Skeleton';

export interface DetailPageProps {
  /** Back navigation */
  backLink?: string;
  backLabel?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Hero section */
  hero?: {
    imageUrl?: string;
    avatarUrl?: string;
    avatarFallback?: string;
    title: string;
    subtitle?: string;
    badge?: ReactNode;
    stats?: Array<{ label: string; value: string | number }>;
  };
  /** Action buttons below hero */
  actions?: ReactNode;
  /** Tab navigation */
  tabs?: Array<{ key: string; label: string; content: ReactNode }>;
  /** Main content (if no tabs) */
  children?: ReactNode;
  /** Sidebar content */
  sidebar?: ReactNode;
  /** Max width */
  maxWidth?: 'md' | 'lg' | 'xl';
}

export function DetailPage({
  backLink,
  backLabel,
  isLoading = false,
  hero,
  actions,
  tabs,
  children,
  sidebar,
  maxWidth = 'lg',
}: DetailPageProps) {
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.key || '');

  if (isLoading) {
    return (
      <PageShell maxWidth={maxWidth} padding="md">
        <PageHeader title="" backLink={backLink} backLabel={backLabel} />
        <DetailPageSkeleton hasSidebar={!!sidebar} />
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth={maxWidth} padding="md">
      {backLink && (
        <PageHeader title="" backLink={backLink} backLabel={backLabel} />
      )}

      {/* Hero Section */}
      {hero && (
        <PageSection>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Avatar/Image */}
            {(hero.avatarUrl || hero.avatarFallback) && (
              <div className="flex-shrink-0">
                {hero.avatarUrl ? (
                  <img
                    src={hero.avatarUrl}
                    alt={hero.title}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover"
                  />
                ) : (
                  <div 
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-bold"
                  >
                    {hero.avatarFallback}
                  </div>
                )}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {hero.title}
                </h1>
                {hero.badge}
              </div>
              
              {hero.subtitle && (
                <p className="text-muted-foreground mt-1">{hero.subtitle}</p>
              )}

              {/* Stats */}
              {hero.stats && hero.stats.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-4">
                  {hero.stats.map((stat, i) => (
                    <div key={i} className="text-center sm:text-left">
                      <div className="text-lg font-bold text-foreground">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex flex-wrap gap-3 mt-6">
              {actions}
            </div>
          )}
        </PageSection>
      )}

      {/* Tabs or Content */}
      <div className={sidebar ? 'grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8' : ''}>
        <div>
          {tabs && tabs.length > 0 ? (
            <>
              {/* Tab Navigation */}
              <div className="flex border-b border-border mb-6 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition ${
                      activeTab === tab.key
                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {tabs.find((t) => t.key === activeTab)?.content}
            </>
          ) : (
            children
          )}
        </div>

        {/* Sidebar */}
        {sidebar && (
          <aside className="lg:sticky lg:top-20 lg:self-start">
            {sidebar}
          </aside>
        )}
      </div>
    </PageShell>
  );
}

function DetailPageSkeleton({ hasSidebar }: { hasSidebar: boolean }) {
  return (
    <>
      {/* Hero skeleton */}
      <PageSection>
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <Skeleton className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl" />
          <div className="flex-1 space-y-4">
            <SkeletonText lines={1} className="w-1/2" />
            <SkeletonText lines={1} className="w-1/3" />
            <div className="flex gap-4">
              <Skeleton className="w-16 h-12" />
              <Skeleton className="w-16 h-12" />
              <Skeleton className="w-16 h-12" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Skeleton className="w-28 h-10" />
          <Skeleton className="w-28 h-10" />
        </div>
      </PageSection>

      {/* Content skeleton */}
      <div className={hasSidebar ? 'grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8' : ''}>
        <PageSection card>
          <SkeletonText lines={5} />
        </PageSection>
        {hasSidebar && (
          <div className="space-y-4">
            <Skeleton className="w-full h-48 rounded-xl" />
            <Skeleton className="w-full h-32 rounded-xl" />
          </div>
        )}
      </div>
    </>
  );
}

export default DetailPage;

