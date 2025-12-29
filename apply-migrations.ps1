# ============================================================================
# APPLY MIGRATIONS TO SUPABASE
# ============================================================================
# This script applies the two critical migrations:
# 1. Fix follower_count sync
# 2. Create posts table with referral activation trigger
# ============================================================================

Write-Host "`n🚀 SUPABASE MIGRATION APPLICATION`n" -ForegroundColor Cyan
Write-Host ("=" * 80)

# Load environment
$envFile = Get-Content .env.local
$supabaseUrl = ($envFile | Select-String "NEXT_PUBLIC_SUPABASE_URL").ToString().Split("=")[1]
$dbPassword = "Lopsided1!"

# Extract database connection details
$projectRef = "dfiyrmqobjfsdsgklweg"
$dbHost = "aws-0-us-west-2.pooler.supabase.com"
$dbUser = "postgres.$projectRef"
$dbName = "postgres"

Write-Host "Project: $projectRef"
Write-Host "Database: $dbHost"
Write-Host ("=" * 80)
Write-Host ""

# Check if psql is available
$psqlAvailable = Get-Command psql -ErrorAction SilentlyContinue

if ($psqlAvailable) {
    Write-Host "✅ psql found - applying migrations directly..." -ForegroundColor Green
    Write-Host ""
    
    # Set password environment variable
    $env:PGPASSWORD = $dbPassword
    
    # Apply migration 1
    Write-Host "📄 Applying: 20251229_fix_follower_count_sync.sql"
    Write-Host ("-" * 80)
    psql -h $dbHost -U $dbUser -d $dbName -f "supabase\migrations\20251229_fix_follower_count_sync.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration 1 applied successfully`n" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration 1 failed`n" -ForegroundColor Red
    }
    
    # Apply migration 2
    Write-Host "📄 Applying: 20251229_create_posts_table.sql"
    Write-Host ("-" * 80)
    psql -h $dbHost -U $dbUser -d $dbName -f "supabase\migrations\20251229_create_posts_table.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration 2 applied successfully`n" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration 2 failed`n" -ForegroundColor Red
    }
    
    # Clear password
    Remove-Item Env:PGPASSWORD
    
} else {
    Write-Host "⚠️  psql not found - manual application required" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OPTION 1: Install PostgreSQL client tools"
    Write-Host "  Download from: https://www.postgresql.org/download/windows/"
    Write-Host "  Then re-run this script"
    Write-Host ""
    Write-Host "OPTION 2: Apply via Supabase Dashboard (RECOMMENDED)"
    Write-Host "  1. Go to: https://supabase.com/dashboard/project/$projectRef/sql/new"
    Write-Host "  2. Copy and paste SQL from: supabase\migrations\20251229_fix_follower_count_sync.sql"
    Write-Host "  3. Click 'Run'"
    Write-Host "  4. Repeat for: supabase\migrations\20251229_create_posts_table.sql"
    Write-Host ""
}

Write-Host ("=" * 80)
Write-Host "✅ Script complete - see above for results" -ForegroundColor Cyan
Write-Host ("=" * 80)

