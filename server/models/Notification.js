import { ObjectId } from "mongodb";

/**
 * Notification Model
 * Handles all notification-related database operations
 */
export default function NotificationModel(db) {
  const collection = db.collection("notifications");

  return {
    // Get collection reference
    getCollection: () => collection,

    // Create a new notification
    async createNotification(data) {
      const notification = {
        title: data.title,
        message: data.message,
        type: data.type || "info", // voice | homework | event | announcement | timetable | syllabus | marks | attendance
        targetRole: data.targetRole, // admin | teacher | student
        targetUser: data.targetUser ? new ObjectId(data.targetUser) : null, // null = broadcast to role
        schoolId: data.schoolId ? new ObjectId(data.schoolId) : null,
        createdBy: data.createdBy ? new ObjectId(data.createdBy) : null, // who created it
        targetRoute: data.targetRoute || null, // where to navigate on click (e.g., /student/dashboard?section=homework)
        isRead: false,
        readAt: null,
        createdAt: new Date(),
        metadata: data.metadata || {}, // extra data like homework id, announcement id, etc
      };

      const result = await collection.insertOne(notification);
      return { ...notification, _id: result.insertedId };
    },

    // Get notifications for a user
    async getNotificationsForUser(userId, role, schoolId, limit = 50) {
      const query = {
        $and: [
          {
            $or: [
              { targetRole: role }, // notifications for this role
              { targetRole: null }, // global notifications
            ],
          },
          {
            $or: [
              { targetUser: new ObjectId(userId) }, // personal notification
              { targetUser: null }, // broadcast to all in role
            ],
          },
        ],
      };

      // Optional: filter by schoolId if provided
      if (schoolId) {
        query.$and.push({
          $or: [
            { schoolId: new ObjectId(schoolId) },
            { schoolId: null },
          ],
        });
      }

      const notifications = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      return notifications;
    },

    // Get unread count for a user
    async getUnreadCount(userId, role, schoolId) {
      const query = {
        $and: [
          {
            $or: [
              { targetRole: role },
              { targetRole: null },
            ],
          },
          {
            $or: [
              { targetUser: new ObjectId(userId) },
              { targetUser: null },
            ],
          },
          { isRead: false },
        ],
      };

      if (schoolId) {
        query.$and.push({
          $or: [
            { schoolId: new ObjectId(schoolId) },
            { schoolId: null },
          ],
        });
      }

      const count = await collection.countDocuments(query);
      return count;
    },

    // Mark notification as read
    async markAsRead(notificationId) {
      const result = await collection.updateOne(
        { _id: new ObjectId(notificationId) },
        { $set: { isRead: true, readAt: new Date() } }
      );
      return result.modifiedCount > 0;
    },

    // Mark all notifications as read for a user
    async markAllAsRead(userId, role, schoolId) {
      const query = {
        $and: [
          {
            $or: [
              { targetRole: role },
              { targetRole: null },
            ],
          },
          {
            $or: [
              { targetUser: new ObjectId(userId) },
              { targetUser: null },
            ],
          },
          { isRead: false },
        ],
      };

      if (schoolId) {
        query.$and.push({
          $or: [
            { schoolId: new ObjectId(schoolId) },
            { schoolId: null },
          ],
        });
      }

      const result = await collection.updateMany(query, {
        $set: { isRead: true, readAt: new Date() },
      });

      return result.modifiedCount;
    },

    // Delete a notification
    async deleteNotification(notificationId) {
      const result = await collection.deleteOne({
        _id: new ObjectId(notificationId),
      });
      return result.deletedCount > 0;
    },

    // Get notification by ID
    async getNotificationById(notificationId) {
      return await collection.findOne({
        _id: new ObjectId(notificationId),
      });
    },
  };
}
