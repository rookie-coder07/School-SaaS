# Role-Based Notification System Documentation

## Overview

A complete role-based notification system has been implemented across the School-SaaS application, allowing admins, teachers, and students to receive relevant notifications based on their role.

## Features Implemented

### ✅ Backend Components

#### 1. **Notification Model** (`server/models/Notification.js`)

Provides MongoDB schema and helper methods for notification operations:

```javascript
Notification {
  _id: ObjectId,
  title: String,
  message: String,
  type: "info" | "warning" | "success",
  targetRole: "admin" | "teacher" | "student" | null (broadcast),
  targetUser: ObjectId | null (specific user),
  schoolId: ObjectId | null,
  createdBy: ObjectId (who created the notification),
  isRead: Boolean,
  readAt: Date,
  createdAt: Date,
  metadata: Object (extra data like homework id, etc)
}
```

**Methods:**
- `createNotification(data)` - Create a new notification
- `getNotificationsForUser(userId, role, schoolId, limit)` - Get user's notifications
- `getUnreadCount(userId, role, schoolId)` - Get unread count
- `markAsRead(notificationId)` - Mark single notification as read
- `markAllAsRead(userId, role, schoolId)` - Mark all as read
- `deleteNotification(notificationId)` - Delete a notification

#### 2. **Notification API Routes** (in `server.js`)

Six endpoints for notification management:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/notifications` | Fetch all notifications for current user |
| POST | `/api/notifications` | Create a new notification |
| PUT | `/api/notifications/:id/read` | Mark single notification as read |
| PUT | `/api/notifications/mark-all-read` | Mark all notifications as read |
| GET | `/api/notifications/unread-count` | Get unread notification count |
| DELETE | `/api/notifications/:id` | Delete a notification |

**All endpoints require authentication** via `requireAuth` middleware.

### ✅ Frontend Components

#### 1. **NotificationBell Component** (`client/src/components/NotificationBell.jsx`)

A bell icon with unread count badge:
- Shows unread count as a red badge (e.g., "5", "99+")
- Changes color when dropdown is open
- Responsive and accessible (with title and aria-label)

**Usage:**
```jsx
<NotificationBell 
  onClick={() => setShowNotifications(!showNotifications)}
  unreadCount={unreadCount}
  isOpen={showNotifications}
/>
```

#### 2. **NotificationDropdown Component** (`client/src/components/NotificationDropdown.jsx`)

A dropdown panel displaying notifications:
- Shows up to 50 recent notifications
- Displays unread notifications with blue background
- Allows marking individual notifications as read
- Allows marking all notifications as read
- Can delete notifications
- Shows notification type (info, success, warning) with color-coded badges
- Auto-fetches notifications when opened

**Features:**
- Real-time unread indicator
- Formatted timestamps
- Type badges
- Click-to-dismiss functionality
- Type breakdown by color (blue for info, green for success, yellow for warning)

#### 3. **Updated Navbar** (`client/src/components/Navbar.jsx`)

Enhanced with:
- Notification bell icon (only visible when logged in)
- Auto-updates unread count every 30 seconds
- Click to open/close notification dropdown
- Integrated NotificationDropdown component

### ✅ Notification Utility Library (`client/src/utils/notificationHelper.js`)

Helper functions for creating notifications throughout the app:

```javascript
// Main function
createNotification(title, message, targetRole, type, token, targetUser, metadata)

// Convenience functions for specific scenarios:
notifyAdminAnnouncement(title, token)
notifyAdminVoiceMessage(title, token)
notifyTeacherHomework(homeworkTitle, token)
notifyTimetableUpdate(className, section, token)
notifyAttendanceMarked(date, className, section, token)
notifyMarksUploaded(subject, exam, className, section, token)
notifySpecificUser(userId, title, message, type, token, metadata)
```

### ✅ Integrated Notification Triggers

#### Admin Dashboard - Voice Announcements
When admin broadcasts a voice message:
- 🎤 Notification created for target recipients
- Title: "Voice Message from Admin"
- Metadata includes audio URL

**Location:** `AdminDashboard.jsx` line ~1498

#### Teacher Dashboard - Homework
When teacher adds homework:
- 📝 Notification created for all students
- Title includes homework title and subject
- Metadata includes subject and due date

**Location:** `TeacherDashboard.jsx` line ~745

#### TimetableGrid - Timetable Updates
When teacher updates timetable:
- 📅 Notification created for all students
- Title includes day and period
- Metadata includes day, period, and subject

**Location:** `TimetableGrid.jsx` line ~80

## How to Use

### For Admin - Sending Announcements

1. Go to **Admin Dashboard → Voice Announcements**
2. Record a voice message
3. Enter a title (optional)
4. Select broadcast target (all, teachers, or students)
5. Click **Broadcast**
6. ✅ Notification is automatically sent to recipients

### For Teachers - Adding Homework

1. Go to **Teacher Dashboard → Homework**
2. Fill in:
   - Title
   - Subject
   - Due Date
   - Description (optional)
3. Click **Add Homework**
4. ✅ Notification is automatically sent to all students

### For Teachers - Updating Timetable

1. Go to **Teacher Dashboard → Timetable**
2. Click on a time slot
3. Fill in:
   - Subject
   - Start Time
   - End Time
4. Click **Save**
5. ✅ Notification is automatically sent to all students

### For All Users - Checking Notifications

1. Look for the **bell icon** in the top-right navbar
2. Red badge shows number of unread notifications
3. Click bell to open dropdown
4. Click notification to mark as read
5. Use **Mark all as read** button to bulk-update
6. Click **×** to delete individual notifications

## Role-Based Filtering

Notifications are automatically filtered by role:

| Role | Sees Notifications For |
|------|------------------------|
| Admin | Broadcast + Admin-specific |
| Teacher | Broadcast + Teacher-specific |
| Student | Broadcast + Student-specific |

## Notification Types

Three notification types with distinct styling:

- **info** (blue) - General information
- **success** (green) - Successful actions
- **warning** (yellow) - Important alerts

## Database Schema

Notifications collection in MongoDB:

```json
{
  "_id": "ObjectId",
  "title": "New Homework",
  "message": "Math homework - Due tomorrow",
  "type": "info",
  "targetRole": "student",
  "targetUser": null,
  "schoolId": "ObjectId",
  "createdBy": "ObjectId",
  "isRead": false,
  "createdAt": "2026-02-15T10:30:00Z",
  "metadata": {
    "type": "homework",
    "subject": "Math",
    "dueDate": "2026-02-16"
  }
}
```

## API Examples

### Fetch Notifications

```bash
GET /api/notifications
Authorization: Bearer {token}

