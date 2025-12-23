# Go Live Checklist - MyLiveLinks

## Step 1: Verify Vercel Project is Public

### Check Project Settings:
1. Go to Vercel Dashboard → Your Project
2. Click **Settings** → **General**
3. Verify:
   - ✅ Project is **NOT** on a Team plan (should be Personal)
   - ✅ No "Password Protection" enabled
   - ✅ No "Deployment Protection" restrictions
   - ✅ Project visibility is **Public**

### If Project is on Team Plan:
- Click your profile icon (top right) → **Switch to Personal Account**
- Or create a new project on your personal account:
  1. Click "Add New..." → "Project"
  2. Import from GitHub: `LiveStak-Brad/mylivelinks`
  3. Configure environment variables (see Step 2)
  4. Deploy

---

## Step 2: Verify All Environment Variables in Vercel

Go to **Project Settings** → **Environment Variables** and ensure these are set for **Production**, **Preview**, and **Development**:

### Required Variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
LIVEKIT_URL=your_livekit_url
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
```

### Optional (for testing):
```
NEXT_PUBLIC_DISABLE_AUTH=false
```

**Important:** Make sure each variable is added to **all three environments** (Production, Preview, Development) by selecting the checkboxes.

---

## Step 3: Verify Deployment URL

### Production URL Format:
```
https://your-project-name.vercel.app
```

**NOT:**
- ❌ `https://vercel.com/dashboard/...` (dashboard link)
- ❌ `https://your-project-git-branch-username.vercel.app` (preview URL)

### How to Find Your Production URL:
1. Go to Vercel Dashboard → Your Project
2. Click **Deployments** tab
3. Find the deployment with **Production** badge (green)
4. Click the **Visit** button or copy the URL
5. The URL should end in `.vercel.app`

---

## Step 4: Test Public Access

### Test in Incognito/Private Window:
1. Open an **incognito/private browser window**
2. Navigate to your production URL
3. You should see:
   - ✅ Login page (if auth enabled)
   - ✅ No Vercel login prompt
   - ✅ No payment prompts
   - ✅ Site loads normally

### If You See Vercel Login/Payment:
- Project is likely on Team plan or has restrictions
- Follow Step 1 to fix

---

## Step 5: Verify Build Success

1. Go to Vercel Dashboard → **Deployments**
2. Check latest deployment:
   - ✅ Status: **Ready** (green)
   - ✅ No build errors
   - ✅ Build logs show success

### If Build Fails:
- Check build logs for errors
- Verify all environment variables are set
- Ensure `package.json` has all dependencies

---

## Step 6: Test Core Features

After deployment, test these features:

### Authentication:
- [ ] Sign up works
- [ ] Login works
- [ ] Profile creation works

### Live Streaming:
- [ ] "Go Live" button appears
- [ ] Device selection works
- [ ] Camera preview shows
- [ ] Can start streaming
- [ ] Video appears in slot 1

### Viewing:
- [ ] Can view other streams
- [ ] Grid layout loads
- [ ] Chat works
- [ ] Gifts work

---

## Step 7: Share the Correct URL

### ✅ DO Share:
```
https://your-project-name.vercel.app
```

### ❌ DON'T Share:
- Vercel dashboard links
- Preview deployment URLs
- Localhost URLs

---

## Troubleshooting

### Issue: "Vercel login required" or "$20 payment"
**Solution:** Project is on Team plan or private. Move to Personal account (Step 1).

### Issue: "Application error"
**Solution:** 
- Check Vercel deployment logs
- Verify environment variables are set
- Check browser console for errors

### Issue: "LiveKit credentials not configured"
**Solution:** Add `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` to Vercel environment variables.

### Issue: "Supabase error"
**Solution:** Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel environment variables.

---

## Quick Deploy Command (if needed)

If you need to trigger a new deployment:

```bash
git add .
git commit -m "Production deployment"
git push origin main
```

Vercel will automatically deploy on push.

---

## Alternative: Deploy to Your Own Domain

If Vercel continues to have issues:

1. **Netlify** (free alternative):
   - Go to netlify.com
   - Import from GitHub
   - Add environment variables
   - Deploy

2. **Your Own Server**:
   - Build: `npm run build`
   - Start: `npm start`
   - Configure reverse proxy (nginx)
   - Point domain to server

---

## Support

If issues persist:
1. Check Vercel deployment logs
2. Check browser console errors
3. Verify all environment variables
4. Test in incognito window
5. Ensure project is on Personal account (not Team)

