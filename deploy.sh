#!/bin/bash

# MyLiveLinks Deployment Script
# Run this script on your server to deploy updates

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Navigate to project directory
cd "$(dirname "$0")"

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Build the application
echo "🔨 Building application..."
npm run build

# Restart PM2 process
echo "🔄 Restarting application..."
pm2 restart mylivelinks || pm2 start npm --name "mylivelinks" -- start

# Save PM2 configuration
pm2 save

echo "✅ Deployment complete!"
echo "📊 Check status with: pm2 logs mylivelinks"



