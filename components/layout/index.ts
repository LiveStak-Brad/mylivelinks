/* =============================================================================
   LAYOUT COMPONENTS
   
   Page structure and layout utilities.
   For UI primitives (buttons, inputs, etc.) use @/components/ui
============================================================================= */

// Core Layout
export { 
  PageShell, 
  PageHeader, 
  PageSection,
  type PageShellProps,
  type PageHeaderProps,
  type PageSectionProps,
} from './PageShell';

export { 
  Grid, 
  GridItem,
  type GridProps,
  type GridItemProps,
} from './Grid';

// Page Patterns
export {
  // List pages
  ListPage,
  type ListPageProps,
  // Detail pages
  DetailPage,
  type DetailPageProps,
  // Form pages
  FormPage,
  FormSection,
  FormField,
  type FormPageProps,
  type FormSectionProps,
  type FormFieldProps,
  // Dashboard pages
  DashboardPage,
  DashboardSection,
  KpiGrid,
  KpiCard,
  type DashboardPageProps,
  type DashboardSectionProps,
  type KpiGridProps,
  type KpiCardProps,
  type DashboardTab,
  // Profile pages
  ProfilePage,
  type ProfilePageProps,
  type ProfileTab,
  type ProfileStat,
} from './patterns';

// NOTE: Skeleton components are in @/components/ui
// Import from: import { Skeleton, SkeletonCard, ... } from '@/components/ui';
