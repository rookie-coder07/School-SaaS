# UI Crawler Report

- Generated: 2026-03-08T15:13:06.965Z
- Base URL: http://localhost:5174
- Pages tested: 13
- Console errors: 83
- React warnings: 107
- Failed APIs: 0
- Network errors: 199
- UI issues: 54
- Login failures: 2

## Pages Tested
- [developer] Dashboard (/dev-console/dashboard)
- [developer] System Health (/dev-console/system)
- [developer] Errors (/dev-console/errors)
- [developer] Logs (/dev-console/logs)
- [developer] API Usage (/dev-console/api-usage)
- [developer] Live Activity (/dev-console/live-activity)
- [developer] Traces (/dev-console/traces)
- [developer] Schools (/dev-console/schools)
- [developer] Users (/dev-console/users)
- [developer] Voice Messages (/dev-console/voice-messages)
- [developer] Data Explorer (/dev-console/data-explorer)
- [developer] System Controls (/dev-console/system-controls)
- [developer] Audit Logs (/dev-console/audit-logs)

## Portal Login Failures
- admin: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- teacher: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================

## Console Errors
- [developer] /dev-console/dashboard: System health fetch error: TypeError: Failed to fetch
    at loadHealth (http://localhost:5174/src/dev/pages/DevSystemPage.jsx:18:28)
    at http://localhost:5174/src/dev/pages/DevSystemPage.jsx:29:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/dashboard: Logs fetch error: TypeError: Failed to fetch
    at loadLogs (http://localhost:5174/src/dev/pages/DevLogsPage.jsx:22:28)
    at http://localhost:5174/src/dev/pages/DevLogsPage.jsx:38:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/dashboard: API usage fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevApiPage.jsx:81:28)
    at http://localhost:5174/src/dev/pages/DevApiPage.jsx:114:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/dashboard: Live activity fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevActivityPage.jsx:34:28)
    at http://localhost:5174/src/dev/pages/DevActivityPage.jsx:45:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/dashboard: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/system: API usage fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevApiPage.jsx:81:28)
    at http://localhost:5174/src/dev/pages/DevApiPage.jsx:114:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/system: Live activity fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevActivityPage.jsx:34:28)
    at http://localhost:5174/src/dev/pages/DevActivityPage.jsx:45:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/dashboard: Traces fetch error: TypeError: Failed to fetch
- [developer] /dev-console/system: Traces fetch error: TypeError: Failed to fetch
- [developer] /dev-console/dashboard: Error analytics fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevErrorsPage.jsx:92:28)
    at http://localhost:5174/src/dev/pages/DevErrorsPage.jsx:121:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/system: Error analytics fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevErrorsPage.jsx:92:28)
    at http://localhost:5174/src/dev/pages/DevErrorsPage.jsx:121:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/errors: Error analytics fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevErrorsPage.jsx:92:28)
    at http://localhost:5174/src/dev/pages/DevErrorsPage.jsx:121:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/system: System health fetch error: TypeError: Failed to fetch
    at loadHealth (http://localhost:5174/src/dev/pages/DevSystemPage.jsx:18:28)
    at http://localhost:5174/src/dev/pages/DevSystemPage.jsx:29:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/errors: System health fetch error: TypeError: Failed to fetch
    at loadHealth (http://localhost:5174/src/dev/pages/DevSystemPage.jsx:18:28)
    at http://localhost:5174/src/dev/pages/DevSystemPage.jsx:29:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/errors: API usage fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevApiPage.jsx:81:28)
    at http://localhost:5174/src/dev/pages/DevApiPage.jsx:114:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/dashboard: Logs fetch error: TypeError: Failed to fetch
    at loadLogs (http://localhost:5174/src/dev/pages/DevLogsPage.jsx:22:28)
    at http://localhost:5174/src/dev/pages/DevLogsPage.jsx:38:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/system: Logs fetch error: TypeError: Failed to fetch
    at loadLogs (http://localhost:5174/src/dev/pages/DevLogsPage.jsx:22:28)
    at http://localhost:5174/src/dev/pages/DevLogsPage.jsx:38:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/errors: Logs fetch error: TypeError: Failed to fetch
    at loadLogs (http://localhost:5174/src/dev/pages/DevLogsPage.jsx:22:28)
    at http://localhost:5174/src/dev/pages/DevLogsPage.jsx:38:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/logs: Logs fetch error: TypeError: Failed to fetch
    at loadLogs (http://localhost:5174/src/dev/pages/DevLogsPage.jsx:22:28)
    at http://localhost:5174/src/dev/pages/DevLogsPage.jsx:38:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/logs: System health fetch error: TypeError: Failed to fetch
    at loadHealth (http://localhost:5174/src/dev/pages/DevSystemPage.jsx:18:28)
    at http://localhost:5174/src/dev/pages/DevSystemPage.jsx:29:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/logs: API usage fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevApiPage.jsx:81:28)
    at http://localhost:5174/src/dev/pages/DevApiPage.jsx:114:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/dashboard: API usage fetch error: AbortError: signal is aborted without reason
    at http://localhost:5174/src/dev/pages/DevApiPage.jsx:115:27
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12911:5)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListUnmount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6645:149)
    at commitHookPassiveUnmountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6658:55)
    at commitPassiveUnmountEffectsInsideOfDeletedTree_begin (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7867:7)
    at recursivelyTraversePassiveUnmountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7786:6)
    at commitPassiveUnmountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7817:14)
    at recursivelyTraversePassiveUnmountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7792:103)
    at commitPassiveUnmountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7800:6)
- [developer] /dev-console/system: API usage fetch error: AbortError: signal is aborted without reason
    at http://localhost:5174/src/dev/pages/DevApiPage.jsx:115:27
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12911:5)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListUnmount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6645:149)
    at commitHookPassiveUnmountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6658:55)
    at commitPassiveUnmountEffectsInsideOfDeletedTree_begin (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7867:7)
    at recursivelyTraversePassiveUnmountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7786:6)
    at commitPassiveUnmountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7817:14)
    at recursivelyTraversePassiveUnmountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7792:103)
    at commitPassiveUnmountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7800:6)
