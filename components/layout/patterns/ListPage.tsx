'use client';

/**
 * ListPage Pattern Template
 * 
 * Use for: Index pages, search results, item listings
 * Examples: /rooms, /users, /admin/applications
 * 
 * Features:
 * - Header with title, description, and action button
 * - Search/filter bar
 * - Responsive grid or list layout
 * - Empty state
 * - Loading skeletons
 * - Pagination (optional)
 */

import { ReactNode } from 'react';
import { PageShell, PageHeader, PageSection } from '../PageShell';
import { Grid } from '../Grid';
import { SkeletonCard } from '../Skeleton';

export interface ListPageProps<T> {
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Items to display */
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Key extractor for items */
  keyExtractor: (item: T) => string;
  /** Loading state */
  isLoading?: boolean;
  /** Number of skeleton cards to show when loading */
  skeletonCount?: number;
  /** Action button in header */
  headerAction?: ReactNode;
  /** Search/filter section */
  filters?: ReactNode;
  /** Empty state content */
  emptyState?: ReactNode;
  /** Grid columns config */
  columns?: {
    default?: 1 | 2 | 3 | 4;
    sm?: 1 | 2 | 3 | 4;
    md?: 1 | 2 | 3 | 4;
    lg?: 1 | 2 | 3 | 4;
  };
  /** Use list layout instead of grid */
  listLayout?: boolean;
  /** Pagination controls */
  pagination?: ReactNode;
  /** Back link */
  backLink?: string;
  /** Max width of page */
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl';
}

export function ListPage<T>({
  title,
  description,
  items,
  renderItem,
  keyExtractor,
  isLoading = false,
  skeletonCount = 6,
  headerAction,
  filters,
  emptyState,
  columns = { default: 1, sm: 2, lg: 3 },
  listLayout = false,
  pagination,
  backLink,
  maxWidth = 'xl',
}: ListPageProps<T>) {
  return (
    <PageShell maxWidth={maxWidth} padding="md">
      <PageHeader
        title={title}
        description={description}
        actions={headerAction}
        backLink={backLink}
      />

      {/* Filters/Search */}
      {filters && (
        <PageSection>
          {filters}
        </PageSection>
      )}

      {/* Content */}
      <PageSection>
        {isLoading ? (
          // Loading state
          listLayout ? (
            <div className="list-stack">
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <SkeletonCard key={i} showImage={false} textLines={2} />
              ))}
            </div>
          ) : (
            <Grid cols={columns} gap="md">
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <SkeletonCard key={i} showImage imageAspect="video" textLines={2} />
              ))}
            </Grid>
          )
        ) : items.length === 0 ? (
          // Empty state
          emptyState || <DefaultEmptyState />
        ) : (
          // Items
          listLayout ? (
            <div className="list-stack">
              {items.map((item, index) => (
                <div key={keyExtractor(item)}>
                  {renderItem(item, index)}
                </div>
              ))}
            </div>
          ) : (
            <Grid cols={columns} gap="md">
              {items.map((item, index) => (
                <div key={keyExtractor(item)}>
                  {renderItem(item, index)}
                </div>
              ))}
            </Grid>
          )
        )}
      </PageSection>

      {/* Pagination */}
      {pagination && !isLoading && items.length > 0 && (
        <PageSection>
          <div className="flex justify-center">
            {pagination}
          </div>
        </PageSection>
      )}
    </PageShell>
  );
}

function DefaultEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div 
        className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"
        style={{ marginBottom: 'var(--space-4)' }}
      >
        <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">No items found</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        There are no items to display. Try adjusting your filters or check back later.
      </p>
    </div>
  );
}

export default ListPage;

