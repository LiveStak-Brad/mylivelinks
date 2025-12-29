# Owner Panel UI Kit - Quick Reference

## 📂 File Structure

```
components/owner/
├── OwnerPanelShell.tsx          # Main layout (sidebar + top bar)
├── ui-kit/
│   ├── Badge.tsx                # Status badges + Pill
│   ├── Card.tsx                 # Base card + Header/Body/Footer
│   ├── Drawer.tsx               # Side panel + Panel
│   ├── EmptyState.tsx           # No data / error states
│   ├── IconButton.tsx           # Icon buttons + Button
│   ├── RowActions.tsx           # Dropdown menu + ActionMenu
│   ├── Skeleton.tsx             # Loading states
│   ├── StatCard.tsx             # Stats with trends
│   ├── Table.tsx                # Data table + Cell/Badge
│   ├── TableToolbar.tsx         # Search/filter toolbar
│   ├── index.ts                 # Barrel export
│   └── STATE_TESTING_GUIDE.md   # Testing guide
├── [other legacy components]
└── index.ts

hooks/
└── useOwnerPanelData.ts          # Data hook (stub for Supabase)

app/owner/
├── layout.tsx                    # Wraps in OwnerPanelShell
└── page.tsx                      # Dashboard (example implementation)
```

## 🎨 Component Cheat Sheet

### Layout Components

```tsx
import { Card, CardHeader, StatCard, Drawer, Panel } from '@/components/owner/ui-kit';

// Basic Card
<Card padding="md" hover>
  <CardHeader title="Title" subtitle="Subtitle" />
  Content here
</Card>

// Stat Card
<StatCard
  title="Total Users"
  value="1,234"
  icon={Users}
  trend={{ value: 12.5, direction: 'up', label: 'vs last month' }}
/>

// Drawer
<Drawer isOpen={open} onClose={close} title="Details" footer={<Button>Save</Button>}>
  Content here
</Drawer>
```

### Table Components

```tsx
import { Table, TableToolbar, TableBadge } from '@/components/owner/ui-kit';

// Toolbar
<TableToolbar
  searchValue={search}
  onSearchChange={setSearch}
  actions={<Button>Action</Button>}
/>

// Table
<Table
  columns={[
    { key: 'name', header: 'Name', render: (row) => row.name },
    { key: 'status', header: 'Status', render: (row) => (
      <TableBadge variant="success">{row.status}</TableBadge>
    )},
  ]}
  data={data}
  keyExtractor={(row) => row.id}
/>
```

### Feedback Components

```tsx
import { EmptyState, Skeleton, SkeletonCard, SkeletonTable } from '@/components/owner/ui-kit';

// Empty State
<EmptyState
  icon={Inbox}
  title="No Data"
  description="Nothing here yet."
  action={<Button>Create First Item</Button>}
/>

// Error State
<EmptyState
  variant="error"
  title="Failed to Load"
  description={error}
  action={<Button onClick={retry}>Try Again</Button>}
/>

// Loading States
<Skeleton count={3} />
<SkeletonCard />
<SkeletonTable rows={5} columns={4} />
```

### Interactive Components

```tsx
import { Badge, Button, IconButton, RowActions } from '@/components/owner/ui-kit';

// Badges
<Badge variant="success">Active</Badge>
<Badge variant="warning" dot>Pending</Badge>

// Buttons
<Button variant="primary" leftIcon={Plus}>Add New</Button>
<IconButton icon={Edit} label="Edit" variant="ghost" />

// Row Actions
<RowActions
  actions={[
    { label: 'Edit', icon: Edit, onClick: () => {} },
    { label: 'Delete', icon: Trash, variant: 'destructive', onClick: () => {} },
  ]}
/>
```

## 🔌 Hook Usage

```tsx
import { useOwnerPanelData } from '@/hooks/useOwnerPanelData';
import type { LiveStream, UserSummary } from '@/hooks/useOwnerPanelData';

function MyPage() {
  const { data, loading, error, refetch } = useOwnerPanelData();

  // Available data:
  // data.stats           — DashboardStats | null
  // data.liveNow         — LiveStream[]
  // data.users           — UserSummary[]
  // data.creators        — CreatorSummary[]
  // data.reports         — Report[]
  // data.revenue         — RevenueStats | null
  // data.transactions    — Transaction[]
  // data.analytics       — AnalyticsData | null
  // data.featureFlags    — FeatureFlag[]
  // data.systemHealth    — SystemHealth | null
  // data.auditLogs       — AuditLog[]

  if (error) return <EmptyState variant="error" title="Error" description={error} />;
  if (loading) return <Skeleton count={5} />;
  if (!data.users.length) return <EmptyState title="No Users" />;

  return <Table data={data.users} columns={...} />;
}
```

## 🎯 Component Variants

### Badge Variants
- `default` — Gray (muted)
- `primary` — Purple
- `success` — Green
- `warning` — Yellow
- `destructive` — Red
- `info` — Blue
- `accent` — Accent color

### Button Variants
- `default` — Gray
- `primary` — Purple (main CTA)
- `destructive` — Red (danger actions)
- `ghost` — Transparent
- `outline` — Border only

### Button Sizes
- `sm` — Small (compact)
- `md` — Medium (default)
- `lg` — Large (prominent)

## 📋 Required Page States

Every Owner Panel page MUST implement:

```tsx
// 1. ERROR STATE
if (error) {
  return <EmptyState variant="error" title="Error" description={error} />;
}

// 2. LOADING STATE
if (loading) {
  return <Skeleton count={3} /> // or <SkeletonCard /> or <SkeletonTable />
}

// 3. EMPTY STATE
if (data.length === 0) {
  return <EmptyState title="No Data" description="..." />;
}

// 4. SUCCESS STATE
return <Table data={data} columns={...} />;
```

## 🚦 Navigation Routes

Defined in `OwnerPanelShell.tsx`:

```
/owner                  — Dashboard
/owner/live-ops         — Live Now
/owner/users            — Users
/owner/creators         — Creators
/owner/reports          — Reports
/owner/revenue          — Coins & Revenue
/owner/transactions     — Transactions
/owner/analytics        — Analytics
/owner/feature-flags    — Feature Flags
/owner/system-health    — System Health
/owner/audit-logs       — Audit Logs
/owner/settings         — Settings
```

## 🎨 Design Tokens

All components use Tailwind CSS variables:

```css
/* Colors */
--primary              /* Purple (brand) */
--accent               /* Accent color */
--success              /* Green */
--warning              /* Yellow */
--destructive          /* Red */
--muted                /* Gray */

/* Backgrounds */
--background           /* Page background */
--card                 /* Card background */
--popover              /* Dropdown background */

/* Text */
--foreground           /* Primary text */
--muted-foreground     /* Secondary text */

/* Borders */
--border               /* Default border */
--border-hover         /* Hover border */
```

## ✅ Commit Hashes

- **Main Implementation:** `1ec059d12a4b9906eea867ab7e38398b94538186`
- **Deliverables Doc:** `75f668b`

## 📚 Documentation

- **Full Deliverables:** `OWNER_PANEL_UI_AGENT_1_DELIVERABLES.md`
- **State Testing Guide:** `components/owner/ui-kit/STATE_TESTING_GUIDE.md`
- **This Quick Reference:** `OWNER_PANEL_UI_KIT_QUICK_REF.md`

---

**Ready to use!** Import components, follow the 4-state pattern, and build your Owner Panel pages. 🚀