- [developer] /dev-console/errors: API usage fetch error: AbortError: signal is aborted without reason
    at http://localhost:5174/src/dev/pages/DevApiPage.jsx:115:27
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12911:5)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListUnmount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6645:149)
    at commitHookPassiveUnmountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6658:55)
    at commitPassiveUnmountEffectsInsideOfDeletedTree_begin (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7867:7)
    at recursivelyTraversePassiveUnmountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7786:6)
    at commitPassiveUnmountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7817:14)
    at recursivelyTraversePassiveUnmountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7792:103)
    at commitPassiveUnmountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7800:6)
- [developer] /dev-console/logs: API usage fetch error: AbortError: signal is aborted without reason
    at http://localhost:5174/src/dev/pages/DevApiPage.jsx:115:27
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12911:5)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListUnmount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6645:149)
    at commitHookPassiveUnmountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6658:55)
    at commitPassiveUnmountEffectsInsideOfDeletedTree_begin (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7867:7)
    at recursivelyTraversePassiveUnmountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7786:6)
    at commitPassiveUnmountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7817:14)
    at recursivelyTraversePassiveUnmountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7792:103)
    at commitPassiveUnmountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7800:6)
- [developer] /dev-console/api-usage: API usage fetch error: AbortError: signal is aborted without reason
    at http://localhost:5174/src/dev/pages/DevApiPage.jsx:115:27
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12911:5)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListUnmount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6645:149)
    at commitHookPassiveUnmountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6658:55)
    at commitPassiveUnmountEffectsInsideOfDeletedTree_begin (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7867:7)
    at recursivelyTraversePassiveUnmountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7786:6)
    at commitPassiveUnmountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7817:14)
    at recursivelyTraversePassiveUnmountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7792:103)
    at commitPassiveUnmountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7800:6)
