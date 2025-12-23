# Deployment Guide for MyLiveLinks

## Quick Deploy to Vercel (Recommended)

### Prerequisites
1. GitHub account
2. Vercel account (free tier works)
3. Your `.env.local` file with all environment variables

### Steps:

1. **Push to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel**:
   - Go to https://vercel.com
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel will auto-detect Next.js

3. **Add Environment Variables in Vercel**:
   - Go to Project Settings → Environment Variables
   - Add all variables from your `.env.local`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `LIVEKIT_URL`
     - `LIVEKIT_API_KEY`
     - `LIVEKIT_API_SECRET`
     - `NEXT_PUBLIC_LIVEKIT_URL` (if different from LIVEKIT_URL)

4. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete
   - Your site will be live at `your-project.vercel.app`

### Important Notes:
- **Never commit `.env.local`** - It's already in `.gitignore`
- Vercel will automatically rebuild on every git push
- Use Vercel's environment variables, not `.env.local` for production

## Alternative: Deploy to Netlify

1. Go to https://netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repo
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Add environment variables in Site Settings → Environment Variables
6. Deploy

## Post-Deployment Checklist

- [ ] Test "Go Live" functionality
- [ ] Test viewer joining streams
- [ ] Verify LiveKit connections work
- [ ] Test chat functionality
- [ ] Test gift sending
- [ ] Verify authentication works
- [ ] Check mobile responsiveness
- [ ] Test with multiple users simultaneously

## Environment Variables Needed

Make sure these are set in your deployment platform:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
LIVEKIT_URL=your_livekit_url
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
NEXT_PUBLIC_LIVEKIT_URL=your_livekit_url (usually same as LIVEKIT_URL)
```

## Troubleshooting

- **Build fails**: Check that all dependencies are in `package.json`
- **Environment variables not working**: Make sure they're set in Vercel/Netlify dashboard, not just `.env.local`
- **LiveKit not connecting**: Verify `LIVEKIT_URL` is accessible from the internet (not localhost)
- **Supabase errors**: Check that RLS policies allow public access where needed

