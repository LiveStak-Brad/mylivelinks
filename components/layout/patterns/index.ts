/* =============================================================================
   PAGE PATTERN TEMPLATES
   
   Pre-composed layouts for common page types.
   Use these to maintain consistency across the app.
============================================================================= */

// List pages (index, search results, item grids)
export { ListPage, type ListPageProps } from './ListPage';

// Detail pages (single item view, read-only content)
export { DetailPage, type DetailPageProps } from './DetailPage';

// Form pages (create/edit forms, settings)
export { 
  FormPage, 
  FormSection, 
  FormField, 
  type FormPageProps, 
  type FormSectionProps, 
  type FormFieldProps 
} from './FormPage';

// Dashboard pages (admin panels, analytics, owner pages)
export { 
  DashboardPage, 
  DashboardSection, 
  KpiGrid, 
  KpiCard,
  type DashboardPageProps,
  type DashboardSectionProps,
  type KpiGridProps,
  type KpiCardProps,
  type DashboardTab,
} from './DashboardPage';

// Profile pages (user profiles, creator pages)
export { 
  ProfilePage,
  type ProfilePageProps,
  type ProfileTab,
  type ProfileStat,
} from './ProfilePage';
