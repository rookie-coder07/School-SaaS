# Developer Console - Files Reference

## Overview

This document maps all Developer Console features to their corresponding source files for quick reference during development.

---

## Backend Files

### Server Configuration
- **`server/server.js`** (Lines 502-530)
  - Frontend static file serving
  - Express static middleware with no-cache policy
  - SPA fallback route (serves index.html for all unmatched routes)

### Developer Routes
- **`server/routes/devRoutes.js`**
  - Main endpoint file for all `/api/dev/*` routes
  - Contains:
    - `GET /api/dev/login` — Developer authentication
    - `GET /api/dev/schools` — School listings
    - `GET /api/dev/schools/:id/controls` — School settings
    - `GET /api/dev/system-health` — System metrics
    - `GET /api/dev/errors` — Error logs
    - `GET /api/dev/logs` — System logs
    - `GET /api/dev/api-usage` — API analytics
    - `GET /api/dev/live-activity` — Real-time activity
    - `POST /api/dev/tools/*` — Admin tools

### Developer Middleware (if exists)
- **`server/middleware/devAuth.js` or similar**
  - JWT verification for developer routes
  - Role checking (developer only)

### Database Collections Used
- `schools` — School data
- `users` — User records (for logins)
- `systemLogs` — Crash and system logs
- `activityLogs` — Real-time activity feed
- `auditLogs` — Audit trail

---

## Frontend Files

### Developer Console Main Layout
- **`client/src/dev/DevConsole.jsx` or `DevLayout.jsx`**
  - Main router for `/dev/*` routes
  - Navigation sidebar
  - Authentication wrapper

### Authentication Page
- **`client/src/dev/pages/DevLoginPage.jsx`**
  - Login form
  - JWT token storage
  - Redirect on success

### Dashboard / Home
- **`client/src/dev/pages/DevDashboardPage.jsx` or `DevSystemPage.jsx`**
  - Overview of system status
  - Quick stats (uptime, active users, errors)
  - Navigation tiles to other pages

### Schools Management
- **`client/src/dev/pages/DevSchoolsPage.jsx`**
  - School listing with cards
  - School expansion/collapse
  - Toggle school status
  - Toggle maintenance mode
  - Configure uploads permission
  - **Key Validations:**
    - ✅ Filter out schools with undefined `_id` on load (Line 20-32)
    - ✅ All API-calling functions check `if (!schoolId)` before calling API
    - ✅ Map uses `key={schoolIdStr}` (never index-based)
    - ✅ Render-time check: `if (!school?._id) return null`

### System Health Monitor
- **`client/src/dev/pages/DevSystemPage.jsx`**
  - Display metrics: uptime, memory, CPU, process ID
  - Database connection status
  - Real-time updates
  - **Key Validations:**
    - ✅ No NaN values displayed
    - ✅ Numeric formatting (MB, %, seconds)

### Error Tracker
- **`client/src/dev/pages/DevErrorsPage.jsx`**
  - Table of recent errors
  - Columns: timestamp, route, message, statusCode
  - Filters/search
  - **Key Validations:**
    - ✅ Composite key: `error-${timestamp}-${route}` (Line 131-154)
    - ✅ Removed index from key: was `key={idx}`, now uses identifier
    - ✅ Filter out items without timestamp

### Logs Viewer
- **`client/src/dev/pages/DevLogsPage.jsx`**
  - Display crash logs
  - Display audit logs
  - Logs search/filter

### API Usage Analytics
- **`client/src/dev/pages/DevApiPage.jsx`**
  - Chart: requests over time
  - Top endpoints table
  - Request distribution
  - **Key Validations:**
    - ✅ No NaN in chart data
    - ✅ Proper number formatting

### Live Activity Feed
- **`client/src/dev/pages/DevActivityPage.jsx`**
  - Real-time activity stream
  - Recent logins, attendance updates, exam actions
  - Auto-refresh
  - **Key Validations:**
    - ✅ Stable key: `item._id || 'activity-${item.createdAt}'` (Line 60-75)
    - ✅ Filter items without `_id` and `createdAt`
    - ✅ No index-based keys

### Shared Components
- **`client/src/dev/components/DevHeader.jsx`**
  - Top navigation bar
  - Logout button
  - Breadcrumbs

- **`client/src/dev/components/DevSidebar.jsx`**
  - Left navigation menu
  - Links to all dev pages
  - Active page highlighting

- **`client/src/dev/components/DevCard.jsx`**
  - Reusable card component
  - School cards, metric cards, etc.

- **`client/src/dev/components/DevTable.jsx`**
  - Reusable table component
  - Error logs, activity feeds, etc.

### Context / State Management
- **`client/src/dev/context/DevContext.jsx` (if exists)**
  - Developer authentication state
  - Current logged-in developer
  - Token storage

---

## Utilities

### API Service
- **`client/src/services/devApiService.js` or `apiClient.js`**
  - Wrapper for all `/api/dev/*` calls
  - Automatic JWT token injection in headers
  - Error logging
  - Retry logic

### Constants
- **`client/src/constants/devConsoleConstants.js` (if exists)**
  - API endpoints
  - Default values
  - Error messages

