# API Test Script
Write-Host "=== Markdown Cleaner API Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing health check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET
    Write-Host "   [OK] Health check passed" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "   [FAIL] Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Version Info
Write-Host "2. Testing version info..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/info" -Method GET
    Write-Host "   [OK] Version info retrieved" -ForegroundColor Green
    Write-Host "   Version: $($response.data.version)" -ForegroundColor Gray
    if ($response.data.version -eq "1.0.1") {
        Write-Host "   [OK] Version is correct (from package.json)" -ForegroundColor Green
    }
} catch {
    Write-Host "   [FAIL] Version info failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Analyze API with Request ID
Write-Host "3. Testing analyze API (check Request ID)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/analyze" -Method POST `
        -Body (@{content="# Test Title`nThis is test content."} | ConvertTo-Json) `
        -ContentType "application/json" -UseBasicParsing
    $requestId = $response.Headers.'X-Request-ID'
    $json = $response.Content | ConvertFrom-Json
    Write-Host "   [OK] Analyze API called successfully" -ForegroundColor Green
    if ($requestId) {
        Write-Host "   [OK] Request ID: $requestId" -ForegroundColor Green
    } else {
        Write-Host "   [FAIL] Request ID not found" -ForegroundColor Red
    }
    if ($json.success) {
        Write-Host "   [OK] Response format is correct" -ForegroundColor Green
    }
} catch {
    Write-Host "   [FAIL] Analyze API failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Input Validation - Wrong Type
Write-Host "4. Testing input validation (wrong type)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/process-text" -Method POST `
        -Body (@{content=123} | ConvertTo-Json) `
        -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    Write-Host "   [FAIL] Should return error but didn't" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd() | ConvertFrom-Json
    if ($statusCode -eq 400 -and $body.error.code -eq "VALIDATION_ERROR") {
        Write-Host "   [OK] Correctly returned validation error" -ForegroundColor Green
        Write-Host "   Error code: $($body.error.code)" -ForegroundColor Gray
        if ($body.error.requestId) {
            Write-Host "   [OK] Error response includes Request ID" -ForegroundColor Green
        }
    } else {
        Write-Host "   [FAIL] Error response format incorrect" -ForegroundColor Red
    }
}
Write-Host ""

# Test 5: Input Validation - Content Too Large
Write-Host "5. Testing input validation (content too large)..." -ForegroundColor Yellow
try {
    $largeContent = "a" * (6 * 1024 * 1024)
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/process-text" -Method POST `
        -Body (@{content=$largeContent} | ConvertTo-Json) `
        -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    Write-Host "   [FAIL] Should return error but didn't" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd() | ConvertFrom-Json
    if ($statusCode -eq 400 -and $body.error.code -eq "CONTENT_TOO_LARGE") {
        Write-Host "   [OK] Correctly returned content too large error" -ForegroundColor Green
        Write-Host "   Error code: $($body.error.code)" -ForegroundColor Gray
    } else {
        Write-Host "   [WARN] Status code: $statusCode" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test 6: Rate Limiting
Write-Host "6. Testing rate limiting (sending 15 requests quickly)..." -ForegroundColor Yellow
$successCount = 0
$rateLimitedCount = 0
1..15 | ForEach-Object {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET -UseBasicParsing -ErrorAction Stop
        $successCount++
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 429) {
            $rateLimitedCount++
        }
    }
    Start-Sleep -Milliseconds 50
}
Write-Host "   Success: $successCount, Rate Limited: $rateLimitedCount" -ForegroundColor Gray
if ($rateLimitedCount -gt 0) {
    Write-Host "   [OK] Rate limiting is working" -ForegroundColor Green
} else {
    Write-Host "   [INFO] Rate limit may not trigger (health endpoint may be excluded)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "=== Tests Complete ===" -ForegroundColor Cyan
