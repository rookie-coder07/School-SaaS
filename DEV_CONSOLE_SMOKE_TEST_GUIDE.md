# Developer Console - Comprehensive Smoke Test Guide

## Overview

This smoke test suite validates **every Developer Console feature, API endpoint, and UI component** in the MERN School SaaS platform.

**No business logic is modified** — only validation and reporting.

---

## Quick Start

### 1. Ensure Backend is Running

```powershell
cd server
node server.js

# Expected output:
# 🚀 Server running on port 5000
```

### 2. Run Smoke Test

```powershell
node RUN_SMOKE_TEST.js
```

**Or directly:**
```powershell
node DEV_CONSOLE_SMOKE_TEST.js
```

### 3. View Results

The test will output a live, colored report in the terminal and save a JSON report to:
```
DEV_CONSOLE_SMOKE_TEST_REPORT.json
```

---

## Test Coverage

### ✓ TEST 1: AUTHENTICATION
- Tests developer login with `POST /api/dev/login`
- Validates JWT token is returned
- Stores token for subsequent authenticated requests

**Files Involved:**
- `server/middleware/devAuth.js` (if exists)
- `server/routes/devRoutes.js`

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "email": "dev@school.local", "role": "developer" }
}
```

---

### ✓ TEST 2: SCHOOLS MANAGEMENT
- GET `/api/dev/schools` — Load all schools
- Validates each school has `_id`, `name`, `createdAt`
- Checks for undefined values
- Tests school controls endpoint

**Files Involved:**
- `server/routes/devRoutes.js` (GET /schools)
- `client/src/dev/pages/DevSchoolsPage.jsx`

**Expected Issues Fixed:**
- ✅ No `undefined` school IDs
- ✅ All schools have stable keys (not index-based)
- ✅ API validation prevents calls to `/api/dev/schools/undefined/controls`

---

### ✓ TEST 3: SYSTEM HEALTH
- GET `/api/dev/system-health` — Monitor system metrics
- Validates: uptime, memory, CPU, process ID, database status
- Checks for NaN values in metrics

**Files Involved:**
- `server/routes/devRoutes.js` (GET /system-health)
- `client/src/dev/pages/DevSystemPage.jsx`

**Expected Response:**
```json
{
  "uptime": 3600,
  "memory": { "total": 1024000000, "used": 512000000 },
  "cpu": { "usage": 15.5, "cores": 4 },
  "pid": 12345,
  "dbStatus": "connected"
}
```

---

### ✓ TEST 4: ERROR MONITORING
- GET `/api/dev/errors` — Load recent errors
- Validates error structure: `timestamp`, `route`, `message`
- Checks for undefined values

**Files Involved:**
- `server/routes/devRoutes.js` (GET /errors)
- `client/src/dev/pages/DevErrorsPage.jsx`

**Expected Issues Fixed:**
- ✅ No duplicate key warnings (uses composite key: `error-${timestamp}-${route}`)
- ✅ Error items with undefined values are filtered out

---

### ✓ TEST 5: LOGS VIEWER
- GET `/api/dev/logs` — Load crash and audit logs
- Validates log structure
- Checks for rendering issues

**Files Involved:**
- `server/routes/devRoutes.js` (GET /logs)
- `client/src/dev/pages/DevLogsPage.jsx`

---

### ✓ TEST 6: API USAGE ANALYTICS
- GET `/api/dev/api-usage` — Track API requests
- Validates: totalRequests, topEndpoints, requestTimeline
- Checks for NaN values in charts

**Files Involved:**
- `server/routes/devRoutes.js` (GET /api-usage)
- `client/src/dev/pages/DevApiPage.jsx`

---

### ✓ TEST 7: LIVE ACTIVITY
- GET `/api/dev/live-activity` — Track user actions
- Loads recent logins, attendance updates, exam actions
- Validates items have unique identifiers

**Files Involved:**
- `server/routes/devRoutes.js` (GET /live-activity)
- `client/src/dev/pages/DevActivityPage.jsx`

**Expected Issues Fixed:**
- ✅ Uses stable key: `item._id || 'activity-${item.createdAt}'`
- ✅ No index-based keys
- ✅ Items without required fields are filtered

---

### ✓ TEST 8: DEVELOPER TOOLS
Tests POST endpoints for admin actions:
- `POST /api/dev/tools/clear-cache`
- `POST /api/dev/tools/rebuild-index`
- `POST /api/dev/tools/refresh-tokens`

**Files Involved:**
- `server/routes/devRoutes.js` (dev tools)

---

### ✓ TEST 9: FRONTEND ROUTES
Tests that all Developer Console pages render:
- `/dev/login`
- `/dev/dashboard`
- `/dev/schools`
- `/dev/system`
- `/dev/errors`
- `/dev/logs`
- `/dev/api`
- `/dev/activity`

**Expected:**
- All routes return React HTML (SPA fallback)
- No "undefined" text in HTML

---

### ✓ TEST 10: RESPONSE VALIDATION
- Measures API response times (should be <1s)
- Checks for 500 errors
- Validates CORS headers

---

## Example Output

```
════════════════════════════════════════════════════════════════
DEVELOPER CONSOLE SMOKE TEST
════════════════════════════════════════════════════════════════
ℹ Starting tests at 2026-03-07T10:30:45.123Z
ℹ API Base: http://localhost:5000/api/dev
ℹ Frontend Base: http://localhost:5000

