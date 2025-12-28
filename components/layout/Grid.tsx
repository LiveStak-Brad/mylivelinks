'use client';

import { ReactNode, HTMLAttributes } from 'react';

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Number of columns at different breakpoints */
  cols?: {
    default?: 1 | 2 | 3 | 4 | 5 | 6;
    sm?: 1 | 2 | 3 | 4 | 5 | 6;
    md?: 1 | 2 | 3 | 4 | 5 | 6;
    lg?: 1 | 2 | 3 | 4 | 5 | 6;
    xl?: 1 | 2 | 3 | 4 | 5 | 6;
  };
  /** Gap between items */
  gap?: 'none' | 'sm' | 'md' | 'lg';
  /** Auto-fit columns to fill space */
  autoFit?: boolean;
  /** Minimum column width for auto-fit (in pixels) */
  minColWidth?: number;
}

const colsMap: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

const smColsMap: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
  6: 'sm:grid-cols-6',
};

const mdColsMap: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
};

const lgColsMap: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

const xlColsMap: Record<number, string> = {
  1: 'xl:grid-cols-1',
  2: 'xl:grid-cols-2',
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
  5: 'xl:grid-cols-5',
  6: 'xl:grid-cols-6',
};

const gapMap = {
  none: 'gap-0',
  sm: 'gap-2 sm:gap-3',
  md: 'gap-3 sm:gap-4 lg:gap-6',
  lg: 'gap-4 sm:gap-6 lg:gap-8',
};

/**
 * Grid - Responsive grid layout component
 * 
 * Usage:
 * ```tsx
 * <Grid cols={{ default: 1, sm: 2, lg: 3 }} gap="md">
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </Grid>
 * ```
 */
export function Grid({
  children,
  cols = { default: 1, sm: 2, lg: 3 },
  gap = 'md',
  autoFit = false,
  minColWidth = 280,
  className = '',
  style,
  ...props
}: GridProps) {
  if (autoFit) {
    return (
      <div
        className={`grid ${gapMap[gap]} ${className}`}
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(min(${minColWidth}px, 100%), 1fr))`,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }

  const gridClasses = [
    'grid',
    gapMap[gap],
    cols.default ? colsMap[cols.default] : 'grid-cols-1',
    cols.sm ? smColsMap[cols.sm] : '',
    cols.md ? mdColsMap[cols.md] : '',
    cols.lg ? lgColsMap[cols.lg] : '',
    cols.xl ? xlColsMap[cols.xl] : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={gridClasses} style={style} {...props}>
      {children}
    </div>
  );
}

export interface GridItemProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Column span */
  span?: 1 | 2 | 3 | 4 | 5 | 6 | 'full';
  /** Row span */
  rowSpan?: 1 | 2 | 3;
}

const spanMap: Record<number | string, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  full: 'col-span-full',
};

const rowSpanMap: Record<number, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
};

/**
 * GridItem - Grid child with span control
 */
export function GridItem({
  children,
  span,
  rowSpan,
  className = '',
  ...props
}: GridItemProps) {
  const itemClasses = [
    span ? spanMap[span] : '',
    rowSpan ? rowSpanMap[rowSpan] : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={itemClasses} {...props}>
      {children}
    </div>
  );
}

export default Grid;





