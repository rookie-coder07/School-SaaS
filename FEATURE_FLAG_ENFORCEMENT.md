# Feature Flag Enforcement Implementation

## Summary
Implemented middleware-based feature flag enforcement to block disabled modules at the backend API level.

## Files Created
- **server/middleware/checkFeature.js** - Feature flag checking middleware

## Files Modified
- **server/server.js** - Added checkFeature middleware to protected routes

## How It Works

### 1. Middleware (checkFeature.js)
```javascript
export function checkFeature(featureName)
```
- Returns a middleware function that runs before the route handler
- Checks if `school.features[featureName]` is explicitly set to `false`
- Returns 403 Forbidden with message: "This feature has been disabled by system administrator"
- Allows request if:
  - Feature object doesn't exist (backward compatibility)
  - Feature is `true` or not explicitly `false`
  - Returns 401 if schoolId not found
  - Returns 404 if school not found

### 2. Initialization
- Called `setCheckFeatureDb(db)` in `startServer()` to provide database access
- Middleware uses module-level database reference for request-time lookups

## Protected Routes

### Attendance Module
- `POST /api/teacher/attendance/save` → checkFeature("attendance")
- `POST /api/teacher/attendance/submit` → checkFeature("attendance")

### Marks/Exams Module  
- `POST /api/teacher/marks/save` → checkFeature("exams")
- `POST /api/teacher/marks/import-multi` → checkFeature("exams")
- `POST /api/teacher/marks/bulk` → checkFeature("exams")
- `POST /api/teacher/marks/manual` → checkFeature("exams")
- `POST /api/teacher/marks/import` → checkFeature("exams")
- `POST /api/teacher/exams` → checkFeature("exams")

### Homework Module
- `POST /api/teacher/homework/add` → checkFeature("homework")
- `GET /api/teacher/homework` → checkFeature("homework")
- `DELETE /api/teacher/homework/:id` → checkFeature("homework")
- `DELETE /api/admin/homework/:id` → checkFeature("homework")

### Voice Messages Module
- `POST /api/admin/voice-broadcast` → checkFeature("voiceMessages")
- `POST /api/teacher/voice-broadcast` → checkFeature("voiceMessages")
- `POST /api/admin/voice-announce` → checkFeature("voiceMessages")

### Analytics Module
- `GET /api/student/analytics` → checkFeature("analytics")
- `GET /api/teacher/students/:studentId/analytics` → checkFeature("analytics")
- `GET /api/teacher/class-analytics` → checkFeature("analytics")
- `GET /api/teacher/analytics` → checkFeature("analytics")
- `GET /api/admin/analytics` → checkFeature("analytics")
- `GET /api/admin/analytics/teachers` → checkFeature("analytics")
- `GET /api/admin/analytics/class-comparison` → checkFeature("analytics")

### Notifications/Announcements Module
- `POST /api/admin/announcements` → checkFeature("notifications")
- `DELETE /api/admin/announcements/:id` → checkFeature("notifications")
- `DELETE /api/teacher/announcements/:id` → checkFeature("notifications")

## Feature Flag States

When a developer toggles a feature flag in the Developer Console:
- **Feature Disabled** (feature = false): API returns 403 Forbidden
- **Feature Enabled** (feature = true): API allows request
- **No Features Object**: Allows request (backward compatibility for schools without feature tracking)

## Testing

### To Test Feature Enforcement
1. Use Developer Console to disable a feature: 
   ```
   PUT /api/dev/schools/:id/toggle-feature
   { "featureName": "attendance", "enabled": false }
   ```

2. Try to call protected endpoint (should return 403):
   ```
   POST /api/teacher/attendance/save
   → Response: 403 {
     "success": false,
     "message": "This feature has been disabled by system administrator"
   }
   ```

3. Re-enable the feature to restore access

## Response Codes

- **200**: Feature enabled, request processed normally
- **401**: User not authenticated or school not found
- **403**: Feature disabled for this school
- **404**: School not found
- **500**: Server error checking feature status

## Design Decisions

1. **Middleware-based**: Feature checks happen at the Express middleware level, before controller logic
2. **Database lookup**: Checks current database state, not cached (allows runtime feature toggling)
3. **Backward compatible**: Schools without feature tracking can still access endpoints
4. **Consistent placement**: Middleware added after authentication/authorization, before validators
5. **No controller changes**: Existing business logic remains untouched
