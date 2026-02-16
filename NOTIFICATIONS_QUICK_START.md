# Notification System - Quick Start Guide

## 🚀 What's New?

Your School-SaaS app now has a complete **role-based notification system** with:

✅ **Notification Bell** in navbar showing unread count
✅ **Notification Dropdown** showing all messages
✅ **Auto-notifications** when admins/teachers take actions
✅ **Role-based filtering** (Admin, Teacher, Student receives different notifications)
✅ **Mark as read** functionality
✅ **Multi-tenant support** (per-school notifications)

---

## 🎯 Quick Setup

### 1. No Additional Installation Needed!

The notification system uses existing dependencies (axios, React, MongoDB). No npm packages to install.

### 2. Environment Variables

Make sure `.env` has:
- `JWT_SECRET` (for token validation)
- `MONGO_URI` (for MongoDB connection - notifications are stored here)

### 3. Restart Your Server

```bash
# Terminal 1: Backend
cd server
npm start

# Terminal 2: Frontend
cd client
npm run dev
```

---

## 📱 User Experience

### For Students:

1. **Log in** to Student Dashboard
2. **Look for 🔔 bell icon** in top-right corner
3. **See number of unread notifications** (red badge)
4. **Click bell** to open dropdown
5. **See notifications from teachers/admin:**
   - 📝 New homework assignments
   - 📅 Timetable updates
   - 🎤 Voice messages from teachers/admin
   - 📊 Marks published
6. Click notification **to mark as read** (✓ button)
7. Click **×** to delete

### For Teachers:

1. **Log in** to Teacher Dashboard
2. **Bell icon shows notifications** about admin announcements
3. **Add Homework** → 📝 Notification automatically sent to all your students
4. **Update Timetable** → 📅 Notification automatically sent to all your students
5. Click bell to see notifications from admin

### For Admin:

1. **Log in** to Admin Dashboard
2. **Voice Announcements section** → Record and broadcast message
3. Select target: **all, teachers, or students**
4. 🎤 Notifications automatically sent to recipients
5. See **Voice Message Notifications** in your bell

---

## 🧪 Testing the System

### Test 1: Admin Broadcasts Announcement

```
1. Log in as Admin
2. Go to Admin Dashboard → Voice Announcements section
3. Click Record button → Say "Hello everyone!"
4. Enter title: "Important Announcement"
5. Select "all" as broadcast target
6. Click Broadcast

Expected: 
- Admin sees success toast
- Teachers see notification: 🎤 Voice Message
- Students see notification: 🎤 Voice Message
```

### Test 2: Teacher Adds Homework

```
1. Log in as Teacher
2. Go to Teacher Dashboard → Homework tab
3. Fill in:
   - Title: "Chapter 5 Exercises"
   - Subject: "Mathematics"
   - Due Date: "2026-02-20"
   - Description: "Do problems 1-10"
4. Click "Add Homework"

Expected:
- Teacher sees success toast
- All students in teacher's class see notification: 📝 New Homework
```

### Test 3: Teacher Updates Timetable

```
1. Log in as Teacher
2. Go to Teacher Dashboard → Timetable
3. Click on any time slot (e.g., Monday, Period 1)
4. Fill in:
   - Subject: "Physics"
   - Start Time: "09:00"
   - End Time: "10:00"
5. Click "Save"

Expected:
- Teacher sees success toast
- All students in teacher's class see notification: 📅 Timetable Updated
```

### Test 4: Mark Notifications as Read

```
1. Log in as Student
2. Click bell icon (🔔)
3. See unread notifications with blue background
4. Click ✓ on one notification → It becomes gray (marked as read)
5. Click "Mark all as read" → All become gray
6. Badge count decreases
```

---

## 📊 Database Schema

Notifications are stored in MongoDB collection `notifications`:

```javascript
{
  _id: ObjectId,
  title: "New Homework",
  message: "Chapter 5 Exercises (Mathematics) - Due: 2026-02-20",
  type: "info",
  targetRole: "student", // Who sees it
  targetUser: null, // null = all of that role
  schoolId: ObjectId, // Which school
  createdBy: ObjectId, // Who created it
  isRead: false,
  readAt: null,
  createdAt: Date,
  metadata: { type: "homework", subject: "Math", dueDate: "2026-02-20" }
}
```

### Check Notifications in MongoDB:

