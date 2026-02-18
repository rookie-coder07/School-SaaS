# Test Developer Login Endpoint

$url = "http://localhost:5000/api/auth/developer/login"
$headers = @{
    "Content-Type" = "application/json"
}
$body = @{
    email = "developer@example.com"
    password = "developer123"
} | ConvertTo-Json

Write-Host "Testing Developer Login..." -ForegroundColor Cyan
Write-Host "URL: $url" -ForegroundColor Yellow
Write-Host "Email: developer@example.com" -ForegroundColor Yellow
Write-Host "Password: developer123" -ForegroundColor Yellow
Write-Host "" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $body -UseBasicParsing
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    $responseData = $response.Content | ConvertFrom-Json
    $responseData | ConvertTo-Json | Write-Host
    
    if ($responseData.token) {
        Write-Host "`n✅ Login successful! Token received:" -ForegroundColor Green
        Write-Host $responseData.token.Substring(0, 50) + "..." -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Response Body:" -ForegroundColor Red
        Write-Host $errorBody -ForegroundColor Red
    }
}
