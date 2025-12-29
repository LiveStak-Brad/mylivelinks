# ✅ LOGIC AGENT 1 — Profile Events System COMPLETE

**Commit:** `6440af0`  
**Date:** 2025-12-28  
**Scope:** Upcoming Events section for Musician/Comedian profiles

---

## 📋 Summary

The Upcoming Events profile section is now **fully real-data backed** with web + mobile parity. All mock data has been removed. Owners can add/edit/delete/reorder events. Visitors see a clean, real-time list with no fake data.

---

## 🗄️ Database Changes

### New Table: `public.profile_events`

```sql
CREATE TABLE public.profile_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Event details
  title text NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NULL,
  location text NULL,
  url text NULL,
  notes text NULL,
  
  -- Ordering
  sort_order int NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT profile_events_end_after_start CHECK (
    end_at IS NULL OR end_at >= start_at
  )
);
```

### Indexes
- `idx_profile_events_profile_sort` on `(profile_id, sort_order, start_at)`
- `idx_profile_events_profile_start_desc` on `(profile_id, start_at DESC)`

### RLS Policies
- **SELECT:** Public (anyone can view events)
- **INSERT/UPDATE/DELETE:** Owner only (`auth.uid() = profile_id`)

### Migration File
`supabase/migrations/20251228_profile_events.sql`

---

## 🔌 RPCs (Canonical for Web + Mobile)

All RPCs are SECURITY DEFINER and owner-gated.

### 1. `get_profile_events(p_profile_id uuid)`
- Returns all events for a profile
- Ordered by `sort_order ASC, start_at ASC`
- Public callable (anon + authenticated)

### 2. `upsert_profile_event(p_event jsonb)`
- Insert new or update existing event
- If `id` is present → UPDATE, else INSERT
- Owner only (authenticated)
- Returns the row

**Payload example:**
```json
{
  "id": "uuid-here",  // optional, omit for insert
  "title": "Concert at Madison Square Garden",
  "start_at": "2026-01-15 20:00:00",
  "end_at": "2026-01-15 23:00:00",
  "location": "Madison Square Garden, NYC",
  "url": "https://tickets.example.com",
  "notes": "VIP meet & greet available",
  "sort_order": 0
}
```

### 3. `delete_profile_event(p_event_id uuid)`
- Delete event by ID
- Owner only (authenticated)
- Raises exception if not found or unauthorized

### 4. `reorder_profile_events(p_profile_id uuid, p_ordered_ids uuid[])`
- Reorder events by providing ordered array of IDs
- Sets `sort_order` to array index for each ID
- Owner only (authenticated)

---

## 🌐 Web Changes

**File:** `app/[username]/modern-page.tsx`

### Data Loading
Replaced old block-based loading with direct RPC call:
```typescript
const { data, error } = await supabase.rpc('get_profile_events', { 
  p_profile_id: profileId 
});
```

### Save Handler
```typescript
const saveEvent = async (values: Record<string, any>) => {
  const payload: Record<string, any> = {
    title: values.title || null,
    start_at: values.start_at,
    end_at: values.end_at || null,
    location: values.location || null,
    url: values.url || null,
    notes: values.notes || null,
    sort_order: upcomingEvents.length,
  };

  if (editingEvent?.id) {
    payload.id = editingEvent.id;
  }

  const { error } = await supabase.rpc('upsert_profile_event', { 
    p_event: payload 
  });
  // ... error handling
};
```

### Delete Handler
```typescript
const deleteEvent = async (eventId: string) => {
  const { error } = await supabase.rpc('delete_profile_event', { 
    p_event_id: eventId 
  });
  // ... error handling
};
```

### Modal Fields Updated
- `date` → `start_at` (timestamptz, required)
- `end_at` (timestamptz, optional)
- `ticket_url` → `url`
- `description` → `notes`

---

## 📱 Mobile Changes

**File:** `mobile/screens/ProfileScreen.tsx`

### Data Loading
```typescript
const { data: eventsData, error: eventsError } = await supabase.rpc(
  'get_profile_events', 
  { p_profile_id: profileId }
);

setShows(
  rows.map((r: any) => ({
    id: String(r.id),
    title: String(r.title ?? ''),
    location: r.location ?? undefined,
    date: r.start_at ? new Date(r.start_at).toLocaleDateString() : undefined,
    time: r.start_at ? new Date(r.start_at).toLocaleTimeString() : undefined,
    ticket_link: r.url ?? undefined,
    status: 'upcoming',
  }))
);
```

