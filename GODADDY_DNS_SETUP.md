# GoDaddy DNS Setup Guide for MyLiveLinks

## Overview

You have two parts to set up:
1. **Hosting** - Where your app runs (server/VPS)
2. **DNS** - Point your GoDaddy domain to your hosting

---

## Step 1: Get Hosting

You need a server to run your Next.js app. Here are your options:

### Option A: Cloud Platform (Easiest - Recommended)

**Railway** (Recommended - Free tier available):
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub"
4. Select `LiveStak-Brad/mylivelinks`
5. Add environment variables (see Step 3)
6. Railway gives you a URL like: `your-app.up.railway.app`
7. **Note this URL** - You'll use it in Step 2

**Render** (Free tier available):
1. Go to https://render.com
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect GitHub repo: `LiveStak-Brad/mylivelinks`
5. Settings:
   - Build Command: `npm run build`
   - Start Command: `npm start`
6. Add environment variables
7. Render gives you a URL like: `your-app.onrender.com`
8. **Note this URL** - You'll use it in Step 2

**DigitalOcean App Platform**:
1. Go to https://www.digitalocean.com
2. Create account
3. Create → App Platform
4. Connect GitHub repo
5. Configure build/start commands
6. Add environment variables
7. DigitalOcean gives you a URL like: `your-app.ondigitalocean.app`
8. **Note this URL** - You'll use it in Step 2

### Option B: VPS (More Control)

**DigitalOcean Droplet**:
1. Go to https://www.digitalocean.com
2. Create → Droplet
3. Choose Ubuntu 22.04
4. Choose size ($6/month minimum)
5. Create droplet
6. **Note the IP address** - You'll use it in Step 2

**Linode**:
1. Go to https://www.linode.com
2. Create → Linode
3. Choose Ubuntu 22.04
4. Choose size
5. Create linode
6. **Note the IP address** - You'll use it in Step 2

---

## Step 2: Configure GoDaddy DNS

### If Using Cloud Platform (Railway/Render/DigitalOcean App):

1. **Log into GoDaddy:**
   - Go to https://www.godaddy.com
   - Click "My Products"
   - Find your domain
   - Click "DNS" or "Manage DNS"

2. **Find DNS Records:**
   - Look for "Records" section
   - You'll see A, CNAME, etc. records

3. **Add/Edit Records:**

   **For Root Domain (mylivelinks.com):**
   - Find the **A record** for `@` or your domain name
   - If it exists, **edit** it
   - If not, **add** a new A record:
     - **Type:** A
     - **Name:** @ (or leave blank, or your domain name)
     - **Value:** Get this from your hosting provider:
       - **Railway:** They'll give you an IP or use CNAME (see below)
       - **Render:** Use their IP (check their docs) or CNAME
       - **DigitalOcean App:** Use their IP or CNAME
     - **TTL:** 600 (or default)

   **OR Use CNAME (Easier):**
   - **Type:** CNAME
   - **Name:** @ (or leave blank)
   - **Value:** Your hosting URL (e.g., `your-app.up.railway.app`)
   - **TTL:** 600

   **For WWW Subdomain (www.mylivelinks.com):**
   - Find the **CNAME record** for `www`
   - **Type:** CNAME
   - **Name:** www
   - **Value:** Your hosting URL (e.g., `your-app.up.railway.app`)
   - **TTL:** 600

4. **Save Changes:**
   - Click "Save" or "Add Record"
   - DNS changes take 5 minutes to 48 hours (usually 5-30 minutes)

### If Using VPS (DigitalOcean Droplet/Linode):

1. **Log into GoDaddy** (same as above)

2. **Add A Records:**

   **For Root Domain:**
   - **Type:** A
   - **Name:** @ (or leave blank)
   - **Value:** Your VPS IP address (e.g., `157.230.123.45`)
   - **TTL:** 600

   **For WWW Subdomain:**
   - **Type:** A
   - **Name:** www
   - **Value:** Same VPS IP address
   - **TTL:** 600

3. **Save Changes**

---

## Step 3: Add Environment Variables to Hosting

### If Using Cloud Platform:

