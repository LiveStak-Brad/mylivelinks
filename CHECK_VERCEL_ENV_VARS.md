# Check What's Actually in Vercel

## Step 1: Check Vercel Function Logs

After the latest deploy completes (about 2 minutes), check what credentials are actually being used:

1. Go to Vercel → Your Project → Deployments
2. Click on the **latest deployment** (should be deploying now)
3. Go to **Functions** tab
4. Click on `/api/livekit/token`
5. Look for the log: **"LiveKit credentials check:"**

It will show:
- `urlFull` - The exact URL being used
- `apiKeyPrefix` - First 15 characters of API key
- `apiSecretPrefix` - First 15 characters of API secret

## Step 2: Compare with Your `.env.local`

Open your `.env.local` file and compare:

1. **LIVEKIT_URL** - Does it match `urlFull` in Vercel logs?
2. **LIVEKIT_API_KEY** - Do the first 15 characters match `apiKeyPrefix`?
3. **LIVEKIT_API_SECRET** - Do the first 15 characters match `apiSecretPrefix`?

## Step 3: Check Which Environment Vercel Uses

Vercel uses different environments:
- **Production** - Your main domain (mylivelinks.com)
- **Preview** - Preview deployments
- **Development** - Local development

**Check:**
1. Go to Vercel → Settings → Environment Variables
2. For each LiveKit variable, click to edit
3. **Make sure Production is checked** (this is what your live site uses)

## Common Issues:

### Issue 1: Variables Only Set for Preview/Development
- **Symptom:** Works locally but not on live site
- **Fix:** Check the **Production** box for all 3 variables

### Issue 2: Extra Spaces
- **Symptom:** Values look right but don't work
- **Fix:** Copy values again, make sure no spaces before/after

### Issue 3: Values Truncated
- **Symptom:** API key/secret shorter than expected
- **Fix:** Make sure you copied the complete value

## What to Do:

1. **Wait for current deploy** (about 2 minutes)
2. **Check Vercel function logs** - See what credentials are actually being used
3. **Compare with `.env.local`** - Do they match?
4. **If they don't match:** Update Vercel with exact values from `.env.local`
5. **If they do match:** The issue might be something else (check next steps)

## If Values Match But Still 401:

Then the issue might be:
- LiveKit project changed
- API key was revoked/regenerated
- URL format issue

But first, let's verify what's actually in Vercel vs what's in `.env.local`.



