# UI Crawler Report

- Generated: 2026-03-08T17:46:26.604Z
- Base URL: http://localhost:5174
- Pages tested: 3
- Console errors: 2
- React warnings: 0
- Failed APIs: 0
- Network errors: 0
- UI issues: 0
- Login failures: 0

## Pages Tested
- [teacher] Dashboard (/teacher/dashboard)
- [teacher] Attendance (/teacher/dashboard?section=attendance)
- [teacher] Homework (/teacher/dashboard?section=homework)

## Portal Login Failures
- none

## Console Errors
- [teacher] /teacher/dashboard: CLASS SUMMARY ERROR: TypeError: Failed to fetch
    at fetchClassSummary (http://localhost:5174/src/pages/TeacherDashboard.jsx?t=1772989967003:372:23)
    at http://localhost:5174/src/pages/TeacherDashboard.jsx?t=1772989967003:388:14
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7620:6)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [teacher] /teacher/dashboard: STUDENTS FETCH ERROR: TypeError: Failed to fetch
    at http://localhost:5174/src/pages/TeacherDashboard.jsx?t=1772989967003:679:22
    at http://localhost:5174/src/pages/TeacherDashboard.jsx?t=1772989967003:802:38
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7620:6)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)

## Failed APIs
- none

## UI Issues
- none
