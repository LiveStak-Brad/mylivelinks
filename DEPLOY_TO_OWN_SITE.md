# Deploy MyLiveLinks to Your Own Website

## Quick Start: Deploy to Your Server

### Step 1: Build for Production

On your local machine or server:

```bash
# Install dependencies
npm install

# Build the production version
npm run build
```

This creates an optimized production build in the `.next` folder.

### Step 2: Set Up Environment Variables

Create `.env.local` on your server with these variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
LIVEKIT_URL=your_livekit_url
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
NEXT_PUBLIC_DISABLE_AUTH=false
```

### Step 3: Start the Application

```bash
# Start in production mode
npm start
```

The app will run on `http://localhost:3000`

---

## Option 1: Deploy to VPS (Recommended)

### Prerequisites
- VPS with Ubuntu/Debian (or similar Linux)
- Node.js 18+ installed
- Domain name pointing to your server IP

### Installation Steps

1. **SSH into your server:**
```bash
ssh user@your-server-ip
```

2. **Install Node.js (if not installed):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **Clone your repository:**
```bash
git clone https://github.com/LiveStak-Brad/mylivelinks.git
cd mylivelinks
```

4. **Install dependencies:**
```bash
npm install --production
```

5. **Create environment file:**
```bash
nano .env.local
# Paste your environment variables (see Step 2 above)
# Save with Ctrl+X, then Y, then Enter
```

6. **Build the application:**
```bash
npm run build
```

7. **Install PM2 (process manager):**
```bash
sudo npm install -g pm2
```

8. **Start with PM2:**
```bash
pm2 start npm --name "mylivelinks" -- start
pm2 save
pm2 startup  # Follow instructions to enable auto-start on reboot
```

9. **Set up Nginx reverse proxy:**

Install Nginx:
```bash
sudo apt update
sudo apt install nginx
```

Create config file:
```bash
sudo nano /etc/nginx/sites-available/mylivelinks
```

Add this configuration (replace `mylivelinks.com` with your domain):
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

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/mylivelinks /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

10. **Set up SSL (HTTPS):**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d mylivelinks.com -d www.mylivelinks.com
```

Certbot will automatically configure HTTPS and renew certificates.

---

## Option 2: Deploy to cPanel/Shared Hosting

### If Your Hosting Supports Node.js:

1. **Upload files** via FTP or File Manager
2. **Set environment variables** in hosting control panel
3. **SSH into your hosting** and run:
```bash
cd public_html  # or your Node.js directory
npm install --production
npm run build
npm start
```

### If Your Hosting Doesn't Support Node.js:

You'll need to use a Node.js hosting service or VPS. Next.js requires Node.js to run.

---

## Option 3: Deploy to Cloud Platforms

### DigitalOcean App Platform

1. Go to [DigitalOcean](https://www.digitalocean.com/)
2. Create → App Platform
3. Connect GitHub repository: `LiveStak-Brad/mylivelinks`
4. Configure:
   - Build Command: `npm run build`
   - Run Command: `npm start`
5. Add all environment variables
6. Deploy

### Railway

1. Go to [Railway](https://railway.app/)
2. New Project → Deploy from GitHub
3. Select `LiveStak-Brad/mylivelinks`
4. Add environment variables
5. Deploy

### Render

1. Go to [Render](https://render.com/)
2. New → Web Service
3. Connect GitHub repository
4. Configure:
   - Build Command: `npm run build`
   - Start Command: `npm start`
5. Add environment variables
6. Deploy

---

## Environment Variables Checklist

Make sure these are set on your server:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `LIVEKIT_URL`
- [ ] `LIVEKIT_API_KEY`
- [ ] `LIVEKIT_API_SECRET`
- [ ] `NEXT_PUBLIC_DISABLE_AUTH` (set to `false` for production)

---

## Post-Deployment Checklist

- [ ] Site loads at your domain
- [ ] HTTPS is working (SSL certificate installed)
- [ ] Login/Signup works
- [ ] "Go Live" functionality works
- [ ] LiveKit connections work
- [ ] Chat works
- [ ] Gifts work
- [ ] Mobile responsive

---

## Updating Your Site

After making changes:

```bash
# On your server
cd /path/to/mylivelinks
git pull origin main
npm install --production
npm run build
pm2 restart mylivelinks
```

Or create a `deploy.sh` script:

```bash
#!/bin/bash
cd /path/to/mylivelinks
git pull origin main
npm install --production
npm run build
pm2 restart mylivelinks
echo "Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

Run it:
```bash
./deploy.sh
```

---

## Troubleshooting

### Port Already in Use
```bash
# Find what's using port 3000
sudo lsof -i :3000
# Kill the process
kill -9 <PID>
```

### PM2 Not Starting
```bash
# Check logs
pm2 logs mylivelinks

# Restart
pm2 restart mylivelinks

# Check status
pm2 list
```

### Nginx 502 Bad Gateway
- Check if Next.js is running: `pm2 list`
- Check Next.js logs: `pm2 logs mylivelinks`
- Verify proxy_pass URL matches your Next.js port (3000)

### Environment Variables Not Working
- Make sure `.env.local` exists on server
- Restart the application: `pm2 restart mylivelinks`
- Check for typos in variable names
- Ensure no extra spaces or quotes around values

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

---

## Security Notes

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use HTTPS** - Always set up SSL certificates
3. **Keep dependencies updated** - Run `npm audit` regularly
4. **Use PM2** - Keeps your app running and restarts on crashes
5. **Firewall** - Only open ports 80, 443, and SSH (22)

---

## Need Help?

- Check PM2 logs: `pm2 logs mylivelinks`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Check system logs: `journalctl -u nginx -f`
- Verify environment variables: `pm2 env mylivelinks`
