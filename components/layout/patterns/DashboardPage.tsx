'use client';

/**
 * DashboardPage Pattern Template
 * 
 * Use for: Admin panels, analytics dashboards, owner pages
 * Examples: /owner, /admin/*, /me/analytics
 * 
 * Features:
 * - Sticky header with title and actions
 * - Tab navigation
 * - KPI card grid
 * - Content sections
 * - Responsive design with mobile-first approach
 */

import { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button, IconButton, Tabs, TabsList, TabsTrigger, TabsContent, Skeleton } from '@/components/ui';

export interface DashboardTab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface DashboardPageProps {
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Icon to show next to title */
  icon?: ReactNode;
  /** Tabs configuration */
  tabs: DashboardTab[];
  /** Default active tab */
  defaultTab?: string;
  /** Show back button */
  showBackButton?: boolean;
  /** Back button click handler */
  onBack?: () => void;
  /** Header action buttons */
  headerActions?: ReactNode;
  /** Show refresh button */
  showRefresh?: boolean;
  /** Refresh handler */
  onRefresh?: () => void;
  /** Is refreshing */
  isRefreshing?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Controlled tab value */
  activeTab?: string;
  /** Tab change handler */
  onTabChange?: (tab: string) => void;
}

export function DashboardPage({
  title,
  description,
  icon,
  tabs,
  defaultTab,
  showBackButton = true,
  onBack,
  headerActions,
  showRefresh = true,
  onRefresh,
  isRefreshing = false,
  isLoading = false,
  error,
  activeTab: controlledTab,
  onTabChange,
}: DashboardPageProps) {
  const router = useRouter();
  const [internalTab, setInternalTab] = useState(defaultTab || tabs[0]?.id || '');
  
  const activeTab = controlledTab !== undefined ? controlledTab : internalTab;
  
  const handleTabChange = (tab: string) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-sticky bg-card/95 backdrop-blur-md border-b border-border">
        <div className="px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-4">
              {showBackButton && (
                <IconButton
                  variant="ghost"
                  size="md"
                  onClick={handleBack}
                  aria-label="Go back"
                  className="mobile-touch-target"
                >
                  <ArrowLeft className="w-5 h-5" />
                </IconButton>
              )}
              <div className="flex items-center gap-3">
                {icon && (
                  <div className="hidden sm:flex w-10 h-10 rounded-xl bg-primary/10 items-center justify-center text-primary">
                    {icon}
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                    {title}
                  </h1>
                  {description && (
                    <p className="text-sm text-muted-foreground">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {headerActions}
              
              {showRefresh && onRefresh && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  leftIcon={
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  }
                >
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              )}
            </div>
          </div>
          
          {/* Tab Navigation */}
          {tabs.length > 1 && (
            <div className="flex gap-1 mt-4 -mb-4 overflow-x-auto scrollbar-hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && handleTabChange(tab.id)}
                  disabled={tab.disabled}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg 
                    transition whitespace-nowrap mobile-touch-target
                    ${activeTab === tab.id
                      ? 'bg-background text-foreground border-t border-l border-r border-border'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }
                    ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive">
            {error}
          </div>
        )}

        {/* Tab Content */}
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={activeTab === tab.id ? 'animate-fade-in' : 'hidden'}
          >
            {tab.content}
          </div>
        ))}
      </main>
    </div>
  );
}

/* -----------------------------------------------------------------------------
   Helper Components for Dashboard Content
----------------------------------------------------------------------------- */

export interface DashboardSectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DashboardSection({
  title,
  description,
  actions,
  children,
  className = '',
}: DashboardSectionProps) {
  return (
    <section className={`bg-card rounded-xl border border-border p-6 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            {title && (
              <h3 className="font-semibold text-foreground">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export interface KpiGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5;
}

export function KpiGrid({ children, columns = 4 }: KpiGridProps) {
  const colsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 lg:grid-cols-5',
  };

  return (
    <div className={`grid ${colsClass[columns]} gap-4 mb-6`}>
      {children}
    </div>
  );
}

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}

export function KpiCard({
  title,
  value,
  icon,
  subtitle,
  trend,
  loading = false,
}: KpiCardProps) {
  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton variant="circle" className="w-8 h-8" />
        </div>
        <Skeleton className="h-8 w-24 mb-1" />
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <div className="flex items-center gap-2 mt-1">
        {subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
        {trend && (
          <span className={`text-xs font-medium ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;





