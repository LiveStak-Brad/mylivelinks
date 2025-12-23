# MyLiveLinks - Beta Testing Plan

## Overview

This document outlines the beta testing strategy for MyLiveLinks, including invite-only access, app mode switching, and launch preparation.

---

## A) App Mode Switching

### Environment Variable: `NEXT_PUBLIC_APP_MODE`

**Purpose:** Control app behavior based on deployment stage.

**Values:**
- `seed` - Development mode with fake data (no external keys required)
- `beta` - Beta testing mode (real Supabase, optional video)
- `live` - Production mode (full functionality)

**Default:** If not set, defaults to `seed` mode (for local development).

### Mode Behaviors

#### Seed Mode (`NEXT_PUBLIC_APP_MODE=seed`)

**Behavior:**
- Uses mock/seed data generators
- No Supabase connection required
- No LiveKit connection required
- Perfect for UI development

**When to Use:**
- Local development
- UI/UX testing
- Design iterations
- No database setup needed

**Files Affected:**
- `lib/supabase.ts` - Returns mock client
- `lib/seedData.ts` - Generates fake data
- All components - Use seed data if `isSeedModeEnabled()`

#### Beta Mode (`NEXT_PUBLIC_APP_MODE=beta`)

**Behavior:**
- Uses real Supabase database
- Requires Supabase credentials
- LiveKit optional (can work without video)
- Invite-only access enforced
- Beta-specific features enabled

**When to Use:**
- Beta testing with real users
- Real data validation
- Performance testing
- Bug hunting with real scenarios

**Files Affected:**
- `lib/supabase.ts` - Uses real Supabase client
- `middleware.ts` - Enforces invite-only access
- `app/beta/page.tsx` - Beta invite entry page
- All components - Use real data from Supabase

#### Live Mode (`NEXT_PUBLIC_APP_MODE=live`)

**Behavior:**
- Full production functionality
- Real Supabase database
- LiveKit video streaming required
- Public access (no invite required)
- All features enabled

**When to Use:**
- Production deployment
- Public launch
- Full monetization enabled

**Files Affected:**
- All components - Full production mode
- No restrictions

### Implementation

**Update `lib/supabase.ts`:**
```typescript
export function getAppMode(): 'seed' | 'beta' | 'live' {
  const mode = process.env.NEXT_PUBLIC_APP_MODE;
  if (mode === 'beta' || mode === 'live') {
    return mode;
  }
  return 'seed'; // Default to seed mode
}

export function isSeedModeEnabled() {
  return getAppMode() === 'seed';
}

export function isBetaModeEnabled() {
  return getAppMode() === 'beta';
}

export function isLiveModeEnabled() {
  return getAppMode() === 'live';
}
```

---

## B) Invite-Only Beta

### Database Schema

**Table: `beta_invites`**

```sql
CREATE TABLE beta_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invite_code VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255),
  username VARCHAR(50), -- Optional: pre-assigned username
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, used, revoked
  created_by UUID REFERENCES profiles(id), -- Admin who created invite
  used_by UUID REFERENCES profiles(id), -- User who used invite
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_beta_invites_code ON beta_invites(invite_code);
CREATE INDEX idx_beta_invites_status ON beta_invites(status);
CREATE INDEX idx_beta_invites_email ON beta_invites(email);

-- RLS Policies
ALTER TABLE beta_invites ENABLE ROW LEVEL SECURITY;

-- SECURITY: No public SELECT access. All validation via RPC only.
-- Only admins can SELECT/INSERT/UPDATE
CREATE POLICY "Only admins can access invites"
  ON beta_invites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
```

**RPC Function: `validate_invite_code`** (Public validation, no table access)