**Railway:**
1. Go to your project
2. Click "Variables" tab
3. Add each variable:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LIVEKIT_URL`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
   - `NEXT_PUBLIC_DISABLE_AUTH` (set to `false`)

**Render:**
1. Go to your service
2. Click "Environment" tab
3. Add each variable (same as above)

**DigitalOcean App Platform:**
1. Go to your app
2. Click "Settings" → "App-Level Environment Variables"
3. Add each variable (same as above)

### If Using VPS:

1. SSH into your VPS:
```bash
ssh root@your-vps-ip
```

2. Clone your repo:
```bash
git clone https://github.com/LiveStak-Brad/mylivelinks.git
cd mylivelinks
```

3. Create `.env.local`:
```bash
nano .env.local
```

4. Paste your environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
LIVEKIT_URL=your_livekit_url
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
NEXT_PUBLIC_DISABLE_AUTH=false
```

5. Save (Ctrl+X, then Y, then Enter)

6. Install and build:
```bash
npm install --production
npm run build
```

7. Install PM2:
```bash
npm install -g pm2
```

8. Start the app:
```bash
pm2 start npm --name "mylivelinks" -- start
pm2 save
pm2 startup  # Follow instructions
```

9. Set up Nginx (see Step 4)

---

## Step 4: Set Up Nginx (VPS Only)

If you're using a VPS, you need Nginx to serve your app:

1. **Install Nginx:**
```bash
sudo apt update
sudo apt install nginx
```

2. **Create Config File:**
```bash
sudo nano /etc/nginx/sites-available/mylivelinks
```

3. **Add This Configuration:**
```nginx
server {
    listen 80;
    server_name mylivelinks.com www.mylivelinks.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. **Enable Site:**
```bash
sudo ln -s /etc/nginx/sites-available/mylivelinks /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

5. **Set Up SSL:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d mylivelinks.com -d www.mylivelinks.com
```

---

## Step 5: Verify DNS Propagation

1. **Check DNS Propagation:**
   - Go to https://www.whatsmydns.net
   - Enter your domain
   - Check if it shows your hosting IP/URL

2. **Test Your Domain:**
   - Wait 5-30 minutes after DNS changes
   - Visit `http://yourdomain.com` in browser
   - You should see your app (or login page)

---

## Quick Reference: GoDaddy DNS Settings

### Where to Find DNS Settings:
1. Go to https://www.godaddy.com
2. Click "My Products"
3. Find your domain
4. Click "DNS" or "Manage DNS"
5. Look for "Records" section

### Common Record Types:

**A Record** - Points to IP address
- Type: A
- Name: @ (or blank for root domain)
- Value: IP address (e.g., `157.230.123.45`)

**CNAME Record** - Points to another domain
- Type: CNAME
- Name: www (or @ if supported)
- Value: Hosting URL (e.g., `your-app.up.railway.app`)

---

## Troubleshooting

### DNS Not Working:
- Wait 30 minutes (DNS propagation takes time)
- Check DNS propagation: https://www.whatsmydns.net
- Verify records in GoDaddy match your hosting

### Site Shows "Default Nginx Page":
- Nginx is working, but not pointing to your app
- Check Nginx config file
- Restart Nginx: `sudo systemctl restart nginx`

### Site Shows "502 Bad Gateway":
- Your app isn't running
- Check PM2: `pm2 list`
- Check logs: `pm2 logs mylivelinks`
- Restart: `pm2 restart mylivelinks`

### Can't Access Site:
- Check firewall allows ports 80 and 443
- Verify DNS records are correct
- Check hosting provider status page

---

## Summary Checklist

- [ ] Chosen hosting provider (Railway/Render/VPS)
- [ ] Deployed app to hosting
- [ ] Added all environment variables
- [ ] Got hosting URL or IP address
- [ ] Logged into GoDaddy DNS
- [ ] Added/edited A or CNAME records
- [ ] Saved DNS changes
- [ ] Waited 5-30 minutes for DNS propagation
- [ ] Tested domain in browser
- [ ] Set up SSL/HTTPS (if using VPS)

---

## Need Help?

- **GoDaddy Support:** https://www.godaddy.com/help
- **Railway Docs:** https://docs.railway.app
- **Render Docs:** https://render.com/docs
- **DigitalOcean Docs:** https://docs.digitalocean.com