- [developer] /dev-console/api-usage: System health fetch error: TypeError: Failed to fetch
    at loadHealth (http://localhost:5174/src/dev/pages/DevSystemPage.jsx:18:28)
    at http://localhost:5174/src/dev/pages/DevSystemPage.jsx:29:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/system: Logs fetch error: TypeError: Failed to fetch
    at loadLogs (http://localhost:5174/src/dev/pages/DevLogsPage.jsx:22:28)
    at http://localhost:5174/src/dev/pages/DevLogsPage.jsx:38:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/errors: Logs fetch error: TypeError: Failed to fetch
    at loadLogs (http://localhost:5174/src/dev/pages/DevLogsPage.jsx:22:28)
    at http://localhost:5174/src/dev/pages/DevLogsPage.jsx:38:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/logs: Logs fetch error: TypeError: Failed to fetch
    at loadLogs (http://localhost:5174/src/dev/pages/DevLogsPage.jsx:22:28)
    at http://localhost:5174/src/dev/pages/DevLogsPage.jsx:38:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/api-usage: Logs fetch error: TypeError: Failed to fetch
    at loadLogs (http://localhost:5174/src/dev/pages/DevLogsPage.jsx:22:28)
    at http://localhost:5174/src/dev/pages/DevLogsPage.jsx:38:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/system: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/errors: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/logs: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/api-usage: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/live-activity: System health fetch error: TypeError: Failed to fetch
    at loadHealth (http://localhost:5174/src/dev/pages/DevSystemPage.jsx:18:28)
    at http://localhost:5174/src/dev/pages/DevSystemPage.jsx:29:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/dashboard: Live activity fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevActivityPage.jsx:34:28)
    at http://localhost:5174/src/dev/pages/DevActivityPage.jsx:45:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/system: Live activity fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevActivityPage.jsx:34:28)
    at http://localhost:5174/src/dev/pages/DevActivityPage.jsx:45:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/errors: Live activity fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevActivityPage.jsx:34:28)
    at http://localhost:5174/src/dev/pages/DevActivityPage.jsx:45:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/logs: Live activity fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevActivityPage.jsx:34:28)
    at http://localhost:5174/src/dev/pages/DevActivityPage.jsx:45:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/api-usage: Live activity fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevActivityPage.jsx:34:28)
    at http://localhost:5174/src/dev/pages/DevActivityPage.jsx:45:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/live-activity: Live activity fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevActivityPage.jsx:34:28)
    at http://localhost:5174/src/dev/pages/DevActivityPage.jsx:45:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/api-usage: API usage fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevApiPage.jsx:81:28)
    at http://localhost:5174/src/dev/pages/DevApiPage.jsx:114:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/live-activity: API usage fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevApiPage.jsx:81:28)
    at http://localhost:5174/src/dev/pages/DevApiPage.jsx:114:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/traces: System health fetch error: TypeError: Failed to fetch
    at loadHealth (http://localhost:5174/src/dev/pages/DevSystemPage.jsx:18:28)
    at http://localhost:5174/src/dev/pages/DevSystemPage.jsx:29:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/dashboard: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/system: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/errors: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/logs: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/api-usage: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/live-activity: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/traces: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7704:6)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
    at reconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7716:14)
    at recursivelyTraverseReconnectPassiveEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7691:5)
- [developer] /dev-console/traces: API usage fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevApiPage.jsx:81:28)
    at http://localhost:5174/src/dev/pages/DevApiPage.jsx:114:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/schools: System health fetch error: TypeError: Failed to fetch
    at loadHealth (http://localhost:5174/src/dev/pages/DevSystemPage.jsx:18:28)
    at http://localhost:5174/src/dev/pages/DevSystemPage.jsx:29:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/schools: API usage fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevApiPage.jsx:81:28)
    at http://localhost:5174/src/dev/pages/DevApiPage.jsx:114:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/errors: Live activity fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevActivityPage.jsx:34:28)
    at http://localhost:5174/src/dev/pages/DevActivityPage.jsx:45:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/logs: Live activity fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevActivityPage.jsx:34:28)
    at http://localhost:5174/src/dev/pages/DevActivityPage.jsx:45:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/api-usage: Live activity fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevActivityPage.jsx:34:28)
    at http://localhost:5174/src/dev/pages/DevActivityPage.jsx:45:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/live-activity: Live activity fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevActivityPage.jsx:34:28)
    at http://localhost:5174/src/dev/pages/DevActivityPage.jsx:45:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/traces: Live activity fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevActivityPage.jsx:34:28)
    at http://localhost:5174/src/dev/pages/DevActivityPage.jsx:45:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/schools: Live activity fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevActivityPage.jsx:34:28)
    at http://localhost:5174/src/dev/pages/DevActivityPage.jsx:45:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/live-activity: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/traces: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/schools: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/users: API usage fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevApiPage.jsx:81:28)
    at http://localhost:5174/src/dev/pages/DevApiPage.jsx:114:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/users: Live activity fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevActivityPage.jsx:34:28)
    at http://localhost:5174/src/dev/pages/DevActivityPage.jsx:45:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/users: System health fetch error: TypeError: Failed to fetch
    at loadHealth (http://localhost:5174/src/dev/pages/DevSystemPage.jsx:18:28)
    at http://localhost:5174/src/dev/pages/DevSystemPage.jsx:29:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/voice-messages: System health fetch error: TypeError: Failed to fetch
    at loadHealth (http://localhost:5174/src/dev/pages/DevSystemPage.jsx:18:28)
    at http://localhost:5174/src/dev/pages/DevSystemPage.jsx:29:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/voice-messages: API usage fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevApiPage.jsx:81:28)
    at http://localhost:5174/src/dev/pages/DevApiPage.jsx:114:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/voice-messages: Live activity fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevActivityPage.jsx:34:28)
    at http://localhost:5174/src/dev/pages/DevActivityPage.jsx:45:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/users: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/voice-messages: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/data-explorer: API usage fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevApiPage.jsx:81:28)
    at http://localhost:5174/src/dev/pages/DevApiPage.jsx:114:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/data-explorer: Live activity fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevActivityPage.jsx:34:28)
    at http://localhost:5174/src/dev/pages/DevActivityPage.jsx:45:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/data-explorer: System health fetch error: TypeError: Failed to fetch
    at loadHealth (http://localhost:5174/src/dev/pages/DevSystemPage.jsx:18:28)
    at http://localhost:5174/src/dev/pages/DevSystemPage.jsx:29:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/system-controls: System health fetch error: TypeError: Failed to fetch
    at loadHealth (http://localhost:5174/src/dev/pages/DevSystemPage.jsx:18:28)
    at http://localhost:5174/src/dev/pages/DevSystemPage.jsx:29:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/system-controls: API usage fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevApiPage.jsx:81:28)
    at http://localhost:5174/src/dev/pages/DevApiPage.jsx:114:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/system-controls: Live activity fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevActivityPage.jsx:34:28)
    at http://localhost:5174/src/dev/pages/DevActivityPage.jsx:45:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/data-explorer: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/system-controls: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/audit-logs: System health fetch error: TypeError: Failed to fetch
    at loadHealth (http://localhost:5174/src/dev/pages/DevSystemPage.jsx:18:28)
    at http://localhost:5174/src/dev/pages/DevSystemPage.jsx:29:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/audit-logs: API usage fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevApiPage.jsx:81:28)
    at http://localhost:5174/src/dev/pages/DevApiPage.jsx:114:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [developer] /dev-console/audit-logs: Traces fetch error: TypeError: Failed to fetch
    at load (http://localhost:5174/src/dev/pages/DevTracesPage.jsx:17:28)
    at http://localhost:5174/src/dev/pages/DevTracesPage.jsx:28:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7675:14)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)

## Failed APIs
- none

## UI Issues
- [developer] /dev-console/dashboard zero_size_ui_elements
- [developer] /dev-console/dashboard button_click_failed
- [developer] /dev-console/dashboard button_click_failed
- [developer] /dev-console/dashboard button_click_failed
- [developer] /dev-console/dashboard zero_size_ui_elements
- [developer] /dev-console/system zero_size_ui_elements
- [developer] /dev-console/system button_click_failed
- [developer] /dev-console/system button_click_failed
- [developer] /dev-console/system button_click_failed
- [developer] /dev-console/system zero_size_ui_elements
- [developer] /dev-console/errors zero_size_ui_elements
- [developer] /dev-console/errors button_click_failed
- [developer] /dev-console/errors zero_size_ui_elements
- [developer] /dev-console/logs zero_size_ui_elements
- [developer] /dev-console/logs missing_data_table
- [developer] /dev-console/logs button_click_failed
- [developer] /dev-console/logs button_click_failed
- [developer] /dev-console/logs button_click_failed
- [developer] /dev-console/logs zero_size_ui_elements
- [developer] /dev-console/logs missing_data_table
- [developer] /dev-console/api-usage zero_size_ui_elements
- [developer] /dev-console/api-usage button_click_failed
- [developer] /dev-console/api-usage button_click_failed
- [developer] /dev-console/api-usage button_click_failed
- [developer] /dev-console/api-usage zero_size_ui_elements
- [developer] /dev-console/live-activity zero_size_ui_elements
- [developer] /dev-console/live-activity button_click_failed
- [developer] /dev-console/live-activity zero_size_ui_elements
- [developer] /dev-console/traces zero_size_ui_elements
- [developer] /dev-console/traces button_click_failed
- [developer] /dev-console/traces button_click_failed
- [developer] /dev-console/traces button_click_failed
- [developer] /dev-console/traces zero_size_ui_elements
- [developer] /dev-console/schools zero_size_ui_elements
- [developer] /dev-console/schools button_click_failed
- [developer] /dev-console/schools zero_size_ui_elements
- [developer] /dev-console/users zero_size_ui_elements
- [developer] /dev-console/users button_click_failed
- [developer] /dev-console/users button_click_failed
- [developer] /dev-console/users zero_size_ui_elements
- [developer] /dev-console/voice-messages zero_size_ui_elements
- [developer] /dev-console/voice-messages button_click_failed
- [developer] /dev-console/voice-messages zero_size_ui_elements
- [developer] /dev-console/data-explorer zero_size_ui_elements
- [developer] /dev-console/data-explorer button_click_failed
- [developer] /dev-console/data-explorer zero_size_ui_elements
- [developer] /dev-console/system-controls zero_size_ui_elements
- [developer] /dev-console/system-controls button_click_failed
- [developer] /dev-console/system-controls zero_size_ui_elements
- [developer] /dev-console/audit-logs zero_size_ui_elements
- [developer] /dev-console/audit-logs button_click_failed
- [developer] /dev-console/audit-logs button_click_failed
- [developer] /dev-console/audit-logs button_click_failed
- [developer] /dev-console/audit-logs zero_size_ui_elements
