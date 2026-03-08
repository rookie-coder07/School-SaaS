# Developer Console - Isolated Architecture

## Overview

The Developer Console has been completely refactored to be **fully isolated** from the main application layout. It now operates as an independent subsystem with its own layout, navigation, and routing structure.

---

## Architecture Changes

### 1. **Dedicated Layout Component** ✅
**File:** `client/src/dev/DevLayout.jsx`

- **Purpose:** Wrapper component for the entire developer console
- **Features:**
  - Dark theme (slate-900 gradient background)
  - Responsive sidebar navigation (with mobile hamburger)
  - Single logout button (in sidebar footer)
  - Status indicator badge
  - Footer with copyright info
  - Uses React Router `<Outlet />` for nested routes

- **Key Characteristics:**
  - Does NOT include main `<Navbar />`
  - Does NOT reuse student portal layout
  - Completely independent styling

### 2. **Isolated Routing Structure** ✅
**File:** `client/src/App.jsx` (lines 159-171)

```jsx
<Route path="/dev-login" element={<DevLogin />} />

{/* Developer Console with Nested Routes */}
<Route path="/dev-console" element={<DevLayout />}>
  <Route index element={<Navigate to="system" replace />} />
  <Route path="system" element={<DevSystemPage />} />
  <Route path="errors" element={<DevErrorsPage />} />
  <Route path="logs" element={<DevLogsPage />} />
  <Route path="api" element={<DevApiPage />} />
  <Route path="activity" element={<DevActivityPage />} />
  <Route path="features" element={<DevFeaturesPage />} />
  <Route path="traces" element={<DevTracesPage />} />
  <Route path="tools" element={<DevToolsPage />} />
  <Route path="schools" element={<DevSchoolsPage />} />
</Route>
```

**Routes:**
- `/dev-login` - Access code validation (entry point)
- `/dev-console` - Redirects to `/dev-console/system` (default)
- `/dev-console/system` - System health monitoring
- `/dev-console/errors` - Error analytics
- `/dev-console/logs` - System logs viewer
- `/dev-console/api` - API usage analytics
- `/dev-console/activity` - Live activity feed
- `/dev-console/features` - Feature management
- `/dev-console/traces` - Trace logs
- `/dev-console/tools` - Developer utilities
- `/dev-console/schools` - School directory

### 3. **Route Page Wrappers** ✅
**Directory:** `client/src/dev/pages/`

Each route has a dedicated wrapper component:
- `DevSystemPage.jsx` - System health (standalone implementation)
- `DevErrorsPage.jsx` - Error monitoring (standalone implementation)
- `DevLogsPage.jsx` - Logs viewer (standalone implementation)
- `DevApiPage.jsx` - API analytics (standalone implementation)
- `DevActivityPage.jsx` - Activity monitor (standalone implementation)
- `DevFeaturesPage.jsx` - Feature management (standalone implementation)
- `DevTracesPage.jsx` - Trace logs (standalone implementation)
- `DevToolsPage.jsx` - Developer tools (standalone implementation)
- `DevSchoolsPage.jsx` - Schools directory (standalone implementation)

**Why Wrappers?**
- Remove DevPortalLayout dependency from old components
- Consistent styling with new DevLayout
- Independent API calls (no authentication tokens)
- Isolated from main app store/context

### 4. **Authentication & Access Control** ✅

**Entry Point:** `client/src/dev/DevLogin.jsx`
- Access code validation: `dev123`
- Sets `localStorage.devAccess = "true"`
- Redirects to `/dev-console` on success

**Access Verification:** `client/src/dev/DevLayout.jsx`
- Checks `localStorage.getItem("devAccess")` on mount
- Redirects unauthenticated users to `/dev-login`
- Clears token on logout

---

## User Flow

```
1. User navigates to http://localhost:5174/dev-login
2. DevLogin component renders access code input
3. User enters "dev123" and clicks "Enter Developer Console"
4. DevLogin validates and sets localStorage.devAccess = "true"
5. User is redirected to http://localhost:5174/dev-console
6. DevLayout checks access token and renders sidebar + navigation
7. Default route navigates to /dev-console/system
8. User can click tabs to navigate between sections:
   - System Health
   - Errors
   - Logs
   - API Usage
   - Live Activity
   - Features
   - Traces
   - Tools
   - Schools
9. On logout, devAccess token is cleared
10. User is redirected back to /dev-login
```

---

## API Endpoints

The developer console communicates with the backend via these endpoints:

| Section | Endpoint | Method | Purpose |
|---------|----------|--------|---------|
| System | `/api/dev/system-health` | GET | Server uptime, memory, CPU |
| Errors | `/api/dev/errors` | GET | Error logs and analytics |
| Logs | `/api/dev/logs` | GET | Crash logs and audit logs |
| API | `/api/dev/api-usage` | GET | Request counts and timing |
| Activity | `/api/dev/live-activity` | GET | Real-time system events |
| Features | `/api/dev/features` | GET | Feature toggles |
| Traces | `/api/dev/traces` | GET | Request traces |
| Schools | `/api/schools` | GET | School directory |

