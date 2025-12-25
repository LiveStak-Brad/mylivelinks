# SSL Certificate Warning Fix: iOS/Instagram In-App Browser

## 🔴 ROOT CAUSE

**Issue:** SSL certificate warning "site's security certificate is not trusted" on `https://www.mylivelinks.com` in iOS/Instagram in-app browsers.

**Root Cause:** Domain configuration mismatch between apex (`mylivelinks.com`) and www subdomain (`www.mylivelinks.com`).

---

## 🔍 CURRENT STATE ANALYSIS

### 1. **Hosting Stack: Vercel**
- ✅ Deployed on Vercel (confirmed by `vercel.json`)
- ✅ Vercel automatically issues SSL certificates via Let's Encrypt
- ✅ Vercel supports both apex and www domains

### 2. **Canonical Domain Usage in Code**
Analysis of hardcoded URLs in the codebase:

**Apex domain (`mylivelinks.com`):**
- ✅ Used in 75 locations across the codebase
- ✅ Profile metadata: `https://mylivelinks.com/${username}`
- ✅ OG images: `https://mylivelinks.com/api/og?...`
- ✅ Mobile API endpoints: `https://mylivelinks.com/api/livekit/token`
- ✅ All documentation references apex

**WWW subdomain (`www.mylivelinks.com`):**
- ⚠️ Only mentioned in DNS setup documentation
- ⚠️ Not used in actual code/links
- ⚠️ No redirect configuration in Next.js

### 3. **Current Redirect Setup**
- ❌ **No Next.js middleware redirect** from www → apex
- ❌ **No `vercel.json` redirect configuration**
- ✅ Middleware exists but only handles Supabase auth, not domain redirects

---

## 🎯 THE PROBLEM

**Scenario:**
1. User shares profile link: `https://mylivelinks.com/username` (apex)
2. iOS/Instagram opens link in in-app browser
3. Some DNS/network configurations resolve to `www.mylivelinks.com`
4. Vercel serves the site on www subdomain
5. **But SSL cert might be issued for apex only, or DNS is misconfigured**
6. Browser shows "certificate not trusted" warning

**Why it happens:**
- Vercel needs BOTH domains explicitly added in Vercel Dashboard → Domains
- If only apex is added, www will fail SSL validation
- GoDaddy DNS must have correct CNAME records for BOTH

---

## ✅ EXACT FIX STEPS

### **Step 1: Verify Vercel Domain Configuration**

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Click your project (`mylivelinks`)
   - Settings → Domains

2. **Check what domains are added:**
   - ✅ Should have: `mylivelinks.com` (apex)
   - ✅ Should have: `www.mylivelinks.com` (www)
   - ⚠️ **If www is missing, ADD IT NOW**

3. **Add www domain if missing:**
   - Click "Add Domain"
   - Enter: `www.mylivelinks.com`
   - Click "Add"
   - Vercel will show DNS instructions

4. **Set redirect preference:**
   - In Vercel Domains settings
   - Find `www.mylivelinks.com`
   - Click "Edit"
   - **Set redirect: www → mylivelinks.com (301 redirect)**
   - This ensures all www traffic redirects to apex

---

### **Step 2: Verify GoDaddy DNS Configuration**

1. **Go to GoDaddy:**
   - https://www.godaddy.com
   - My Products → Your Domain → DNS Management

2. **Verify A Records for Apex:**
   ```
   Type: A
   Name: @ (or blank)
   Value: 76.76.21.21
   TTL: 600

   Type: A
   Name: @ (or blank)
   Value: 76.223.126.88
   TTL: 600
   ```

3. **Verify CNAME Record for WWW:**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 600
   ```

4. **If CNAME is wrong or missing:**
   - Delete any A records for `www`
   - Add/Edit CNAME:
     - Type: CNAME
     - Name: www
     - Value: `cname.vercel-dns.com` (or the exact value Vercel shows)
   - Save changes

---

### **Step 3: Add Next.js Middleware Redirect (Code Fix)**

Add www → apex redirect in `middleware.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // 1. Handle www → apex redirect
  const hostname = request.headers.get('host') || '';
  if (hostname.startsWith('www.')) {
    const url = request.nextUrl.clone();
    url.host = hostname.replace('www.', '');
    return NextResponse.redirect(url, { status: 301 });
  }

  // 2. Handle Supabase auth (existing code)
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresh session if expired
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

### **Step 4: Add Vercel Configuration (Optional Fallback)**

Create/update `vercel.json` to add redirect at platform level:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "public": true,
  "redirects": [
    {
      "source": "/:path*",
      "has": [
        {
          "type": "host",
          "value": "www.mylivelinks.com"
        }
      ],
      "destination": "https://mylivelinks.com/:path*",
      "permanent": true
    }
  ]
}
```

---

## 🔄 DEPLOYMENT & VERIFICATION

### After Making Changes:

1. **Wait for DNS propagation** (if DNS changed):
   - Usually 5-30 minutes
   - Check: https://www.whatsmydns.net

2. **Wait for Vercel SSL certificate**:
   - Vercel automatically issues SSL for new domains
   - Takes 1-5 minutes after DNS is correct
   - Check in Vercel Dashboard → Domains (green checkmark)

3. **Test both domains:**
   ```bash
   curl -I https://mylivelinks.com
   # Should return 200 OK

   curl -I https://www.mylivelinks.com
   # Should return 301 redirect to mylivelinks.com
   ```

4. **Test in iOS/Instagram browser:**
   - Share a link on Instagram
   - Click it in-app
   - Should open without SSL warning
   - Should redirect from www to apex if entered

---

## 📊 EXPECTED BEHAVIOR AFTER FIX

| URL | Behavior | SSL Status |
|-----|----------|------------|
| `https://mylivelinks.com` | ✅ Serves site | ✅ Valid cert |
| `https://www.mylivelinks.com` | ✅ 301 → apex | ✅ Valid cert |
| `http://mylivelinks.com` | ✅ 301 → https | ✅ Valid cert |
| `http://www.mylivelinks.com` | ✅ 301 → https apex | ✅ Valid cert |

---

## 🎯 SUMMARY

**Root Cause:** 
- www subdomain not properly configured in Vercel
- Missing redirect from www → apex
- Possible DNS CNAME misconfiguration

**The Fix (3 parts):**
1. **Vercel:** Add www domain + configure redirect to apex
2. **GoDaddy DNS:** Ensure CNAME for www points to `cname.vercel-dns.com`
3. **Code:** Add middleware redirect as backup (optional but recommended)

**Canonical Domain:** `mylivelinks.com` (apex, no www)

**Hosting:** Vercel (automatic SSL, CDN, deployments)

---

## 🚨 CRITICAL ACTIONS

**Do this NOW:**
1. [ ] Open Vercel Dashboard → mylivelinks → Settings → Domains
2. [ ] Verify both `mylivelinks.com` AND `www.mylivelinks.com` are listed
3. [ ] If www is missing, add it and set redirect to apex
4. [ ] Check GoDaddy DNS for correct CNAME record
5. [ ] Deploy middleware fix (optional but recommended)
6. [ ] Wait 10-30 minutes for SSL cert + DNS
7. [ ] Test in iOS/Instagram browser

**This is NOT a code bug - it's a DNS/domain configuration issue at the hosting level.**

