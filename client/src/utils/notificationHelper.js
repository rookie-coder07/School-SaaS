import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Compute targetRoute based on type and role
 */
function computeTargetRoute(type, role) {
  const routeMap = {
    // Student routes
    student: {
      homework: "/student/dashboard?section=homework",
      event: "/student/dashboard?section=events",
      announcement: "/student/dashboard?section=announcements",
      timetable: "/student/dashboard?section=timetable",
      syllabus: "/student/dashboard?section=syllabus",
      voice: "/student/dashboard?section=voice",
      marks: "/student/dashboard?section=marks",
      attendance: "/student/dashboard?section=attendance",
    },
    // Teacher routes
    teacher: {
      homework: "/teacher/dashboard?section=homework",
      event: "/teacher/dashboard?section=events",
      announcement: "/teacher/dashboard?section=announcements",
      timetable: "/teacher/dashboard?section=timetable",
      voice: "/teacher/dashboard?section=voice",
      marks: "/teacher/dashboard?section=marks",
      attendance: "/teacher/dashboard?section=attendance",
    },
    // Admin routes
    admin: {
      announcement: "/admin/dashboard?section=announcements",
      voice: "/admin/dashboard?section=announcements",
      event: "/admin/dashboard?section=events",
      broadcast: "/admin/dashboard?section=announcements",
    },
  };

  return routeMap[role]?.[type] || null;
}

/**
 * Notification Utility Functions
 * Provides helper methods to create notifications from different parts of the app
 */

/**
 * Create a notification
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} targetRole - Target role (admin, teacher, student, all)
 * @param {string} type - Type of notification (homework, event, announcement, etc)
 * @param {string} token - JWT token
 * @param {string|null} targetUser - Optional specific user ID
 * @param {object} metadata - Additional metadata
 * @param {string} targetRoute - Optional explicit route
 * @returns {Promise}
 */
export async function createNotification(
  title,
  message,
  targetRole,
  type = "info",
  token,
  targetUser = null,
  metadata = {},
  targetRoute = null
) {
  try {
    // Compute targetRoute if not provided
    const route = targetRoute || computeTargetRoute(type, targetRole);

    console.log("📨 Creating notification:", {
      title,
      type,
      targetRole,
      route,
    });

    const response = await axios.post(
      `${API_URL}/api/notifications`,
      {
        title,
        message,
        type,
        targetRole,
        targetUser,
        targetRoute: route,
        metadata,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("✅ Notification created:", response.data.notification);
    return response.data;
  } catch (error) {
    console.error("❌ Error creating notification:", error);
    throw error;
  }
}

/**
 * Notify when admin creates an announcement
 */
export async function notifyAdminAnnouncement(title, message, token) {
  return createNotification(
    "📢 New Announcement",
    message || title,
    "student", // Notify all students
    "announcement",
    token,
    null,
    { type: "announcement" }
  );
}

/**
 * Notify when admin sends voice message
 */
export async function notifyAdminVoiceMessage(title, token, targetRole = "teacher") {
  return createNotification(
    "🎤 Voice Message from Admin",
    title,
    targetRole, // Can target teachers or students
    "voice",
    token,
    null,
    { type: "voice_message" }
  );
}

/**
 * Notify when teacher adds homework
 */
export async function notifyTeacherHomework(homeworkTitle, token) {
  return createNotification(
    "📝 New Homework",
    homeworkTitle,
    "student", // Broadcast to all students in class
    "homework",
    token,
    null,
    { type: "homework" }
  );
}

/**
 * Notify when teacher updates timetable
 */
export async function notifyTimetableUpdate(className, section, token) {
  return createNotification(
    "📅 Timetable Updated",
    `Timetable for ${className}-${section} has been updated`,
    "student",
    "timetable",
    token,
    null,
    { type: "timetable", class: className, section: section }
  );
}

/**
 * Notify when attendance is marked
 */
export async function notifyAttendanceMarked(date, className, section, token) {
  return createNotification(
    "✓ Attendance Marked",
    `Attendance for ${className}-${section} on ${date} has been marked`,
    "student",
    "attendance",
    token,
    null,
    { type: "attendance", date: date, class: className, section: section }
  );
}

/**
 * Notify when marks are uploaded
 */
export async function notifyMarksUploaded(subject, exam, className, section, token) {
  return createNotification(
    "📊 Marks Published",
    `Marks for ${subject} (${exam}) in ${className}-${section} are now available`,
    "student",
    "marks",
    token,
    null,
    { type: "marks", subject: subject, exam: exam }
  );
}

/**
 * Notify when event is created
 */
export async function notifyEventCreated(eventName, date, token) {
  return createNotification(
    "🎉 New Event",
    `${eventName} on ${date}`,
    "student",
    "event",
    token,
    null,
    { type: "event", eventName, date }
  );
}

/**
 * Notify specific user
 */
export async function notifySpecificUser(
  userId,
  title,
  message,
  type = "info",
  token,
  metadata = {},
  targetRoute = null
) {
  return createNotification(
    title,
    message,
    "student", // or applicable role
    type,
    token,
    userId,
    metadata,
    targetRoute
  );
}

/**
 * Notify when teacher sends voice message
 */
export async function notifyTeacherVoiceMessage(title, token) {
  return createNotification(
    "🎤 Voice Message from Teacher",
    title,
    "student",
    "voice",
    token,
    null,
    { type: "voice_message" }
  );
}

export default {
  createNotification,
  notifyAdminAnnouncement,
  notifyAdminVoiceMessage,
  notifyTeacherHomework,
  notifyTimetableUpdate,
  notifyAttendanceMarked,
  notifyMarksUploaded,
  notifyEventCreated,
  notifySpecificUser,
  notifyTeacherVoiceMessage,
};
