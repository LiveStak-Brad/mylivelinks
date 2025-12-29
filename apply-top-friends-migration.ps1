# Apply Top Friends Migration
# This script applies the Top Friends database migration to Supabase

Write-Host "🚀 Applying Top Friends Database Migration..." -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists and has Supabase credentials
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  .env.local not found!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please apply the migration manually:" -ForegroundColor White
    Write-Host "1. Open Supabase Dashboard (https://supabase.com)" -ForegroundColor Gray
    Write-Host "2. Go to SQL Editor" -ForegroundColor Gray
    Write-Host "3. Copy contents of sql/create_top_friends.sql" -ForegroundColor Gray
    Write-Host "4. Paste and run in SQL Editor" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📄 Migration file: sql/create_top_friends.sql" -ForegroundColor Cyan
    
    # Open the SQL file in default editor
    Start-Process "sql/create_top_friends.sql"
    
    exit
}

Write-Host "📄 Migration file: sql/create_top_friends.sql" -ForegroundColor White
Write-Host ""
Write-Host "✅ To apply this migration:" -ForegroundColor Green
Write-Host ""
Write-Host "Option 1 - Supabase Dashboard (Recommended):" -ForegroundColor Yellow
Write-Host "  1. Open Supabase Dashboard: https://supabase.com" -ForegroundColor Gray
Write-Host "  2. Go to SQL Editor" -ForegroundColor Gray
Write-Host "  3. Copy/paste sql/create_top_friends.sql" -ForegroundColor Gray
Write-Host "  4. Click 'Run'" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2 - Using psql (if you have direct DB access):" -ForegroundColor Yellow
Write-Host "  psql -h your-host -U postgres -d postgres -f sql/create_top_friends.sql" -ForegroundColor Gray
Write-Host ""

# Open the SQL file for easy copy-paste
Write-Host "📂 Opening SQL file for you to copy..." -ForegroundColor Cyan
Start-Process "sql/create_top_friends.sql"

Write-Host ""
Write-Host "After running the migration, your Top Friends feature will be live! 🎉" -ForegroundColor Green
Write-Host ""
Write-Host "Test it by:" -ForegroundColor White
Write-Host "  1. Restarting your dev server (npm run dev)" -ForegroundColor Gray
Write-Host "  2. Going to your profile" -ForegroundColor Gray
Write-Host "  3. Finding 'Top Friends' section" -ForegroundColor Gray
Write-Host "  4. Clicking 'Manage' button" -ForegroundColor Gray
Write-Host ""

