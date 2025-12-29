# UI Golden Rules

> **MANDATORY** guidelines for all UI development on MyLiveLinks.  
> Violations will cause design drift and technical debt.

---

## 🚫 The "Never Do" List

### 1. Never Use Raw HTML Elements

```tsx
// ❌ FORBIDDEN
<button onClick={...}>Click me</button>
<input type="text" value={...} />
<textarea />

// ✅ CORRECT
import { Button, Input, Textarea } from '@/components/ui';
<Button onClick={...}>Click me</Button>
<Input value={...} onChange={...} />
<Textarea value={...} onChange={...} />
```

### 2. Never Use Hex Colors or RGB

```tsx
// ❌ FORBIDDEN
<div style={{ color: '#8B5CF6' }} />
<div className="text-[#8B5CF6]" />
<div style={{ backgroundColor: 'rgb(139, 92, 246)' }} />

// ✅ CORRECT
<div className="text-primary" />
<div className="bg-primary" />
<div style={{ color: 'hsl(var(--primary))' }} />
```

### 3. Never Use One-Off Spacing Values

```tsx
// ❌ FORBIDDEN
<div style={{ padding: '17px' }} />
<div className="p-[13px]" />
<div style={{ margin: '22px 15px' }} />

// ✅ CORRECT (use tokens or Tailwind scale)
<div style={{ padding: 'var(--space-4)' }} />
<div className="p-4" />
<div style={{ margin: 'var(--space-6) var(--space-4)' }} />
```

### 4. Never Hardcode Modal Sizes

```tsx
// ❌ FORBIDDEN
<Modal style={{ maxWidth: '500px' }} />
<div className="max-w-[475px]" />

// ✅ CORRECT
<Modal size="md" />  // Uses --modal-md token (448px)
<Modal size="lg" />  // Uses --modal-lg token (512px)
```

### 5. Never Skip PageShell

```tsx
// ❌ FORBIDDEN (in a page file)
export default function MyPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1>Title</h1>
      </div>
    </div>
  );
}

// ✅ CORRECT
import { PageShell, PageHeader } from '@/components/layout';

export default function MyPage() {
  return (
    <PageShell maxWidth="lg" padding="md">
      <PageHeader title="Title" />
      <PageSection>Content</PageSection>
    </PageShell>
  );
}
```

---

## ✅ The "Always Do" List

### 1. Always Use Design System Components

| Need | Component |
|------|-----------|
| Button | `<Button>` from `@/components/ui` |
| Text input | `<Input>` from `@/components/ui` |
| Dropdown | `<Select>` from `@/components/ui` |
| Modal | `<Modal>` from `@/components/ui` |
| Card | `<Card>` from `@/components/ui` |
| Loading | `<Skeleton*>` from `@/components/ui` |
| Page wrapper | `<PageShell>` from `@/components/layout` |

### 2. Always Use CSS Tokens

```css
/* Spacing */
var(--space-1) through var(--space-24)

/* Colors - via Tailwind or HSL */
text-primary, bg-card, border-border
hsl(var(--primary)), hsl(var(--muted))

/* Radii */
var(--radius-sm), var(--radius-md), var(--radius-lg)
rounded-sm, rounded-md, rounded-lg

/* Shadows */
var(--shadow-sm), var(--shadow-md), var(--shadow-lg)
shadow-sm, shadow-md, shadow-lg

/* Modal sizes */
var(--modal-sm), var(--modal-md), var(--modal-lg), var(--modal-xl)

/* Page layout */
var(--page-gutter), var(--page-max-width-lg)
var(--header-height), var(--card-padding)
```

### 3. Always Choose the Right Shell

| Page Type | Shell | Example |
|-----------|-------|---------|
| Content pages | `<PageShell>` | /apply, /settings, /wallet |
| Dashboard | `<DashboardShell>` | /owner, /admin, /analytics |
| Auth pages | `<AuthShell>` | /login, /signup |
| Full-screen | Custom layout | /live (video player) |

### 4. Always Use Page Patterns for Common Layouts

```tsx
// List/Index pages
import { ListPage } from '@/components/layout';

<ListPage
  title="Users"
  items={users}
  renderItem={(user) => <UserCard user={user} />}
  keyExtractor={(u) => u.id}
  isLoading={loading}
/>

// Form pages
import { FormPage, FormSection, FormField } from '@/components/layout';

<FormPage title="Settings" onSubmit={handleSubmit}>
  <FormSection title="Profile" card>
    <FormField label="Name">
      <Input value={name} onChange={...} />
    </FormField>
  </FormSection>
</FormPage>
```

### 5. Always Match Skeleton Dimensions

```tsx
// Skeleton must match the real component
// Avatar is 40px? Skeleton must be 40px
<SkeletonAvatar size="md" />  // 40px

// Card has image + 2 lines of text?
<SkeletonCard showImage textLines={2} />
```

---

## Modal Size Reference

| Size | Width | Use Case |
|------|-------|----------|
| `sm` | 384px | Confirmations, simple alerts |
| `md` | 448px | Simple forms, default |
| `lg` | 512px | Complex forms |
| `xl` | 576px | Rich content |
| `2xl` | 672px | Multi-column content |
| `full` | 896px | Large forms, dashboards |

All modals are full-screen on mobile (< 640px).

---

## Spacing Scale Reference

| Token | Value | Use For |
|-------|-------|---------|
| `--space-1` | 4px | Tight gaps |
| `--space-2` | 8px | Icon gaps, small padding |
| `--space-3` | 12px | Button padding |
| `--space-4` | 16px | Standard gaps, card padding |
| `--space-6` | 24px | Section gaps |
| `--space-8` | 32px | Large section gaps |
| `--space-12` | 48px | Page section spacing |

---

## File Organization

```
components/
├── ui/           # Primitives (Button, Input, Modal, Card...)
│   └── index.ts  # Single export point
├── layout/       # Page shells and grids
│   ├── PageShell.tsx  # PageShell, DashboardShell, AuthShell
│   ├── Grid.tsx       # Responsive grid component
│   ├── patterns/      # ListPage, DetailPage, FormPage
│   └── index.ts
└── [feature]/    # Feature-specific components

styles/
├── layout.css    # Page layout utilities, tokens
├── skeleton.css  # Skeleton animations
└── tokens.css    # Design tokens (deprecated - use layout.css)
```

---

## Enforcement

Run the drift detector before committing:

```bash
npm run lint:ui
# or
node scripts/ui-drift-detector.js
```

This checks for:
- ❌ Raw `<button>`, `<input>`, `<textarea>` elements
- ❌ Hex colors (#xxx, #xxxxxx)
- ❌ One-off pixel values (px values not in token scale)
- ❌ Inline styles with hardcoded colors

---

## Quick Reference Card

```tsx
// Imports
import { Button, Input, Modal, Card } from '@/components/ui';
import { PageShell, PageHeader, PageSection, DashboardShell } from '@/components/layout';
import { ListPage, FormPage, FormSection } from '@/components/layout';

// Standard page
<PageShell maxWidth="lg" padding="md">
  <PageHeader title="Page" />
  <PageSection card>Content</PageSection>
</PageShell>

// Dashboard page
<DashboardShell sidebar={<Nav />}>
  <PageHeader title="Dashboard" />
  {content}
</DashboardShell>

// Spacing
gap: var(--space-4)
padding: var(--space-6)
className="gap-4 p-6"

// Colors
className="text-primary bg-card border-border"
color: hsl(var(--primary))

// Shadows & Radii
className="shadow-md rounded-xl"
boxShadow: var(--shadow-md)
borderRadius: var(--radius-lg)
```