Response:
{
  "notifications": [...],
  "unreadCount": 3
}
```

### Create Notification (Manual)

```bash
POST /api/notifications
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "title": "Important Update",
  "message": "Check the announcement board",
  "type": "info",
  "targetRole": "student",
  "targetUser": null,
  "metadata": {}
}
```

### Mark as Read

```bash
PUT /api/notifications/{id}/read
Authorization: Bearer {token}
```

### Mark All as Read

```bash
PUT /api/notifications/mark-all-read
Authorization: Bearer {token}
```

### Get Unread Count

```bash
GET /api/notifications/unread-count
Authorization: Bearer {token}

Response:
{
  "unreadCount": 5
}
```

### Delete Notification

```bash
DELETE /api/notifications/{id}
Authorization: Bearer {token}
```

## Future Enhancement Ideas

### Real-Time Notifications
- Implement Socket.io for real-time updates
- Notifications appear instantly without refreshing
- Live unread count updates

### Push Notifications
- Send browser push notifications
- Mobile app notifications
- Email digest notifications

### Advanced Filtering
- Filter by notification type
- Filter by role
- Search notifications

### Notification Settings
- User can mute certain notification types
- Schedule do-not-disturb hours
- Notification frequency preferences

### Notification History
- Archive old notifications
- Export notification history
- Notification analytics

## Testing

### Manual Testing Checklist

- [ ] Admin can send voice messages → notifications appear for recipients
- [ ] Teacher can add homework → notifications appear for students
- [ ] Teacher can update timetable → notifications appear for students
- [ ] Students see unread count badge
- [ ] Clicking notification marks it as read
- [ ] Mark all as read works correctly
- [ ] Notifications filter by role correctly
- [ ] Logged-out users don't see notification bell
- [ ] Notifications persist across page refresh
- [ ] Different notification types show correct colors

### Automated Testing (Optional)

Create test files:
- `test/notifications.api.test.js` - Test API endpoints
- `test/notificationHelper.test.js` - Test utility functions
- `test/NotificationBell.test.jsx` - Test React components

## Troubleshooting

### Notifications not appearing

1. **Check token:** Ensure user is logged in
2. **Check targetRole:** Verify targetRole matches user's role
3. **Check schoolId:** Verify notification's schoolId matches user's schoolId
4. **Check console:** Look for error messages in browser console

### Unread count not updating

1. **Hard refresh:** Press Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. **Clear cache:** Clear browser cache and reload
3. **Check poll interval:** Currently polls every 30 seconds (modifiable in Navbar.jsx)

### Notifications not creating

1. **Check server logs:** Look for errors in server console
2. **Check token validity:** Token may have expired
3. **Check required fields:** All required fields (title, message, targetRole) must be provided

## File Structure

```
├── server/
│   ├── models/
│   │   └── Notification.js (new)
│   └── server.js (updated - added notification routes)
│
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── NotificationBell.jsx (new)
    │   │   ├── NotificationDropdown.jsx (new)
    │   │   ├── Navbar.jsx (updated)
    │   │   └── TimetableGrid.jsx (updated with notifications)
    │   │
    │   ├── pages/
    │   │   ├── AdminDashboard.jsx (updated with notifications)
    │   │   └── TeacherDashboard.jsx (updated with notifications)
    │   │
    │   └── utils/
    │       └── notificationHelper.js (new)
```

## Summary

The notification system is now fully integrated into the School-SaaS platform with:

✅ Complete backend API for notification management
✅ Role-based filtering (admin, teacher, student)  
✅ Beautiful frontend components (bell, dropdown)
✅ Automatic triggers for key actions (announcements, homework, timetable)
✅ Unread badge on bell icon
✅ Mark as read functionality
✅ Multi-tenancy support (per-school notifications)

The system is production-ready and can be extended with real-time updates, push notifications, and advanced filtering as needed.