════════════════════════════════════════════════════════════════
TEST 1: AUTHENTICATION
════════════════════════════════════════════════════════════════
✔ Developer login successful
✔ JWT token received: eyJhbGciOiJIUzI1NiIs...

════════════════════════════════════════════════════════════════
TEST 2: SCHOOLS MANAGEMENT
════════════════════════════════════════════════════════════════
✔ GET /api/dev/schools: 5 schools loaded
✔ School objects have required fields (_id, name, createdAt)
✔ No undefined values in school data
✔ School controls loaded for School A

════════════════════════════════════════════════════════════════
TEST RESULTS SUMMARY
════════════════════════════════════════════════════════════════

Total Tests: 47
Passed: 45
Failed: 0
Warnings: 2
Pass Rate: 95.7%

📊 Full report saved to: DEV_CONSOLE_SMOKE_TEST_REPORT.json
```

---

## JSON Report Structure

File: `DEV_CONSOLE_SMOKE_TEST_REPORT.json`

```json
{
  "timestamp": "2026-03-07T10:30:45.123Z",
  "summary": {
    "total": 47,
    "passed": 45,
    "failed": 0,
    "warnings": 2,
    "passRate": 95.7
  },
  "details": {
    "passed": [
      "Developer login successful",
      "JWT token received: eyJhbGciOiJIUzI1NiIs...",
      "..."
    ],
    "failed": [
      "GET /api/dev/schools: Connection refused"
    ],
    "warnings": [
      "API response time: 1200ms (slow)",
      "..."
    ]
  }
}
```

---

## Troubleshooting

### Issue: "Backend server not running on port 5000"

**Solution:**
```powershell
cd server
node server.js
```

Wait for:
```
🚀 Server running on port 5000
```

---

### Issue: "Cannot read properties of undefined (reading 'token')"

**Cause:** Developer user doesn't exist or login credentials are wrong.

**Solution:**
1. Check MongoDB connection
2. Verify `dev@school.local` / `Dev@1234` credentials in database
3. Run backend with `MONGO_URI` set in `.env`

---

### Issue: "No schools found in database"

**Cause:** No schools created in the system.

**Solution:** This is a ⚠️ WARNING, not a failure. Create a school through the admin panel first.

---

### Issue: "API response time: 1200ms (slow)"

**Cause:** Slow database queries or high server load.

**Solution:**
1. Check MongoDB indexes
2. Review server logs
3. Profile slow endpoints with `POST /api/dev/tools/rebuild-index`

---

## Integration with CI/CD

### Run as GitHub Action

```yaml
name: Developer Console Smoke Test

on: [push, pull_request]

jobs:
  smoke-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install
          cd server && npm install
          cd ../client && npm install
      
      - name: Start backend
        run: cd server && node server.js &
        env:
          MONGO_URI: ${{ secrets.MONGO_URI }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
      
      - name: Wait for server
        run: sleep 5
      
      - name: Run smoke test
        run: node RUN_SMOKE_TEST.js
      
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: smoke-test-report
          path: DEV_CONSOLE_SMOKE_TEST_REPORT.json
```

---

## Files Created

- ✅ `DEV_CONSOLE_SMOKE_TEST.js` — Main test suite (comprehensive tests)
- ✅ `RUN_SMOKE_TEST.js` — Test runner (server check + execution)
- ✅ `DEV_CONSOLE_SMOKE_TEST_GUIDE.md` — This file
- ✅ `DEV_CONSOLE_SMOKE_TEST_REPORT.json` — JSON report (auto-generated)

---

## Dependencies Required

The test script uses:
- `axios` — HTTP client (already in node_modules)
- `chalk` — Colored console output (already in node_modules)

If either is missing:
```powershell
npm install axios chalk
```

---

## Expected Pass Rate

| Scenario | Pass Rate |
|----------|-----------|
| Development (all features) | 100% |
| Production (core only) | 95%+ |
| With warnings | 90%+ |

**Warnings count as "not failures"** — they're alerts about slow responses or missing optional features.

---

## Next Steps

1. ✅ Run the test: `node RUN_SMOKE_TEST.js`
2. ✅ Check the report: open `DEV_CONSOLE_SMOKE_TEST_REPORT.json`
3. ✅ Fix any failures (instructions in report)
4. ✅ Re-run to verify fixes
5. ✅ Commit report to version control

---

**Created:** 2026-03-07  
**Version:** 1.0  
**Maintainer:** Development Team
