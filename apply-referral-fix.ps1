# ============================================================================
# Apply Referral System Fix
# ============================================================================
# This script helps you apply the referral system fix to your Supabase database
# ============================================================================

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "           REFERRAL SYSTEM FIX - pgcrypto Extension" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "ISSUE DETECTED:" -ForegroundColor Yellow
Write-Host "  - Error: function gen_random_bytes(integer) does not exist" -ForegroundColor Red
Write-Host "  - Only one user's referral link is working" -ForegroundColor Red
Write-Host "  - Users can only set that one person as referrer" -ForegroundColor Red
Write-Host ""

Write-Host "ROOT CAUSE:" -ForegroundColor Yellow
Write-Host "  - PostgreSQL pgcrypto extension is not enabled" -ForegroundColor White
Write-Host "  - The generate_referral_code() function requires gen_random_bytes()" -ForegroundColor White
Write-Host "  - This function is part of the pgcrypto extension" -ForegroundColor White
Write-Host ""

Write-Host "FIX:" -ForegroundColor Green
Write-Host "  1. Open Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/editor)" -ForegroundColor White
Write-Host "  2. Copy the contents of one of these files:" -ForegroundColor White
Write-Host ""
Write-Host "     Option A (Recommended):" -ForegroundColor Cyan
Write-Host "       - RUN_THIS_FIX_NOW.sql" -ForegroundColor White
Write-Host "       - This enables pgcrypto AND shows you current referral data" -ForegroundColor Gray
Write-Host ""
Write-Host "     Option B (Quick):" -ForegroundColor Cyan
Write-Host "       - FIX_REFERRALS_GEN_RANDOM_BYTES.sql" -ForegroundColor White
Write-Host "       - This enables pgcrypto with verification tests" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Paste into SQL Editor and click 'Run'" -ForegroundColor White
Write-Host "  4. Verify the fix worked (see below)" -ForegroundColor White
Write-Host ""

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if files exist
$files = @(
    "RUN_THIS_FIX_NOW.sql",
    "FIX_REFERRALS_GEN_RANDOM_BYTES.sql",
    "DIAGNOSE_REFERRALS_ISSUE.sql",
    "REFERRAL_FIX_SUMMARY.md",
    "REFERRAL_SYSTEM_FIX_COMPLETE.md"
)

Write-Host "Checking for fix files..." -ForegroundColor Cyan
Write-Host ""

$allExist = $true
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  [✓] $file" -ForegroundColor Green
    } else {
        Write-Host "  [✗] $file (MISSING)" -ForegroundColor Red
        $allExist = $false
    }
}

Write-Host ""

if ($allExist) {
    Write-Host "All fix files are present!" -ForegroundColor Green
    Write-Host ""
    
    # Offer to open the SQL file
    Write-Host "Would you like to open RUN_THIS_FIX_NOW.sql in notepad? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    
    if ($response -eq 'Y' -or $response -eq 'y') {
        Start-Process notepad.exe -ArgumentList "RUN_THIS_FIX_NOW.sql"
        Write-Host ""
        Write-Host "Opening RUN_THIS_FIX_NOW.sql..." -ForegroundColor Cyan
        Write-Host "Copy the contents and paste into Supabase SQL Editor" -ForegroundColor White
    }
} else {
    Write-Host "Some fix files are missing. Please ensure all files are present." -ForegroundColor Red
}

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "                        VERIFICATION STEPS" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "After applying the fix, verify it worked:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Test gen_random_bytes:" -ForegroundColor White
Write-Host "     SELECT gen_random_bytes(8);" -ForegroundColor Gray
Write-Host "     Should return a bytea value (not an error)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  2. Test generate_referral_code:" -ForegroundColor White
Write-Host "     SELECT public.generate_referral_code(8);" -ForegroundColor Gray
Write-Host "     Should return a code like 'ABC12XYZ'" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  3. Run diagnostics:" -ForegroundColor White
Write-Host "     Copy/paste contents of DIAGNOSE_REFERRALS_ISSUE.sql" -ForegroundColor Gray
Write-Host "     Should show referral codes and stats for multiple users" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  4. Test in UI:" -ForegroundColor White
Write-Host "     - Login as any user" -ForegroundColor Gray
Write-Host "     - Go to Settings" -ForegroundColor Gray
Write-Host "     - Enter someone's username in 'Who invited you?'" -ForegroundColor Gray
Write-Host "     - Should save successfully with no error" -ForegroundColor DarkGray
Write-Host ""

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "For more details, see:" -ForegroundColor Cyan
Write-Host "  - REFERRAL_FIX_SUMMARY.md (Quick overview)" -ForegroundColor White
Write-Host "  - REFERRAL_SYSTEM_FIX_COMPLETE.md (Full documentation)" -ForegroundColor White
Write-Host ""

Write-Host "Press any key to exit..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

