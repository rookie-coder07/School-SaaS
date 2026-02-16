/**
 * Notification Routes
 * Handle all notification-related endpoints
 */

import NotificationModel from "../models/Notification.js";

export default function setupNotificationRoutes(app, db, requireAuth) {
  const Notification = NotificationModel(db);

  // ✅ GET /api/notifications - Get notifications for current user
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = req.user.userId;
      const role = req.user.role;
      const schoolId = req.user.schoolId;

      // Get all notifications for this user
      const notifications = await Notification.getNotificationsForUser(
        userId,
        role,
        schoolId,
        50
      );

      // Get unread count
      const unreadCount = await Notification.getUnreadCount(userId, role, schoolId);

      // Convert ObjectId to string for JSON response
      const formattedNotifications = notifications.map((n) => ({
        ...n,
        _id: n._id.toString(),
        targetUser: n.targetUser?.toString() || null,
        createdBy: n.createdBy?.toString() || null,
        schoolId: n.schoolId?.toString() || null,
      }));

      res.json({
        notifications: formattedNotifications,
        unreadCount,
      });
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // ✅ POST /api/notifications - Create a new notification (Admin/System only)
  app.post("/api/notifications", requireAuth, async (req, res) => {
    try {
      const { title, message, type, targetRole, targetUser, metadata, targetRoute } = req.body;

      // Validate required fields
      if (!title || !message || !targetRole) {
        return res.status(400).json({
          error: "title, message, and targetRole are required",
        });
      }

      // Create notification
      const notification = await Notification.createNotification({
        title,
        message,
        type: type || "info",
        targetRole,
        targetUser,
        targetRoute,
        schoolId: req.user.schoolId,
        createdBy: req.user.userId,
        metadata,
      });

      res.json({
        success: true,
        notification: {
          ...notification,
          _id: notification._id.toString(),
          targetUser: notification.targetUser?.toString() || null,
          createdBy: notification.createdBy?.toString() || null,
          schoolId: notification.schoolId?.toString() || null,
        },
      });
    } catch (error) {
      console.error("❌ Error creating notification:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  // ✅ PUT /api/notifications/:id/read - Mark notification as read
  app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      const success = await Notification.markAsRead(id);

      if (!success) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.json({ success: true, message: "Notification marked as read" });
    } catch (error) {
      console.error("❌ Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // ✅ PUT /api/notifications/mark-all-read - Mark all notifications as read
  app.put("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
    try {
      const userId = req.user.userId;
      const role = req.user.role;
      const schoolId = req.user.schoolId;

      const count = await Notification.markAllAsRead(userId, role, schoolId);

      res.json({
        success: true,
        message: `${count} notifications marked as read`,
        modifiedCount: count,
      });
    } catch (error) {
      console.error("❌ Error marking all as read:", error);
      res.status(500).json({ error: "Failed to mark all as read" });
    }
  });

  // ✅ GET /api/notifications/unread-count - Get unread notification count
  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const userId = req.user.userId;
      const role = req.user.role;
      const schoolId = req.user.schoolId;

      const unreadCount = await Notification.getUnreadCount(userId, role, schoolId);

      res.json({ unreadCount });
    } catch (error) {
      console.error("❌ Error getting unread count:", error);
      res.status(500).json({ error: "Failed to get unread count" });
    }
  });

  // ✅ DELETE /api/notifications/:id - Delete a notification
  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      const success = await Notification.deleteNotification(id);

      if (!success) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.json({ success: true, message: "Notification deleted" });
    } catch (error) {
      console.error("❌ Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });
}