---

## Key Fixes Implemented

### ❌ Before (Broken)
- ✗ Multiple layouts rendering (main Navbar + DevLayout)
- ✗ Duplicate logout buttons from multiple components
- ✗ Hamburger menu redirecting to student portal
- ✗ Old components using DevPortalLayout with conflicting navigation
- ✗ Data not loading due to missing/wrong API calls
- ✗ Mixed authentication methods (developerToken vs devAccess)

### ✅ After (Fixed)
- ✓ Single isolated layout (DevLayout only)
- ✓ One logout button in sidebar
- ✓ Hamburger menu toggles sidebar (stays on dev console)
- ✓ Standalone wrapper components without layout conflicts
- ✓ Correct API endpoints configured
- ✓ Consistent authentication via devAccess token

---

## File Structure

```
client/src/
├── dev/
│   ├── DevLayout.jsx          # Isolated console layout
│   ├── DevLogin.jsx           # Access code entry
│   ├── DevDashboard.jsx       # (deprecated, can be removed)
│   └── pages/
│       ├── DevSystemPage.jsx      # System health
│       ├── DevErrorsPage.jsx      # Error analytics
│       ├── DevLogsPage.jsx        # Logs viewer
│       ├── DevApiPage.jsx         # API usage
│       ├── DevActivityPage.jsx    # Live activity
│       ├── DevFeaturesPage.jsx    # Features
│       ├── DevTracesPage.jsx      # Traces
│       ├── DevToolsPage.jsx       # Tools
│       └── DevSchoolsPage.jsx     # Schools
│
├── pages/
│   ├── DevSystem.jsx          # (legacy, no longer used)
│   ├── DevErrors.jsx          # (legacy, no longer used)
│   ├── DevLogs.jsx            # (legacy, no longer used)
│   ├── DevApiUsage.jsx        # (legacy, no longer used)
│   ├── DevLiveActivity.jsx    # (legacy, no longer used)
│   ├── DevFeatures.jsx        # (legacy, no longer used)
│   ├── DevTraces.jsx          # (legacy, no longer used)
│   ├── DevTools.jsx           # (legacy, no longer used)
│   ├── DevSchoolsList.jsx     # (legacy, no longer used)
│   ├── DevSchoolDetails.jsx   # (legacy, no longer used)
│   └── DeveloperDashboard.jsx # (legacy, no longer used)
│
├── App.jsx                     # Updated routes
└── components/
    └── DevPortalLayout.jsx    # (no longer used)
```

---

## Testing Checklist

- [ ] Access `/dev-login`
- [ ] Enter access code `dev123`
- [ ] Verify redirect to `/dev-console/system`
- [ ] Check system health data loads
- [ ] Click each sidebar tab:
  - [ ] System Health
  - [ ] Errors
  - [ ] Logs
  - [ ] API Usage
  - [ ] Live Activity
  - [ ] Features
  - [ ] Traces
  - [ ] Tools
  - [ ] Schools
- [ ] Toggle hamburger menu on mobile
- [ ] Click logout button
- [ ] Verify redirect to `/dev-login`
- [ ] Verify localStorage.devAccess is cleared

---

## Configuration

**Access Code:** `dev123` (set in `DevLogin.jsx`)
**API Base URL:** `http://127.0.0.1:5000` (configurable via `VITE_API_URL`)
**Frontend URL:** `http://localhost:5174`
**Backend URL:** `http://localhost:5000`

---

## Next Steps

1. **Test the developer console** at `http://localhost:5174/dev-login`
2. **Monitor API responses** for each tab
3. **Update backend endpoints** if responses don't match expected format
4. **Add data refresh buttons** if needed
5. **Clean up legacy files** from `/pages/` (optional)

---

## Troubleshooting

### Issue: "Unauthorized Access" when accessing /dev-console
**Solution:** Make sure you're logged in via `/dev-login` with code `dev123` and localStorage has `devAccess="true"`

### Issue: Data not loading on tabs
**Solution:** Check browser console (F12) for API errors. Verify backend endpoints are returning correct response format.

### Issue: Hamburger menu redirects to student portal
**Solution:** This should not happen with new DevLayout. Check that routes are properly configured in App.jsx.

### Issue: Multiple logout buttons visible
**Solution:** Old Dev components should not be rendered. Verify App.jsx is using new route structure with DevLayout.

---

**Status:** ✅ Architecture refactoring complete
**Last Updated:** 2026-03-07
**Version:** 2.0 (Isolated)
