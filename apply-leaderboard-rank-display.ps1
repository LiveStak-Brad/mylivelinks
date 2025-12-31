# Apply Leaderboard Rank Display Migration
# This script creates the rpc_get_leaderboard_rank function

Write-Host "🎯 Applying Leaderboard Rank Display Migration..." -ForegroundColor Cyan
Write-Host ""

# Load environment variables
if (Test-Path .env.local) {
    Get-Content .env.local | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
}

$SUPABASE_DB_URL = $env:SUPABASE_DB_URL

if (-not $SUPABASE_DB_URL) {
    Write-Host "❌ Error: SUPABASE_DB_URL not found in .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment loaded" -ForegroundColor Green
Write-Host ""

# Apply SQL migration
Write-Host "📊 Creating leaderboard rank function..." -ForegroundColor Yellow

try {
    $sqlFile = "sql/GET_LEADERBOARD_RANK.sql"
    
    if (-not (Test-Path $sqlFile)) {
        Write-Host "❌ Error: SQL file not found: $sqlFile" -ForegroundColor Red
        exit 1
    }
    
    $sql = Get-Content $sqlFile -Raw
    
    # Execute via psql
    $sql | psql $SUPABASE_DB_URL
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Leaderboard rank function created successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Error applying migration" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎊 Migration Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test the function: SELECT * FROM rpc_get_leaderboard_rank('<profile_id>', 'top_streamers_daily')"
Write-Host "2. Restart your Next.js dev server if running"
Write-Host "3. View solo live stream to see the prestigious rank display!"
Write-Host ""
