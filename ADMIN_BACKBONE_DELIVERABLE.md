# Admin Backbone Foundation - Deliverable

## Summary

Created the foundational admin audit logging system with authentication gates and standardized response patterns for MyLiveLinks admin API routes.

## Files Changed

### 1. SQL Migration
- **`supabase/migrations/20251229_admin_audit_foundation.sql`** (NEW)
  - Created `admin_audit_logs` table with proper schema
  - Added indexes for performance (created_at, actor_profile_id, target_type/id)
  - Implemented RLS policies (admin-only read/write)
  - Created `admin_log_action()` RPC for secure audit logging

### 2. API Helper Library
- **`lib/admin.ts`** (MODIFIED)
  - Updated `requireAdmin()` to return `{ user, profileId }`
  - Added `adminJson()` - standard success response wrapper
  - Added `adminError()` - standard error response wrapper
  - Added `generateReqId()` - unique request ID generator
  - Added TypeScript interfaces: `AdminSuccessResponse<T>`, `AdminErrorResponse`

### 3. Test Admin Routes
- **`app/api/admin/health/route.ts`** (NEW)
  - GET endpoint for admin authentication testing
  - Returns 200 with admin info for admins
  - Returns 401/403 for non-admins
  
- **`app/api/admin/audit-test/route.ts`** (NEW)
  - POST endpoint to test audit logging
  - Creates audit log entry via `admin_log_action` RPC
  - Returns log ID and confirmation

---

## Migration SQL (Copy/Paste)

```sql
-- Admin Audit Foundation
-- Creates admin_audit_logs table with RLS and helper RPC for logging admin actions

BEGIN;

-- Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at 
  ON public.admin_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_created 
  ON public.admin_audit_logs(actor_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target 
  ON public.admin_audit_logs(target_type, target_id);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can read/write audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs" 
  ON public.admin_audit_logs 
  FOR SELECT 
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs" 
  ON public.admin_audit_logs 
  FOR INSERT 
  WITH CHECK (public.is_admin(auth.uid()) AND actor_profile_id = auth.uid());

-- RPC: Log admin action (security definer)
-- This function allows admin API routes to log actions programmatically
CREATE OR REPLACE FUNCTION public.admin_log_action(
  p_action text,
  p_target_type text,
  p_target_id text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Insert audit log entry
  INSERT INTO public.admin_audit_logs (
    actor_profile_id,
    action,
    target_type,
    target_id,
    metadata
  ) VALUES (
    auth.uid(),
    p_action,
    p_target_type,
    p_target_id,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Revoke public access, grant to authenticated users
REVOKE ALL ON FUNCTION public.admin_log_action(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_log_action(text, text, text, jsonb) TO authenticated;

COMMIT;
```

---

## Verification Steps

### Step 1: Apply Migration

**PowerShell (Windows):**
```powershell
cd c:\mylivelinks.com
.\apply-migrations.ps1
```

Or manually via Supabase Dashboard:
1. Go to Supabase Dashboard → SQL Editor
2. Copy/paste the migration SQL above
3. Execute

### Step 2: Verify Table Structure

**SQL Query:**
```sql
-- Verify table exists with correct schema
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'admin_audit_logs'
ORDER BY ordinal_position;

-- Verify indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'admin_audit_logs';

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'admin_audit_logs';

-- Verify RPC function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'admin_log_action';
```

### Step 3: Test Health Endpoint (Admin User)

**curl (with admin auth token):**
```bash
curl -X GET https://your-domain.com/api/admin/health \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "ok": true,
  "reqId": "uuid-here",
  "data": {
    "status": "ok",
    "timestamp": "2025-12-29T...",
    "admin": {
      "userId": "uuid",
      "profileId": "uuid",
      "email": "admin@example.com"
    }
  }
}
```

### Step 4: Test Health Endpoint (Non-Admin)

**curl (no auth or non-admin token):**
```bash
curl -X GET https://your-domain.com/api/admin/health \
  -H "Content-Type: application/json"
```