```sql
CREATE OR REPLACE FUNCTION validate_invite_code(
  p_invite_code VARCHAR(50)
) RETURNS JSONB AS $$
DECLARE
  v_invite beta_invites%ROWTYPE;
BEGIN
  -- Find invite (SECURITY DEFINER allows access despite RLS)
  SELECT * INTO v_invite
  FROM beta_invites
  WHERE invite_code = p_invite_code
    AND status = 'pending';
  
  -- Check if invite exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or already used invite code');
  END IF;
  
  -- Check if expired
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invite code has expired');
  END IF;
  
  -- Return success (no sensitive data)
  RETURN jsonb_build_object('valid', true, 'email', v_invite.email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**RPC Function: `redeem_beta_invite`** (Redeem after validation)

```sql
CREATE OR REPLACE FUNCTION redeem_beta_invite(
  p_invite_code VARCHAR(50),
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_invite beta_invites%ROWTYPE;
BEGIN
  -- Find invite (SECURITY DEFINER allows access despite RLS)
  SELECT * INTO v_invite
  FROM beta_invites
  WHERE invite_code = p_invite_code
    AND status = 'pending';
  
  -- Check if invite exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or already used invite code');
  END IF;
  
  -- Check if expired
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite code has expired');
  END IF;
  
  -- Check if email matches (if invite has email)
  IF v_invite.email IS NOT NULL AND v_invite.email != (SELECT email FROM auth.users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite code is for a different email');
  END IF;
  
  -- Mark invite as used
  UPDATE beta_invites
  SET status = 'used',
      used_by = p_user_id,
      used_at = NOW()
  WHERE id = v_invite.id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Invite code redeemed successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**RPC Function: `check_beta_access`**

```sql
CREATE OR REPLACE FUNCTION check_beta_access(
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has used a beta invite
  RETURN EXISTS (
    SELECT 1 FROM beta_invites
    WHERE used_by = p_user_id
      AND status = 'used'
  ) OR EXISTS (
    -- Or if user is admin
    SELECT 1 FROM profiles
    WHERE id = p_user_id
      AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Beta Entry Page: `/beta`

**Component:** `app/beta/page.tsx`

**Features:**
- Invite code input field
- "Validate Invite" button (calls `validate_invite_code` RPC)
- Auto-redirect to signup/login if code is valid
- After login: automatically calls `redeem_beta_invite` RPC
- "Request Invite" link (optional: form to request access)

**Security:**
- No direct table access (RLS blocks public SELECT)
- All validation via SECURITY DEFINER RPC functions
- `validate_invite_code` returns only `valid` boolean and optional `email`
- `redeem_beta_invite` marks invite as used after authentication

**Flow:**
1. User visits `/beta`
2. Enters invite code
3. Clicks "Validate Invite" (calls `validate_invite_code` RPC)
4. If valid: Redirects to `/login` (or `/signup` if new user)
5. After login: Invite is automatically redeemed (calls `redeem_beta_invite` RPC)
6. User gains beta access

**Files to Create:**
- `app/beta/page.tsx`

### Middleware: Invite Enforcement

**File:** `middleware.ts` (create if doesn't exist)

**Purpose:** Block non-invited users in beta mode.

**Logic:**
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const appMode = process.env.NEXT_PUBLIC_APP_MODE;
  
  // Only enforce in beta mode
  if (appMode !== 'beta') {
    return NextResponse.next();
  }
  
  // Allow public pages
  const publicPaths = ['/beta', '/login', '/api/auth'];
  if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // Check if user has beta access (requires auth token)
  // This would need to call Supabase to check beta_invites table
  // For now, redirect to /beta if not authenticated or no access
  
  // TODO: Implement beta access check
  // For MVP: Just redirect to /beta if not on public paths
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

**Note:** Full middleware implementation requires server-side Supabase client to check `check_beta_access()` RPC. This is a placeholder.

---

## C) Admin Invite Management

### Admin Page: `/admin/invites`

**Component:** `app/admin/invites/page.tsx`

**Features:**
- List all beta invites (pending, used, revoked)
- Generate new invite codes
- Revoke invites
- Set expiration dates
- Assign to specific emails/usernames
- View usage statistics

**UI:**
- Table of invites (code, email, status, created_at, used_at, expires_at)
- "Generate Invite" button
- "Revoke" button (for pending invites)
- Filters (status, date range)

**RPC Functions Needed:**

**`generate_beta_invite`**
```sql
CREATE OR REPLACE FUNCTION generate_beta_invite(
  p_email VARCHAR(255) DEFAULT NULL,
  p_username VARCHAR(50) DEFAULT NULL,
  p_expires_in_days INTEGER DEFAULT 30,
  p_created_by UUID
) RETURNS JSONB AS $$
DECLARE
  v_invite_code VARCHAR(50);
BEGIN
  -- Generate unique invite code (8 characters, alphanumeric)
  LOOP
    v_invite_code := upper(substring(md5(random()::text) from 1 for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM beta_invites WHERE invite_code = v_invite_code);
  END LOOP;
  
  -- Insert invite
  INSERT INTO beta_invites (invite_code, email, username, expires_at, created_by)
  VALUES (
    v_invite_code,
    p_email,
    p_username,
    NOW() + (p_expires_in_days || ' days')::INTERVAL,
    p_created_by
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'invite_code', v_invite_code,
    'expires_at', NOW() + (p_expires_in_days || ' days')::INTERVAL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**`revoke_beta_invite`**
```sql
CREATE OR REPLACE FUNCTION revoke_beta_invite(
  p_invite_code VARCHAR(50)
) RETURNS JSONB AS $$
BEGIN
  UPDATE beta_invites
  SET status = 'revoked',
      updated_at = NOW()
  WHERE invite_code = p_invite_code
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found or already used');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Invite revoked');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Files to Create:**
- `app/admin/invites/page.tsx`
- `components/AdminInviteManager.tsx` (optional: reusable component)

**Access Control:**
- Only users with `profiles.is_admin = true` can access `/admin/*` routes
- Add auth check in page component

---

## D) Launch Checklist

### Pre-Beta (Internal Testing)

**Phase: Seed Mode Testing**
- [ ] All UI components render correctly
- [ ] No console errors
- [ ] Responsive design works (mobile + desktop)
- [ ] All mock data displays properly
- [ ] Navigation works
- [ ] Forms validate correctly

**Phase: Database Setup**
- [ ] All SQL blocks run successfully
- [ ] RLS policies work correctly
- [ ] RPC functions tested
- [ ] Indexes created
- [ ] Triggers work

**Phase: Auth Testing**
- [ ] Sign up works
- [ ] Sign in works
- [ ] Session persists
- [ ] Protected routes redirect correctly
- [ ] Profile creation works

### Beta Testing (Invite-Only)

**Phase: Beta Invites**
- [ ] `beta_invites` table created
- [ ] RPC functions work
- [ ] `/beta` page works
- [ ] Invite redemption works
- [ ] Middleware enforces access (if implemented)

**Phase: Real Data Testing**
- [ ] Profile CRUD works
- [ ] Storage uploads work
- [ ] Chat works (if Phase 2 complete)
- [ ] Grid layout persists (if Phase 3 complete)
- [ ] Filters work (if Phase 3 complete)

**Phase: Performance Testing**
- [ ] Page load times acceptable
- [ ] Database queries optimized
- [ ] Realtime subscriptions don't leak
- [ ] No memory leaks

**Phase: User Acceptance**
- [ ] Test with 5-10 trusted users
- [ ] Collect feedback
- [ ] Fix critical bugs
- [ ] Test gifting + conversion (if Phase 5 complete)
- [ ] Test video streaming (if Phase 4 complete)

### Pre-Launch (Public Ready)

**Phase: Security Audit**
- [ ] RLS policies reviewed
- [ ] API endpoints secured
- [ ] No sensitive data exposed
- [ ] Rate limiting considered
- [ ] SQL injection prevention verified

**Phase: Monetization (If Phase 5 Complete)**
- [ ] Stripe integration tested
- [ ] Coin purchases work
- [ ] Gifting works
- [ ] Diamond conversion works
- [ ] Withdrawals work (if implemented)
- [ ] Revenue tracking accurate

**Phase: Video Streaming (If Phase 4 Complete)**
- [ ] LiveKit server running
- [ ] Token minting works
- [ ] Webhook receives events
- [ ] Video quality acceptable
- [ ] Demand-based publishing works
- [ ] Multiple concurrent streams work

**Phase: Monitoring**
- [ ] Error tracking set up (e.g., Sentry)
- [ ] Analytics set up (e.g., Google Analytics)
- [ ] Database monitoring enabled
- [ ] Uptime monitoring enabled

**Phase: Documentation**
- [ ] User guide written
- [ ] Streamer guide written
- [ ] FAQ page created
- [ ] Terms of Service
- [ ] Privacy Policy

### Launch Day

**Phase: Final Checks**
- [ ] `NEXT_PUBLIC_APP_MODE=live` set
- [ ] All environment variables set
- [ ] Database backups enabled
- [ ] Monitoring alerts configured
- [ ] Support channels ready

**Phase: Soft Launch**
- [ ] Open to public (no invites)
- [ ] Monitor error rates
- [ ] Monitor performance
- [ ] Collect user feedback
- [ ] Fix critical issues quickly

**Phase: Full Launch**
- [ ] Marketing campaign
- [ ] Social media announcements
- [ ] Press release (if applicable)
- [ ] Community engagement

---

## Testing Scenarios

### Scenario 1: New User Journey (Beta)

1. User receives invite code via email
2. User visits `/beta`
3. User enters invite code
4. User clicks "Redeem Invite"
5. User is redirected to `/signup`
6. User creates account
7. Invite is automatically redeemed
8. User gains beta access
9. User can access `/live`, `/settings/profile`, etc.

### Scenario 2: Existing User Journey (Beta)

1. User already has account
2. User receives invite code
3. User visits `/beta`
4. User enters invite code
5. User clicks "Redeem Invite"
6. User is redirected to `/login`
7. User signs in
8. Invite is automatically redeemed
9. User gains beta access

### Scenario 3: Admin Invite Management

1. Admin visits `/admin/invites`
2. Admin clicks "Generate Invite"
3. Admin optionally sets email/username/expiration
4. System generates unique invite code
5. Admin copies code and shares with user
6. User redeems invite (see Scenario 1 or 2)

### Scenario 4: Beta Access Enforcement

1. User without beta access visits `/live`
2. Middleware checks `check_beta_access()` RPC
3. User is redirected to `/beta`
4. User sees "Request Invite" or "Enter Invite Code"
5. User cannot access protected pages until invite redeemed

---

## Rollout Strategy

### Week 1: Internal Testing
- Seed mode testing
- Database setup
- Auth testing
- Fix critical bugs

### Week 2: Alpha Testing (5-10 Users)
- Generate invites for trusted users
- Test real data flows
- Collect feedback
- Fix bugs

### Week 3: Beta Testing (50-100 Users)
- Generate more invites
- Test performance at scale
- Test monetization (if ready)
- Test video streaming (if ready)
- Collect feedback

### Week 4: Pre-Launch
- Security audit
- Performance optimization
- Documentation
- Marketing preparation

### Week 5: Launch
- Public launch
- Monitor closely
- Fix issues quickly
- Iterate based on feedback

---

**Next Steps:** Implement beta invite system (database + UI) before opening beta testing.

