# Coming Soon Rooms — Test Plan

## Preconditions
- Apply SQL migration: `sql/20251225_rooms_coming_soon_interest.sql` in Supabase SQL editor.
- Verify seed data exists in `public.rooms`.

## Tests

### 1) Rooms list loads (public)
- Visit `/` (Home).
- Confirm you see the **Coming Soon Rooms** horizontal carousel.
- Confirm rooms render as tiles (name, category badge, progress bar, interest count).

### 2) Interest state loads (authed)
- Log in.
- Refresh Home.
- Confirm any rooms you previously marked are shown as **Interested**.

### 3) Toggle interest (authed)
- Click **Interested** on a room.
- Confirm:
  - Button changes state immediately (optimistic).
  - Interest count updates.
- Refresh Home and confirm the state persists.

### 4) Toggle interest (not authed)
- Log out.
- Click **Interested**.
- Confirm you get a login prompt message and the UI reverts.

### 5) Disclaimer-required room
- Find **Roast Room** (has consent badge).
- Click **Interested**.
- Confirm a confirmation prompt appears.
- Click **Cancel** and confirm no state changes.
- Click **OK** and confirm interest toggles.

### 6) Room Preview modal
- Click a room tile (not the button).
- Confirm modal opens.
- Confirm modal shows:
  - Room name
  - Category badge
  - Interest count + progress
- Toggle interest from inside the modal and confirm the carousel tile stays in sync.

### 7) Room Idea card
- Scroll to the end of the carousel.
- Confirm the last card is **Room Idea? Enter it here**.
- Click it and confirm it navigates to `/apply`.

## Screenshot checklist (deliverable)
- Screenshot 1: Home page showing the Coming Soon Rooms carousel with multiple tiles.
- Screenshot 2: A Room Preview modal open showing progress + Interested state.
