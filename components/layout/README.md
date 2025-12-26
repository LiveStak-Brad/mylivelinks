# Layout Components

Consistent page structure and responsive patterns for MyLiveLinks.

## Overview

This module provides standardized layout components that use CSS design tokens for consistent spacing, sizing, and responsive behavior.

## Shell Variants

Choose the right shell for your page type:

| Shell | Use Case | Pages |
|-------|----------|-------|
| `PageShell` | Standard content pages | /apply, /settings/*, /wallet, /gifter-levels |
| `DashboardShell` | Complex pages with sidebar | /owner, /admin/*, /me/analytics |
| `AuthShell` | Centered auth layouts | /login, /signup, /onboarding |
| Custom | Full-screen experiences | /live (video player) |

### PageShell (Default)

```tsx
import { PageShell, PageHeader, PageSection } from '@/components/layout';

export default function MyPage() {
  return (
    <PageShell maxWidth="lg" padding="md">
      <PageHeader title="Dashboard" description="Overview" />
      <PageSection card title="Stats">
        <StatsContent />
      </PageSection>
    </PageShell>
  );
}
```

**Props:**
- `maxWidth`: `'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'`
- `padding`: `'none' | 'sm' | 'md' | 'lg'`
- `gradient`: Add gradient background
- `glass`: Glass morphism effect
- `centerVertical`: Center content vertically

### DashboardShell

For complex pages with sidebar navigation:

```tsx
import { DashboardShell, PageHeader } from '@/components/layout';

function DashboardNav() {
  return (
    <nav className="p-4">
      <a href="/owner">Dashboard</a>
      <a href="/owner/rooms">Rooms</a>
    </nav>
  );
}

export default function OwnerPage() {
  return (
    <DashboardShell
      sidebar={<DashboardNav />}
      sidebarWidth="md"
    >
      <PageHeader title="Owner Dashboard" />
      <DashboardContent />
    </DashboardShell>
  );
}
```

**Props:**
- `sidebar`: Sidebar navigation content
- `sidebarPosition`: `'left' | 'right'`
- `sidebarWidth`: `'sm' | 'md' | 'lg'`
- `sidebarCollapsible`: Hide on mobile (default: true)
- `header`: Sticky header content

### AuthShell

For centered authentication pages:

```tsx
import { AuthShell } from '@/components/layout';

export default function LoginPage() {
  return (
    <AuthShell background="gradient" maxWidth="sm">
      <div className="bg-card rounded-2xl p-8 shadow-xl">
        <h1>Welcome Back</h1>
        <LoginForm />
      </div>
    </AuthShell>
  );
}
```

**Props:**
- `maxWidth`: `'xs' | 'sm' | 'md'`
- `background`: `'gradient' | 'muted' | 'none'`

## Skeleton Components

**IMPORTANT**: The canonical Skeleton API lives in `@/components/ui/Skeleton.tsx`.

This module re-exports skeletons for convenience:

```tsx
// Either import works:
import { Skeleton, SkeletonCard } from '@/components/ui';
import { SkeletonCard } from '@/components/layout';

// Use like this:
<SkeletonCard showImage textLines={2} />
<SkeletonAvatar size="lg" />
<Skeleton variant="text" lines={3} />
```

## Page Pattern Templates

Pre-composed layouts for common page types:

### ListPage

```tsx
import { ListPage } from '@/components/layout';

<ListPage
  title="Users"
  items={users}
  renderItem={(user) => <UserCard user={user} />}
  keyExtractor={(user) => user.id}
  isLoading={loading}
  headerAction={<Button>Add User</Button>}
  columns={{ default: 1, sm: 2, lg: 3 }}
/>
```

### DetailPage

```tsx
import { DetailPage } from '@/components/layout';

<DetailPage
  backLink="/users"
  hero={{
    avatarUrl: user.avatar,
    title: user.name,
    subtitle: `@${user.username}`,
    stats: [{ label: 'Followers', value: 1234 }],
  }}
  actions={<Button>Follow</Button>}
  tabs={[
    { key: 'posts', label: 'Posts', content: <PostsList /> },
    { key: 'about', label: 'About', content: <AboutSection /> },
  ]}
/>
```

### FormPage

```tsx
import { FormPage, FormSection, FormField } from '@/components/layout';

<FormPage
  title="Edit Profile"
  onSubmit={handleSubmit}
  submitLabel="Save Changes"
  backLink="/settings"
  stickyFooter
>
  <FormSection title="Basic Info" card>
    <FormField label="Name" required>
      <Input value={name} onChange={...} />
    </FormField>
  </FormSection>
</FormPage>
```

## CSS Classes

### Grid Patterns

```css
/* Auto-fit grids */
.grid-auto-fit    /* min 280px columns */
.grid-auto-fill   /* responsive fill */

/* Container widths */
.container-sm     /* 32rem */
.container-md     /* 42rem */
.container-lg     /* 56rem */
.container-xl     /* 72rem */
```

### Layout Utilities

```css
.min-h-page       /* Full height minus header */
.page-padding     /* Responsive vertical padding */
.section-spacing  /* Bottom margin between sections */
.stack            /* Vertical flex with gap */
.full-bleed       /* Break out of container */
```

## CSS Tokens

All components use tokens from `styles/layout.css`:

```css
/* Page Layout */
--page-max-width-sm/md/lg/xl/2xl
--page-gutter / --page-gutter-sm / --page-gutter-lg
--header-height / --header-height-lg

/* Card */
--card-padding / --card-padding-sm
--card-radius / --card-shadow

/* Modal */
--modal-sm through --modal-full
--modal-padding / --modal-padding-mobile
--modal-header-height / --modal-footer-height
```

## Migration Guide

### Converting to PageShell

```tsx
// Before
export default function MyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <h1>Title</h1>
        <div>Content</div>
      </div>
    </div>
  );
}

// After
import { PageShell, PageHeader, PageSection } from '@/components/layout';

export default function MyPage() {
  return (
    <PageShell maxWidth="lg" padding="md">
      <PageHeader title="Title" />
      <PageSection>Content</PageSection>
    </PageShell>
  );
}
```

### Converting to DashboardShell

```tsx
// Before
export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r">{/* nav */}</aside>
      <main className="flex-1 p-6">{/* content */}</main>
    </div>
  );
}

// After
import { DashboardShell } from '@/components/layout';

export default function AdminPage() {
  return (
    <DashboardShell sidebar={<AdminNav />}>
      <AdminContent />
    </DashboardShell>
  );
}
```

## Best Practices

1. **Always use a shell** - Every page needs PageShell, DashboardShell, or AuthShell
2. **Use PageSection** for logical groups with optional card styling
3. **Use Pattern templates** (ListPage, DetailPage, FormPage) when applicable
4. **Never hardcode spacing** - Use tokens or Tailwind scale
5. **Test responsive** - All shells adapt to mobile

## Enforcement

Run drift detection before committing:

```bash
npm run lint:ui
```

See `docs/UI_GOLDEN_RULES.md` for complete guidelines.
