#!/bin/bash
# Quick setup script for mobile environment variables
# Run this from the ROOT directory (not mobile/)

echo "============================================"
echo "MyLiveLinks Mobile - Environment Setup"
echo "============================================"
echo ""

# Check if we're in the root directory
if [ ! -d "mobile" ]; then
    echo "❌ Error: Please run this from the root directory (where 'mobile' folder exists)"
    exit 1
fi

# Check if root .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found in root directory"
    echo "You'll need to manually add Supabase credentials"
    echo ""
fi

# Create mobile/.env file
echo "📝 Creating mobile/.env file..."

cat > mobile/.env << 'EOF'
# MyLiveLinks Mobile - Environment Variables

# Supabase Configuration (REQUIRED)
# Replace with your actual Supabase credentials
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# API Base URL
EXPO_PUBLIC_API_URL=https://mylivelinks.com

# Debug Mode (1 = enabled, 0 = disabled)
EXPO_PUBLIC_DEBUG_LIVE=1

# ============================================================================
# NEXT STEPS:
# ============================================================================
# 1. Open mobile/.env and replace the placeholder values with your actual:
#    - Supabase URL (from NEXT_PUBLIC_SUPABASE_URL in root .env.local)
#    - Supabase Anon Key (from NEXT_PUBLIC_SUPABASE_ANON_KEY in root .env.local)
#
# 2. For local testing on simulator, change API URL to:
#    EXPO_PUBLIC_API_URL=http://localhost:3000
#
# 3. For local testing on physical device, use ngrok:
#    npx ngrok http 3000
#    Then set: EXPO_PUBLIC_API_URL=https://your-ngrok-url.ngrok.io
#
# 4. Restart Expo with cache clear:
#    cd mobile && npx expo start -c
# ============================================================================
EOF

echo "✅ Created mobile/.env file"
echo ""
echo "📋 Next steps:"
echo "1. Edit mobile/.env and add your Supabase credentials"
echo "2. Get credentials from:"
echo "   - Root .env.local file (NEXT_PUBLIC_SUPABASE_*)"
echo "   - OR Vercel dashboard (Environment Variables)"
echo "   - OR Supabase dashboard (Settings → API)"
echo "3. Run: cd mobile && npx expo start -c"
echo ""
echo "See mobile/CRASH_FIX_ENV_SETUP.md for detailed instructions"






