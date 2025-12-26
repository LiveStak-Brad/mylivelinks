'use client';

import { ReactNode, CSSProperties } from 'react';

/* =============================================================================
   PAGE SHELL VARIANTS
   
   PageShell     - Standard content pages (forms, lists, details)
   DashboardShell - Complex dashboards with sidebar navigation
   AuthShell     - Centered auth pages (login, signup)
   
   All variants use CSS tokens from styles/layout.css
============================================================================= */

export interface PageShellProps {
  children: ReactNode;
  /** Maximum width variant - uses CSS tokens */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Whether to show background gradient (for landing pages) */
  gradient?: boolean;
  /** Custom gradient class if gradient is true */
  gradientClass?: string;
  /** Whether to use glass morphism background */
  glass?: boolean;
  /** Padding variant - uses CSS tokens */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Additional className for the outer container */
  className?: string;
  /** Additional className for the inner content container */
  contentClassName?: string;
  /** Whether to center content vertically */
  centerVertical?: boolean;
  /** Whether content should scroll within the shell */
  scrollable?: boolean;
  /** ID for the main element (default: 'main' for skip-link accessibility) */
  id?: string;
}

// Maps to CSS custom properties from layout.css
const maxWidthMap: Record<string, string> = {
  sm: 'var(--page-max-width-sm)',
  md: 'var(--page-max-width-md)',
  lg: 'var(--page-max-width-lg)',
  xl: 'var(--page-max-width-xl)',
  '2xl': 'var(--page-max-width-2xl)',
  full: '100%',
};

/**
 * PageShell - Standard page wrapper with max-width, gutters, and header spacing
 * 
 * Use for: Most content pages (forms, lists, details, settings)
 * 
 * @example
 * ```tsx
 * <PageShell maxWidth="lg" padding="md">
 *   <PageHeader title="Dashboard" />
 *   <PageSection card>Content</PageSection>
 * </PageShell>
 * ```
 */
export function PageShell({
  children,
  maxWidth = 'lg',
  gradient = false,
  gradientClass = 'bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600',
  glass = false,
  padding = 'md',
  className = '',
  contentClassName = '',
  centerVertical = false,
  scrollable = true,
  id = 'main',
}: PageShellProps) {
  const paddingClasses = {
    none: '',
    sm: 'page-padding-sm',
    md: 'page-padding',
    lg: 'page-padding',
  };

  const outerClasses = [
    'min-h-page',
    scrollable ? '' : 'overflow-hidden',
    gradient ? gradientClass : 'bg-background',
    glass ? 'backdrop-blur-xl bg-background/80' : '',
    className,
  ].filter(Boolean).join(' ');

  const innerStyle: CSSProperties = {
    maxWidth: maxWidthMap[maxWidth],
  };

  const innerClasses = [
    'mx-auto w-full',
    'px-[var(--page-gutter)] sm:px-[var(--page-gutter-sm)] lg:px-[var(--page-gutter-lg)]',
    paddingClasses[padding],
    centerVertical ? 'flex flex-col items-center justify-center min-h-page' : '',
    contentClassName,
  ].filter(Boolean).join(' ');

  return (
    <main id={id} className={outerClasses} tabIndex={-1}>
      <div className={innerClasses} style={innerStyle}>
        {children}
      </div>
    </main>
  );
}

/* =============================================================================
   DASHBOARD SHELL
   
   For complex pages with sidebar navigation (owner, admin, analytics)
============================================================================= */

export interface DashboardShellProps {
  children: ReactNode;
  /** Sidebar content (navigation) */
  sidebar?: ReactNode;
  /** Sidebar position */
  sidebarPosition?: 'left' | 'right';
  /** Sidebar width on desktop */
  sidebarWidth?: 'sm' | 'md' | 'lg';
  /** Whether sidebar collapses on mobile */
  sidebarCollapsible?: boolean;
  /** Header content (above main area) */
  header?: ReactNode;
  /** Maximum width of the entire dashboard */
  maxWidth?: 'xl' | '2xl' | 'full';
  /** Additional className */
  className?: string;
  /** ID for accessibility */
  id?: string;
}

const sidebarWidths = {
  sm: '14rem',   // 224px
  md: '16rem',   // 256px
  lg: '18rem',   // 288px
};

/**
 * DashboardShell - Layout for complex dashboards with sidebar
 * 
 * Use for: /owner, /admin/*, /me/analytics, /u/[username]/analytics
 * 
 * @example
 * ```tsx
 * <DashboardShell
 *   sidebar={<DashboardNav />}
 *   header={<DashboardHeader title="Owner Dashboard" />}
 * >
 *   <DashboardContent />
 * </DashboardShell>
 * ```
 */
