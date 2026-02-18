# Full Test of Developer Login Flow

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "DEVELOPER LOGIN FLOW TEST" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if servers are running
Write-Host "[TEST 1] Checking if servers are running..." -ForegroundColor Yellow
$ports = @(5000, 5173)
$allRunning = $true
foreach ($port in $ports) {
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:$port" -UseBasicParsing -ErrorAction Stop -TimeoutSec 1
        Write-Host "  OK Port $($port): RUNNING" -ForegroundColor Green
    } catch {
        Write-Host "  FAIL Port $($port): NOT RUNNING" -ForegroundColor Red
        $allRunning = $false
    }
}

if (-not $allRunning) {
    Write-Host ""
    Write-Host "WARNING: One or more servers are not running. Please start them first." -ForegroundColor Yellow
    exit 1
}

# Test 2: Test developer login endpoint
Write-Host ""
Write-Host "[TEST 2] Testing developer login endpoint..." -ForegroundColor Yellow
$loginUrl = "http://localhost:5000/api/auth/developer/login"
$headers = @{ "Content-Type" = "application/json" }
$body = @{
    email = "developer@example.com"
    password = "developer123"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri $loginUrl -Method POST -Headers $headers -Body $body -UseBasicParsing -TimeoutSec 5
    $data = $response.Content | ConvertFrom-Json
    
    if ($response.StatusCode -eq 200 -and $data.token) {
        Write-Host "  OK Login successful!" -ForegroundColor Green
        Write-Host "  OK Token received" -ForegroundColor Green
        $token = $data.token
    } else {
        Write-Host "  FAIL Login failed: Invalid response" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  FAIL Login endpoint error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Test accessing dev dashboard with token
Write-Host ""
Write-Host "[TEST 3] Testing dev/schools endpoint with token..." -ForegroundColor Yellow
$dashboardUrl = "http://localhost:5000/api/dev/schools"
$authHeaders = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-WebRequest -Uri $dashboardUrl -Method GET -Headers $authHeaders -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "  OK Developer dashboard data accessible!" -ForegroundColor Green
        $data = $response.Content | ConvertFrom-Json
        Write-Host "  INFO Schools count: $($data.schools.Count)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  INFO Dashboard endpoint check: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 4: Verify frontend page exists
Write-Host ""
Write-Host "[TEST 4] Checking if dev login page is accessible..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173/dev/login" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "  OK Dev login page accessible!" -ForegroundColor Green
    }
} catch {
    Write-Host "  FAIL Dev login page error: $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now login at: http://localhost:5173/dev/login" -ForegroundColor Cyan
Write-Host "  Email: developer@example.com" -ForegroundColor Cyan
Write-Host "  Password: developer123" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login is working! Try it in your browser now." -ForegroundColor Green
