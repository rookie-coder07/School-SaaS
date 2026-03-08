# UI Crawler Report

- Generated: 2026-03-08T16:54:32.883Z
- Base URL: http://localhost:5174
- Pages tested: 12
- Console errors: 14
- React warnings: 38
- Failed APIs: 0
- Network errors: 96
- UI issues: 41
- Login failures: 0

## Pages Tested
- [admin] Dashboard (/admin/dashboard)
- [admin] Students (/admin/dashboard?section=students)
- [admin] Teachers (/admin/dashboard?section=teachers)
- [admin] Analytics (/admin/dashboard?section=analytics)
- [teacher] Dashboard (/teacher/dashboard)
- [teacher] Attendance (/teacher/dashboard?section=attendance)
- [teacher] Homework (/teacher/dashboard?section=homework)
- [developer] Dashboard (/dev-console/dashboard)
- [developer] Errors (/dev-console/errors)
- [developer] Users (/dev-console/users)
- [developer] Data Explorer (/dev-console/data-explorer)
- [developer] System Controls (/dev-console/system-controls)

## Portal Login Failures
- none

## Console Errors
- [teacher] /teacher/dashboard: MARKS FETCH ERROR: TypeError: Failed to fetch
    at fetchAllMarks (http://localhost:5174/src/pages/TeacherDashboard.jsx:547:23)
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:563:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7620:6)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [teacher] /teacher/dashboard?section=attendance: MARKS FETCH ERROR: TypeError: Failed to fetch
    at fetchAllMarks (http://localhost:5174/src/pages/TeacherDashboard.jsx:547:23)
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:563:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7620:6)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [teacher] /teacher/dashboard: SUBJECTS FETCH ERROR: TypeError: Failed to fetch
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:582:22
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:669:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7620:6)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [teacher] /teacher/dashboard?section=attendance: SUBJECTS FETCH ERROR: TypeError: Failed to fetch
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:582:22
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:669:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7620:6)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [teacher] /teacher/dashboard: SUMMARY FETCH ERROR: TypeError: Failed to fetch
    at fetchSummary (http://localhost:5174/src/pages/TeacherDashboard.jsx:941:23)
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:960:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7620:6)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [teacher] /teacher/dashboard?section=attendance: SUMMARY FETCH ERROR: TypeError: Failed to fetch
    at fetchSummary (http://localhost:5174/src/pages/TeacherDashboard.jsx:941:23)
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:960:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7620:6)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [teacher] /teacher/dashboard: MARKS EXAMS FETCH ERROR: TypeError: Failed to fetch
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:625:22
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:670:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7620:6)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [teacher] /teacher/dashboard?section=attendance: MARKS EXAMS FETCH ERROR: TypeError: Failed to fetch
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:625:22
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:670:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7620:6)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [teacher] /teacher/dashboard: HOMEWORK FETCH ERROR: TypeError: Failed to fetch
    at fetchHomework (http://localhost:5174/src/pages/TeacherDashboard.jsx:397:23)
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:413:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7620:6)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [teacher] /teacher/dashboard?section=attendance: HOMEWORK FETCH ERROR: TypeError: Failed to fetch
    at fetchHomework (http://localhost:5174/src/pages/TeacherDashboard.jsx:397:23)
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:413:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7620:6)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [teacher] /teacher/dashboard?section=homework: MARKS FETCH ERROR: TypeError: Failed to fetch
    at fetchAllMarks (http://localhost:5174/src/pages/TeacherDashboard.jsx:547:23)
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:563:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7620:6)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [teacher] /teacher/dashboard?section=homework: MARKS EXAMS FETCH ERROR: TypeError: Failed to fetch
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:625:22
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:670:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7620:6)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [teacher] /teacher/dashboard?section=homework: SUBJECTS FETCH ERROR: TypeError: Failed to fetch
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:582:22
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:669:3
    at Object.react_stack_bottom_frame (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:12907:13)
    at runWithFiberInDEV (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:854:66)
    at commitHookEffectListMount (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6620:153)
    at commitHookPassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:6655:55)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7621:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
    at commitPassiveMountOnFiber (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7620:6)
    at recursivelyTraversePassiveMountEffects (http://localhost:5174/node_modules/.vite/deps/react-dom_client.js?v=f52eea5b:7609:5)
- [teacher] /teacher/dashboard?section=homework: SUMMARY FETCH ERROR: TypeError: Failed to fetch
    at fetchSummary (http://localhost:5174/src/pages/TeacherDashboard.jsx:941:23)
    at http://localhost:5174/src/pages/TeacherDashboard.jsx:960:3
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
- [admin] /admin/dashboard zero_size_ui_elements
- [admin] /admin/dashboard button_click_failed
- [admin] /admin/dashboard button_click_failed
- [admin] /admin/dashboard button_click_failed
- [admin] /admin/dashboard button_click_failed
- [admin] /admin/dashboard button_click_failed
- [admin] /admin/dashboard?section=students zero_size_ui_elements
- [admin] /admin/dashboard?section=students button_click_failed
- [admin] /admin/dashboard?section=students button_click_failed
- [admin] /admin/dashboard?section=students button_click_failed
- [admin] /admin/dashboard?section=students button_click_failed
- [admin] /admin/dashboard?section=students button_click_failed
- [admin] /admin/dashboard?section=teachers zero_size_ui_elements
- [admin] /admin/dashboard?section=teachers button_click_failed
- [admin] /admin/dashboard?section=teachers button_click_failed
- [admin] /admin/dashboard?section=teachers button_click_failed
- [admin] /admin/dashboard?section=teachers button_click_failed
- [admin] /admin/dashboard?section=teachers button_click_failed
- [admin] /admin/dashboard?section=analytics button_click_failed
- [teacher] /teacher/dashboard zero_size_ui_elements
- [teacher] /teacher/dashboard button_click_failed
- [teacher] /teacher/dashboard button_click_failed
- [teacher] /teacher/dashboard button_click_failed
- [teacher] /teacher/dashboard button_click_failed
- [teacher] /teacher/dashboard?section=attendance zero_size_ui_elements
- [teacher] /teacher/dashboard?section=attendance button_click_failed
- [teacher] /teacher/dashboard?section=homework zero_size_ui_elements
- [teacher] /teacher/dashboard?section=homework button_click_failed
- [teacher] /teacher/dashboard?section=homework zero_size_ui_elements
- [developer] /dev-console/dashboard zero_size_ui_elements
- [developer] /dev-console/dashboard zero_size_ui_elements
- [developer] /dev-console/errors zero_size_ui_elements
- [developer] /dev-console/errors zero_size_ui_elements
- [developer] /dev-console/errors missing_data_table
- [developer] /dev-console/users zero_size_ui_elements
- [developer] /dev-console/users button_click_failed
- [developer] /dev-console/users zero_size_ui_elements
- [developer] /dev-console/data-explorer zero_size_ui_elements
- [developer] /dev-console/data-explorer zero_size_ui_elements
- [developer] /dev-console/system-controls zero_size_ui_elements
- [developer] /dev-console/system-controls zero_size_ui_elements