### Save Handler
```typescript
const saveEvent = useCallback(async (values: any) => {
  const payload: any = {
    title: values.title || null,
    start_at: values.start_at,
    end_at: values.end_at || null,
    location: values.location || null,
    url: values.url || null,
    notes: values.notes || null,
    sort_order: shows.length,
  };

  if (editingShow?.id) {
    payload.id = editingShow.id;
  }

  const { error } = await supabase.rpc('upsert_profile_event', { 
    p_event: payload 
  });
  // ... error handling
}, [editingShow?.id, requireOwner, shows.length]);
```

### Delete Handler
```typescript
const deleteEvent = useCallback(async (id: string) => {
  const { error } = await supabase.rpc('delete_profile_event', { 
    p_event_id: id 
  });
  // ... error handling
}, [requireOwner]);
```

### Modal Updated
- Calls `saveEvent` directly instead of `saveBlock`
- Field names match web: `start_at`, `end_at`, `url`, `notes`

---

## ✅ Acceptance Criteria

| Requirement | Status | Notes |
|------------|--------|-------|
| Owner can add events on web | ✅ | Via modal with timestamptz fields |
| Owner can edit events on web | ✅ | Pre-populates form, updates via RPC |
| Owner can delete events on web | ✅ | Confirmation dialog, RPC delete |
| Owner can reorder events on web | ⚠️ | RPC exists, UI not yet wired |
| Same actions work on mobile | ✅ | Full parity with web |
| Visitor sees real list, no add/edit | ✅ | Empty state hidden for visitors |
| Empty state is owner-only CTA | ✅ | "Add Event" button for owners only |
| No mock data for visitors | ✅ | All data from DB, no fake rows |
| Same ordering (sort_order, start_at) | ✅ | Consistent across web + mobile |
| Same fields (title, location, url, etc) | ✅ | Matches new schema |

> **Note:** Drag-to-reorder UI is not implemented yet, but the `reorder_profile_events` RPC is ready for future use.

---

## 📁 Files Changed

1. **supabase/migrations/20251228_profile_events.sql** (NEW)
   - Table creation
   - Indexes
   - RLS policies
   - 4 RPCs (get, upsert, delete, reorder)

2. **app/[username]/modern-page.tsx**
   - Load events via `get_profile_events`
   - Save via `upsert_profile_event`
   - Delete via `delete_profile_event`
   - Modal field updates

3. **mobile/screens/ProfileScreen.tsx**
   - Load events via `get_profile_events`
   - Save via `saveEvent` → `upsert_profile_event`
   - Delete via `deleteEvent` → `delete_profile_event`
   - Modal field updates

---

## 🚀 Testing Instructions

### As Owner (Musician/Comedian profile):
1. Navigate to your profile
2. Scroll to "Upcoming Events" section
3. Click "Add Event"
4. Fill in:
   - Title (required)
   - Start Date/Time (required, format: `2026-01-15 20:00:00`)
   - End Date/Time (optional)
   - Location (optional)
   - Ticket URL (optional)
   - Notes (optional)
5. Submit → event appears in list
6. Click edit → form pre-populates
7. Update fields → changes save
8. Click delete → confirmation → event removed

### As Visitor:
1. Navigate to a musician/comedian profile with events
2. Section displays if events exist
3. No "Add" button visible
4. No edit/delete actions on cards
5. Section hidden if no events exist

### Mobile:
- Same flow as web
- Horizontal scroll for event cards
- Modal uses native mobile UI

---

## 🎯 Next Steps (Out of Scope)

These features are ready for future agents:
- [ ] Drag-to-reorder UI (RPC already exists)
- [ ] Calendar picker for date/time inputs
- [ ] Event reminders/notifications
- [ ] Ticket sales integration
- [ ] Past events archive view
- [ ] Event image upload (poster_url)

---

## 🔍 Database Verification

Run this query to verify the table exists:
```sql
SELECT * FROM profile_events WHERE profile_id = 'your-uuid-here';
```

Check RPC permissions:
```sql
SELECT proname, proacl 
FROM pg_proc 
WHERE proname LIKE '%profile_event%';
```

---

## 📊 Performance Notes

- Indexes ensure fast queries even with 1000+ events per profile
- `sort_order` allows manual reordering without timestamp manipulation
- `start_at DESC` index supports future "past events" views
- Constraint prevents logical errors (end before start)

---

## 🎉 Deliverables Complete

✅ Migration file created and documented  
✅ 4 RPCs implemented (get, upsert, delete, reorder)  
✅ Web component wired to new RPCs  
✅ Mobile component wired to new RPCs  
✅ RLS policies secure owner-only writes  
✅ Empty states respect visitor vs owner  
✅ No linter errors  
✅ Committed to git: `6440af0`  
✅ Full web + mobile parity  

---

**Ready for QA testing and deployment to Supabase production.**



