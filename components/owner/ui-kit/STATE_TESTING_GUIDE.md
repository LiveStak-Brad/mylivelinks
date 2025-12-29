# Owner Panel UI Kit - State Testing Guide

This document demonstrates all UI states for the Owner Panel components.

## Component States

All Owner Panel pages must implement these four states:

### 1. Loading State
- Shown while data is being fetched
- Uses Skeleton components to maintain layout
- Provides visual feedback without blocking UI

### 2. Error State
- Shown when data fetch fails
- Uses EmptyState with error variant
- Provides retry action button

### 3. Empty State
- Shown when no data is available
- Uses EmptyState with appropriate icon
- May provide action to create first item

### 4. Success State
- Shown when data is loaded successfully
- Displays actual data in tables, cards, etc.
- Provides full interactivity

## Example Implementation

See `app/owner/page.tsx` for a complete implementation that demonstrates all four states:

```typescript
'use client';

import { useOwnerPanelData } from '@/hooks/useOwnerPanelData';
import { EmptyState, Skeleton, StatCard, Table } from '@/components/owner/ui-kit';

export default function Page() {
  const { data, loading, error } = useOwnerPanelData();

  // 1. ERROR STATE
  if (error) {
    return <EmptyState variant="error" title="Error" description={error} />;
  }

  // 2. LOADING STATE
  if (loading) {
    return <Skeleton count={3} />;
  }

  // 3. EMPTY STATE
  if (data.length === 0) {
    return <EmptyState title="No Data" description="..." />;
  }

  // 4. SUCCESS STATE
  return <Table data={data} columns={...} />;
}
```

## UI Kit Components Used

### Layout Components
- `Card` - Base container
- `StatCard` - Stats with trends
- `Drawer` - Side panel
- `Panel` - Content panel

### Table Components
- `Table` - Data table
- `TableToolbar` - Search/filter UI
- `TableCell` - Custom cell content
- `TableBadge` - Status badges

### Feedback Components
- `EmptyState` - No data / error states
- `Skeleton` - Loading placeholders
- `SkeletonCard` - Card loading state
- `SkeletonTable` - Table loading state

### Interactive Components
- `Badge` / `Pill` - Status indicators
- `Button` - Primary actions
- `IconButton` - Icon-only buttons
- `RowActions` - Dropdown menu

## Testing Checklist

For each Owner Panel page, verify:

- [ ] Loading state shows skeletons
- [ ] Error state shows error message with retry
- [ ] Empty state shows helpful message
- [ ] Success state displays data correctly
- [ ] All interactive elements are responsive
- [ ] Desktop-first layout works on all screen sizes
- [ ] Vector icons only (no emojis)
- [ ] No random numbers in components (use hook data)

## State Flow

```
Initial Mount
    ↓
Loading State (Skeleton)
    ↓
   Success or Error?
    ↓              ↓
Success State   Error State
    ↓              ↓
Check for data  Show retry
    ↓
Data exists?
    ↓      ↓
  Yes     No
    ↓      ↓
Success  Empty
State    State
```

