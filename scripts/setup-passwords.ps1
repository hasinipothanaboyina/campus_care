# ==============================================================================
# CampusCare: Interactive Secure Password Configuration Utility
# Uses PowerShell Read-Host -AsSecureString to mask password input completely
# ==============================================================================

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "🔐 CAMPUSCARE ROLE ACCOUNTS: PRIVATE PASSWORD CONFIGURATION" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "Target Accounts:"
Write-Host "  1. Admin / CMS : 24481A67383 (CMC Operations Admin)"
Write-Host "  2. Student     : 24481A54E9   (Hasini Potanaboyina - AIDS)"
Write-Host "  3. Parent      : 7893589331   (Pavani Pothanaboyina)"
Write-Host "  4. All 3 Accounts Sequentially"
Write-Host ""

$choice = Read-Host "Select account to configure (1-4, or 'q' to quit)"

if ($choice -eq 'q') {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

$accounts = @()
if ($choice -eq '1') { $accounts += "admin" }
elseif ($choice -eq '2') { $accounts += "student" }
elseif ($choice -eq '3') { $accounts += "parent" }
elseif ($choice -eq '4') { $accounts += "admin", "student", "parent" }
else {
    Write-Host "Invalid selection." -ForegroundColor Red
    exit 1
}

foreach ($acc in $accounts) {
    Write-Host "`n------------------------------------------------------------------------" -ForegroundColor Gray
    Write-Host "Configuring $acc..." -ForegroundColor Green
    
    $p1Secure = Read-Host -AsSecureString "Enter new password for $acc (input hidden)"
    $p2Secure = Read-Host -AsSecureString "Confirm new password"
    
    $p1 = [System.Net.NetworkCredential]::new("", $p1Secure).Password
    $p2 = [System.Net.NetworkCredential]::new("", $p2Secure).Password
    
    if ($p1.Length -lt 8) {
        Write-Host "❌ Error: Password must be at least 8 characters long." -ForegroundColor Red
        continue
    }
    
    if ($p1 -ne $p2) {
        Write-Host "❌ Error: Passwords do not match." -ForegroundColor Red
        continue
    }
    
    # Run configuration script with environment variable
    $env:TARGET_ACCOUNT = $acc
    $env:NEW_PASSWORD = $p1
    
    node scripts/configure-account-passwords.cjs
    
    # Immediately clear sensitive environment variables and memory
    Remove-Item env:TARGET_ACCOUNT -ErrorAction SilentlyContinue
    Remove-Item env:NEW_PASSWORD -ErrorAction SilentlyContinue
    $p1 = $null
    $p2 = $null
    $p1Secure = $null
    $p2Secure = $null
}

Write-Host "`n========================================================================" -ForegroundColor Cyan
Write-Host "Configuration completed." -ForegroundColor Cyan