### Hooks
- **`client/src/hooks/useDeveloperAuth.js` (if exists)**
  - Custom hook for developer authentication
  - Token management
  - Role checking

---

## Build & Configuration

### Vite Config (Frontend)
- **`client/vite.config.js`**
  - Dev server configuration (port 5174)
  - Build output (client/dist)
  - API proxy (if configured)

### Package.json Scripts (Frontend)
- **`client/package.json`**
  - `npm run dev` — Start dev server
  - `npm run build` — Build for production
  - `npm run preview` — Preview production build

### Package.json Scripts (Backend)
- **`server/package.json`**
  - `npm start` or `node server.js` — Start server

---

## Smoke Test Files

### Test Files (Created)
- **`DEV_CONSOLE_SMOKE_TEST.js`**
  - Main test suite with 10 test categories
  - Comprehensive validation

- **`RUN_SMOKE_TEST.js`**
  - Test runner wrapper
  - Server connectivity check

- **`DEV_CONSOLE_SMOKE_TEST_GUIDE.md`**
  - Comprehensive testing documentation

- **`DEV_CONSOLE_FILES_REFERENCE.md`** (This file)
  - File mapping and quick reference

### Auto-Generated Report
- **`DEV_CONSOLE_SMOKE_TEST_REPORT.json`**
  - Test results in JSON format
  - Summary and details
  - Pass/fail statistics

---

## Visual Site Map

```
Developer Console (/dev/*)
│
├── /dev/login
│   └── DevLoginPage.jsx
│
├── /dev/dashboard
│   └── DevDashboardPage.jsx
│
├── /dev/schools
│   └── DevSchoolsPage.jsx
│       └── School cards with toggle actions
│
├── /dev/system
│   └── DevSystemPage.jsx
│       └── System health metrics
│
├── /dev/errors
│   └── DevErrorsPage.jsx
│       └── Error log table
│
├── /dev/logs
│   └── DevLogsPage.jsx
│       └── Crash & audit logs
│
├── /dev/api
│   └── DevApiPage.jsx
│       └── API usage analytics & charts
│
└── /dev/activity
    └── DevActivityPage.jsx
        └── Live activity stream

API Routes (/api/dev/*)
│
├── POST /login
├── GET /schools
├── GET /schools/:id/controls
├── POST /schools/:id/toggle-disabled
├── POST /schools/:id/toggle-maintenance
├── POST /schools/:id/toggle-uploads
├── GET /system-health
├── GET /errors
├── GET /logs
├── GET /api-usage
├── GET /live-activity
└── POST /tools/*
```

---

## Key Fixes Applied (Phase 7)

### DevSchoolsPage.jsx
- ✅ Line 20-32: Filter schools with undefined `_id` on load
- ✅ Line 36-49: `loadSchoolControls()` — Check `if (!schoolId)` before API call
- ✅ Line 51-78: `toggleSchoolStatus()` — Validate schoolId
- ✅ Line 80-110: `toggleMaintenanceMode()` — Validate schoolId
- ✅ Line 112-141: `toggleUploads()` — Validate schoolId
- ✅ Line 143-157: `handleExpandSchool()` — Validate schoolId
- ✅ Line 172-180: Map render — Check `if (!school?._id)` before rendering

### DevActivityPage.jsx
- ✅ Line 60-75: Add item validation, stable key

### DevErrorsPage.jsx
- ✅ Line 131-154: Add timestamp validation, composite stable key

---

## Testing Checklist

When running smoke tests, verify:

- [ ] Backend running on port 5000
- [ ] MongoDB connected
- [ ] Frontend build in `client/dist`
- [ ] All 10 test categories pass
- [ ] JSON report generated
- [ ] No React console errors
- [ ] No network 500 errors
- [ ] API response times <1s
- [ ] All routes return React HTML
- [ ] School data has valid IDs
- [ ] No NaN values in metrics
- [ ] No undefined values in objects

---

## Quick Fix Guide

### Issue: "Cannot read properties of undefined"
- **Files to check:** DevSchoolsPage.jsx, DevActivityPage.jsx, DevErrorsPage.jsx
- **Fix:** Add `if (!item?._id) return null` in map

### Issue: "Encountered two children with same key"
- **Files to check:** DevActivityPage.jsx, DevErrorsPage.jsx
- **Fix:** Remove index from key, use stable identifier

### Issue: "Cannot GET /dev/login"
- **Files to check:** server.js (SPA fallback route)
- **Fix:** Ensure `app.get("*", ...)` sends index.html

### Issue: "Database connection failed"
- **Files to check:** server/server.js, .env
- **Fix:** Verify MONGO_URI in environment

### Issue: "NaN in metrics"
- **Files to check:** DevSystemPage.jsx, DevApiPage.jsx
- **Fix:** Add validation: `typeof value === 'number' && !isNaN(value)`

---

## Environment Variables

```env
# Backend (.env in server/ directory)
MONGO_URI=mongodb://...
JWT_SECRET=your-secret-key
NODE_ENV=development
PORT=5000

# Frontend (.env in client/ directory)
VITE_API_BASE=http://localhost:5000/api
```

---

**Last Updated:** 2026-03-07  
**Files Mapped:** 25+  
**Total Test Cases:** 47