**Expected Response (401):**
```json
{
  "ok": false,
  "reqId": "uuid-here",
  "error": "Unauthorized"
}
```

### Step 5: Test Audit Logging

**curl (with admin auth token):**
```bash
curl -X POST https://your-domain.com/api/admin/audit-test \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"testField": "testValue"}'
```

**Expected Response (200):**
```json
{
  "ok": true,
  "reqId": "uuid-here",
  "data": {
    "message": "Audit log created successfully",
    "logId": "uuid-log-id",
    "actor": {
      "userId": "uuid",
      "profileId": "uuid"
    },
    "action": "test_audit_log",
    "targetType": "test",
    "targetId": "uuid-here"
  }
}
```

### Step 6: Verify Audit Log in Database

**SQL Query:**
```sql
-- View audit logs
SELECT 
  id,
  actor_profile_id,
  action,
  target_type,
  target_id,
  metadata,
  created_at
FROM public.admin_audit_logs
ORDER BY created_at DESC
LIMIT 10;

-- Join with profiles to see admin username
SELECT 
  aal.id,
  p.username AS admin_username,
  aal.action,
  aal.target_type,
  aal.target_id,
  aal.metadata,
  aal.created_at
FROM public.admin_audit_logs aal
JOIN public.profiles p ON p.id = aal.actor_profile_id
ORDER BY aal.created_at DESC
LIMIT 10;
```

### Step 7: Test Non-Admin Access to Audit RPC

**SQL (as non-admin user):**
```sql
-- This should fail with 'forbidden' error
SELECT admin_log_action(
  'unauthorized_test',
  'test',
  'test-id',
  '{}'::jsonb
);
```

---

## Usage Pattern for Future Admin Routes

```typescript
import { NextRequest } from 'next/server';
import { requireAdmin, adminJson, adminError, generateReqId } from '@/lib/admin';
import { createRouteHandlerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const reqId = generateReqId();

  try {
    const { user, profileId } = await requireAdmin(request);
    const supabase = createRouteHandlerClient(request);

    // Your admin logic here
    // ...

    // Log the admin action
    await supabase.rpc('admin_log_action', {
      p_action: 'your_action_name',
      p_target_type: 'user', // or 'post', 'stream', etc.
      p_target_id: 'target-uuid',
      p_metadata: { 
        someField: 'value',
        timestamp: new Date().toISOString()
      },
    });

    return adminJson(reqId, { success: true, result: 'data' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'UNAUTHORIZED') return adminError(reqId, 'Unauthorized', 401);
    if (msg === 'FORBIDDEN') return adminError(reqId, 'Forbidden', 403);
    console.error('[API /admin/your-route] Exception:', err);
    return adminError(reqId, 'Internal server error', 500);
  }
}
```

---

## Commit Message

```
feat(admin): add audit log + requireAdmin foundation

- Created admin_audit_logs table with RLS policies
- Added admin_log_action RPC for secure audit logging
- Standardized requireAdmin helper (returns { user, profileId })
- Added adminJson/adminError response wrappers with reqId
- Created /api/admin/health test endpoint (auth verification)
- Created /api/admin/audit-test endpoint (audit log testing)
- All admin writes now have audit trail capability
```

---

## Notes

1. **No UI Changes:** All changes are backend/data layer only
2. **Backward Compatible:** Existing admin routes continue to work (requireAdmin signature extended, not broken)
3. **Security:** 
   - RLS enforces admin-only access to audit logs
   - RPC validates admin role before inserting logs
   - All functions use SECURITY DEFINER with proper authorization checks
4. **Performance:** 
   - Indexes on created_at (DESC) for recent logs
   - Composite index on (actor_profile_id, created_at) for per-admin queries
   - Index on (target_type, target_id) for target lookup
5. **Ready for Production:** Can be applied to production database safely (uses IF NOT EXISTS, DROP IF EXISTS)