export function DashboardShell({
  children,
  sidebar,
  sidebarPosition = 'left',
  sidebarWidth = 'md',
  sidebarCollapsible = true,
  header,
  maxWidth = 'full',
  className = '',
  id = 'main',
}: DashboardShellProps) {
  const containerStyle: CSSProperties = {
    maxWidth: maxWidthMap[maxWidth],
  };

  return (
    <div 
      className={`min-h-page bg-background ${className}`}
      style={containerStyle}
    >
      <div className="flex flex-col lg:flex-row">
        {/* Sidebar - hidden on mobile by default, shown on lg+ */}
        {sidebar && sidebarPosition === 'left' && (
          <aside
            className={`
              ${sidebarCollapsible ? 'hidden lg:block' : 'block'}
              flex-shrink-0 border-r border-border bg-card/50
            `}
            style={{ width: sidebarWidths[sidebarWidth] }}
          >
            <div className="sticky top-[var(--header-height)] h-[calc(100vh-var(--header-height))] overflow-y-auto">
              {sidebar}
            </div>
          </aside>
        )}

        {/* Main content area */}
        <main id={id} className="flex-1 min-w-0" tabIndex={-1}>
          {/* Optional header */}
          {header && (
            <div className="sticky top-[var(--header-height)] z-10 bg-background/95 backdrop-blur-sm border-b border-border">
              {header}
            </div>
          )}

          {/* Content */}
          <div className="px-[var(--page-gutter)] sm:px-[var(--page-gutter-sm)] lg:px-[var(--page-gutter-lg)] page-padding">
            {children}
          </div>
        </main>

        {/* Right sidebar */}
        {sidebar && sidebarPosition === 'right' && (
          <aside
            className={`
              ${sidebarCollapsible ? 'hidden lg:block' : 'block'}
              flex-shrink-0 border-l border-border bg-card/50
            `}
            style={{ width: sidebarWidths[sidebarWidth] }}
          >
            <div className="sticky top-[var(--header-height)] h-[calc(100vh-var(--header-height))] overflow-y-auto">
              {sidebar}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   AUTH SHELL
   
   For centered auth pages (login, signup, onboarding)
============================================================================= */

export interface AuthShellProps {
  children: ReactNode;
  /** Maximum width of the auth card */
  maxWidth?: 'xs' | 'sm' | 'md';
  /** Background style */
  background?: 'gradient' | 'muted' | 'none';
  /** Custom gradient class */
  gradientClass?: string;
  /** Show brand logo area */
  showLogo?: boolean;
  /** Additional className */
  className?: string;
}

const authMaxWidths = {
  xs: '20rem',  // 320px
  sm: '24rem',  // 384px
  md: '28rem',  // 448px
};

/**
 * AuthShell - Centered layout for authentication pages
 * 
 * Use for: /login, /signup, /onboarding
 * 
 * @example
 * ```tsx
 * <AuthShell background="gradient" maxWidth="sm">
 *   <AuthCard>
 *     <LoginForm />
 *   </AuthCard>
 * </AuthShell>
 * ```
 */
export function AuthShell({
  children,
  maxWidth = 'sm',
  background = 'gradient',
  gradientClass = 'bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600',
  className = '',
}: AuthShellProps) {
  const bgClasses = {
    gradient: gradientClass,
    muted: 'bg-muted',
    none: 'bg-background',
  };

  return (
    <div 
      className={`
        min-h-screen flex items-center justify-center
        px-[var(--page-gutter)] py-8
        ${bgClasses[background]}
        ${className}
      `}
    >
      <div 
        className="w-full"
        style={{ maxWidth: authMaxWidths[maxWidth] }}
      >
        {children}
      </div>
    </div>
  );
}

/* =============================================================================
   PAGE HEADER
============================================================================= */

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  backLink?: string;
  backLabel?: string;
  className?: string;
}

/**
 * PageHeader - Consistent page header with title and optional actions
 */
export function PageHeader({
  title,
  description,
  actions,
  backLink,
  backLabel = 'Back',
  className = '',
}: PageHeaderProps) {
  return (
    <header 
      className={`section-spacing-sm ${className}`}
      style={{ marginBottom: 'var(--space-6)' }}
    >
      {backLink && (
        <a
          href={backLink}
          className="inline-flex items-center gap-[var(--space-1)] text-sm text-muted-foreground hover:text-foreground transition"
          style={{ marginBottom: 'var(--space-4)', display: 'block' }}
        >
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {backLabel}
        </a>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between" style={{ gap: 'var(--space-4)' }}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="text-sm sm:text-base text-muted-foreground" style={{ marginTop: 'var(--space-1)' }}>
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center flex-shrink-0" style={{ gap: 'var(--space-3)' }}>
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

/* =============================================================================
   PAGE SECTION
============================================================================= */

export interface PageSectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  /** Whether to use card styling with consistent rhythm */
  card?: boolean;
}

/**
 * PageSection - Consistent section wrapper within a page
 */
export function PageSection({
  children,
  title,
  description,
  actions,
  className = '',
  card = false,
}: PageSectionProps) {
  const cardStyles: CSSProperties = card ? {
    padding: 'var(--card-padding-sm)',
    borderRadius: 'var(--card-radius)',
    boxShadow: 'var(--card-shadow)',
  } : {};

  const sectionClasses = [
    'section-spacing-sm',
    card ? 'bg-card border border-border' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <section className={sectionClasses} style={cardStyles}>
      {(title || actions) && (
        <div 
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
          style={{ gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}
        >
          <div>
            {title && (
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground" style={{ marginTop: 'var(--space-1)' }}>
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center flex-shrink-0" style={{ gap: 'var(--space-2)' }}>
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export default PageShell;
