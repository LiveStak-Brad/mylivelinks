# Apply Security Advisor Fixes
# Fixes all security issues found in Supabase Security Advisor

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Security Advisor Fixes Migration" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This migration will:" -ForegroundColor Yellow
Write-Host "  1. Remove SECURITY DEFINER from 4 views" -ForegroundColor Yellow
Write-Host "  2. Enable RLS on 10 tables" -ForegroundColor Yellow
Write-Host "  3. Add appropriate RLS policies" -ForegroundColor Yellow
Write-Host ""

# Prompt for Supabase credentials
$projectRef = Read-Host "Enter your Supabase Project Reference ID"
$dbPassword = Read-Host "Enter your Database Password" -AsSecureString
$plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))

$connectionString = "postgresql://postgres:$plainPassword@db.$projectRef.supabase.co:5432/postgres"

Write-Host ""
Write-Host "Applying migration..." -ForegroundColor Green

# Apply the migration
$migrationFile = "supabase\migrations\20251230_fix_security_advisor_issues.sql"

if (Test-Path $migrationFile) {
    try {
        # Use psql if available, otherwise try supabase CLI
        if (Get-Command psql -ErrorAction SilentlyContinue) {
            psql $connectionString -f $migrationFile
        }
        elseif (Get-Command supabase -ErrorAction SilentlyContinue) {
            Get-Content $migrationFile | supabase db execute --project-ref $projectRef
        }
        else {
            Write-Host "ERROR: Neither psql nor supabase CLI found." -ForegroundColor Red
            Write-Host "Please install one of the following:" -ForegroundColor Yellow
            Write-Host "  - PostgreSQL client (psql): https://www.postgresql.org/download/" -ForegroundColor Yellow
            Write-Host "  - Supabase CLI: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Alternatively, you can:" -ForegroundColor Yellow
            Write-Host "  1. Go to your Supabase Dashboard" -ForegroundColor Cyan
            Write-Host "  2. Navigate to SQL Editor" -ForegroundColor Cyan
            Write-Host "  3. Copy and paste the contents of: $migrationFile" -ForegroundColor Cyan
            Write-Host "  4. Run the query" -ForegroundColor Cyan
            exit 1
        }
        
        Write-Host ""
        Write-Host "✓ Migration applied successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Refresh the Security Advisor in Supabase Dashboard" -ForegroundColor White
        Write-Host "  2. Verify all errors are resolved" -ForegroundColor White
        Write-Host "  3. Test your application to ensure everything works" -ForegroundColor White
    }
    catch {
        Write-Host "ERROR: Failed to apply migration" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "ERROR: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}
