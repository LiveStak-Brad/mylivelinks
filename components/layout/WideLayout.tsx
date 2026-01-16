'use client';

import { ReactNode } from 'react';

/* =============================================================================
   WIDE LAYOUT COMPONENTS
   
   Desktop-only (2xl: 1440px+) layout components for better horizontal utilization.
   These components render their content normally on smaller screens and only
   apply wide layout styles at the 2xl breakpoint.
   
   IMPORTANT: These styles have NO EFFECT below 1440px viewport width.
============================================================================= */

export interface WideLayoutProps {
  children: ReactNode;
  /** Right rail content - only visible at 2xl+ */
  rightRail?: ReactNode;
  /** Additional className for the container */
  className?: string;
  /** Whether to use video player layout (YouTube-style) */
  videoLayout?: boolean;
}

/**
 * WideLayout - Container that expands at 2xl breakpoint with optional right rail
 * 
 * Below 1440px: Renders children normally, rightRail is hidden
 * At 1440px+: Two-column grid with main content and right rail
 * 
 * @example
 * ```tsx
 * <WideLayout rightRail={<RelatedVideos />}>
 *   <VideoPlayer />
 *   <VideoInfo />
 *   <Comments />
 * </WideLayout>
 * ```
 */
export function WideLayout({
  children,
  rightRail,
  className = '',
  videoLayout = false,
}: WideLayoutProps) {
  const layoutClass = videoLayout ? 'wide-video-layout' : 'wide-layout';
  
  return (
    <div className={`${className}`}>
      {/* Below 2xl: single column, rightRail hidden */}
      {/* At 2xl+: grid layout with right rail */}
      <div className={rightRail ? layoutClass : 'wide-layout-single'}>
        <div className={videoLayout ? 'wide-video-main' : ''}>
          {children}
        </div>
        
        {rightRail && (
          <aside className="hidden 2xl:block wide-right-rail">
            <div className="wide-right-rail-sticky">
              {rightRail}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export interface WideContainerProps {
  children: ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * WideContainer - Simple container that expands at 2xl breakpoint
 * 
 * Use this for pages that just need wider content without a right rail.
 */
export function WideContainer({ children, className = '' }: WideContainerProps) {
  return (
    <div className={`wide-container ${className}`}>
      {children}
    </div>
  );
}

export interface WideTextProps {
  children: ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * WideText - Constrains text to readable width even in wide layouts
 * 
 * Use this to wrap text-heavy content (descriptions, articles, comments)
 * to prevent lines from becoming too long on wide screens.
 */
export function WideText({ children, className = '' }: WideTextProps) {
  return (
    <div className={`wide-text-readable ${className}`}>
      {children}
    </div>
  );
}

export interface RightRailSectionProps {
  children: ReactNode;
  title?: string;
  /** Additional className */
  className?: string;
}

/**
 * RightRailSection - A section within the right rail
 * 
 * Use for organizing content in the right rail (related videos, playlists, etc.)
 */
export function RightRailSection({ children, title, className = '' }: RightRailSectionProps) {
  return (
    <section className={`mb-4 ${className}`}>
      {title && (
        <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      )}
      {children}
    </section>
  );
}

export default WideLayout;