```javascript
// In MongoDB shell or GUI
db.notifications.find({}).pretty()

// Count total notifications
db.notifications.countDocuments()

// Find unread notifications
db.notifications.find({ isRead: false })

// Find notifications for specific school
db.notifications.find({ schoolId: ObjectId("...") })
```

---

## 🔄 How It Works (Technical)

### Notification Flow:

```
Teacher adds homework
    ↓
POST /api/teacher/homework/add
    ↓
Server saves homework to DB
    ↓
Frontend calls createNotification()
    ↓
POST /api/notifications
    ↓
Server creates notification doc in MongoDB
    with targetRole: "student"
    ↓
Backend notification created ✅
    ↓
Students receive notification (on refresh or after 30s poll)
    ↓
Students see notification in bell dropdown
```

### Real-Time Updates:

Currently: **Poll every 30 seconds** (check navbar Navbar.jsx line ~30)

To change polling interval:
```jsx
// In client/src/components/Navbar.jsx
const interval = setInterval(fetchUnreadCount, 30000); // Change 30000 to your desired milliseconds
```

---

## 🛠️ Common Tasks

### Add Notification Programmatically

```javascript
// In any React component
import { createNotification } from "../utils/notificationHelper";

// Create and send notification
await createNotification(
  "📢 New Announcement",
  "Important update from administration",
  "student", // Who sees it
  "info", // Type: info, success, warning
  token, // User's JWT token
  null, // null = broadcast, or userId for specific user
  { type: "announcement" } // Metadata
);
```

### Check Unread Count

```javascript
// Backend API
GET /api/notifications/unread-count
Authorization: Bearer {token}

// Returns:
{ "unreadCount": 5 }
```

### Mark All Notifications as Read

```javascript
// Backend API
PUT /api/notifications/mark-all-read
Authorization: Bearer {token}
```

---

## 📋 File Changes Summary

### New Files Created:

1. **server/models/Notification.js** - MongoDB model with helper methods
2. **client/src/components/NotificationBell.jsx** - Bell icon component
3. **client/src/components/NotificationDropdown.jsx** - Dropdown panel component
4. **client/src/utils/notificationHelper.js** - Helper functions for creating notifications
5. **NOTIFICATION_SYSTEM.md** - Complete documentation

### Modified Files:

1. **server/server.js** - Added 6 notification API endpoints (lines ~3850-4050)
2. **client/src/components/Navbar.jsx** - Added bell icon with dropdown
3. **client/src/pages/AdminDashboard.jsx** - Added notification trigger for voice messages
4. **client/src/pages/TeacherDashboard.jsx** - Added notification import + homework triggers
5. **client/src/components/TimetableGrid.jsx** - Added notification import + timetable triggers

---

## ⚠️ Troubleshooting

### Issue: Notifications not appearing

**Solution:**
1. Check **browser console** for errors (F12 → Console)
2. Verify user is **logged in** (check localStorage for token)
3. Hard refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
4. Check **server logs** for API errors
5. Verify **targetRole matches user role** (admin, teacher, student)

### Issue: Unread count not updating

**Solution:**
1. Wait up to **30 seconds** (polling interval)
2. Hard refresh browser
3. Check MongoDB connection (MONGO_URI in .env)
4. Look for  JavaScript errors in console

### Issue: Notifications stored but not in MongoDB

**Solution:**
1. Verify **MONGO_URI is set** in .env
2. Check **MongoDB is running**
3. Look in server logs for connection errors
4. Default: Falls back to in-memory storage if MongoDB unavailable

---

## 📈 Next Steps

### Future Enhancements:

1. **Real-time Updates** (Socket.io)
   - Notifications appear instantly
   - No polling needed
   
2. **Push Notifications**
   - Browser push notifications
   - Mobile app support
   
3. **Email Digest**
   - Daily/weekly email summary
   
4. **Notification Preferences**
   - Users can mute certain types
   - Set do-not-disturb hours

5. **Advanced Analytics**
   - Track notification read rates
   - Dashboard showing notification history

---

## 🎉 You're All Set!

The notification system is **fully integrated and ready to use**.

### What to do now:

1. ✅ Test the system using the test cases above
2. ✅ Check MongoDB to see notifications being created
3. ✅ Show the feature to stakeholders
4. ✅ Plan for future enhancements (real-time, push, etc.)

---

## 📚 More Information

For detailed technical documentation, see: **NOTIFICATION_SYSTEM.md**

For API route details, see notifications endpoints in **server/server.js** (lines ~3850+)

Happy notifying! 🚀
