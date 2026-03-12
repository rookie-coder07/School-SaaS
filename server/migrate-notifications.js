#!/usr/bin/env node

/**
 * Notification Migration Script
 * Migrates old notifications to new schema with targetRoute field
 * 
 * Usage: node migrate-notifications.js
 */

const { MongoClient, ObjectId } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "school-app";

if (!MONGO_URI) {
  console.error("MONGO_URI is required. Set it in your environment before running this script.");
  process.exit(1);
}

async function migrateNotifications() {
  const client = new MongoClient(MONGO_URI);

  try {
    console.log("🔄 Connecting to MongoDB...");
    await client.connect();

    const db = client.db(DB_NAME);
    const notificationsCollection = db.collection("notifications");

    // Find all notifications
    console.log("📊 Fetching all notifications...");
    const allNotifications = await notificationsCollection.find({}).toArray();
    console.log(`   Found ${allNotifications.length} total notifications`);

    // Categorize notifications
    const needsType = allNotifications.filter(n => !n.targetRoute);
    console.log(`   ${needsType.length} notifications need targetRoute field`);

    // Migrate each notification
    let migratedCount = 0;

    for (const notification of needsType) {
      try {
        let targetRoute = null;

        // Determine targetRoute based on notification type
        if (notification.type === "homework" && notification.referenceId) {
          targetRoute = `/student/dashboard?section=homework&id=${notification.referenceId.toString()}`;
        } else if (notification.type === "event" && notification.referenceId) {
          targetRoute = `/student/dashboard?section=events&id=${notification.referenceId.toString()}`;
        } else if (notification.type === "voice" && notification.referenceId) {
          // Determine if for student or teacher based on role
          const role = notification.targetRole || notification.role;
          if (role === "STUDENT") {
            targetRoute = `/student/dashboard?section=voice-messages&id=${notification.referenceId.toString()}`;
          } else if (role === "TEACHER") {
            targetRoute = `/teacher/dashboard?section=announcements&id=${notification.referenceId.toString()}`;
          }
        } else if (notification.type === "timetable" && notification.referenceId) {
          targetRoute = `/student/dashboard?section=timetable`;
        } else if (notification.type === "syllabus" && notification.referenceId) {
          targetRoute = `/student/dashboard?section=syllabus&id=${notification.referenceId.toString()}`;
        } else if (notification.type === "announcement") {
          const role = notification.targetRole || notification.role;
          if (role === "TEACHER") {
            targetRoute = `/teacher/dashboard?section=announcements`;
          } else if (role === "STUDENT") {
            targetRoute = `/student/dashboard?section=announcements`;
          } else if (role === "ADMIN") {
            targetRoute = `/admin/dashboard?section=announcements`;
          }
        }

        // Update notification with targetRoute and normalize fields
        const updateData = {
          $set: {
            targetRoute,
          },
        };

        // Also normalize fields for old schema
        if (notification.userId && !notification.targetUser) {
          updateData.$set.targetUser = notification.userId;
        }
        if (notification.role && !notification.targetRole) {
          updateData.$set.targetRole = notification.role;
        }

        await notificationsCollection.updateOne(
          { _id: notification._id },
          updateData
        );

        migratedCount++;
        console.log(
          `   ✅ [${migratedCount}/${needsType.length}] Updated: ${notification._id} (type: ${notification.type}, targetRoute: ${targetRoute ? "set" : "none"})`
        );
      } catch (err) {
        console.error(
          `   ❌ Error migrating notification ${notification._id}:`,
          err.message
        );
      }
    }

    console.log("
📈 Migration Summary:");
    console.log(`   Total notifications: ${allNotifications.length}`);
    console.log(`   Notifications updated: ${migratedCount}`);
    console.log(`   Notifications skipped: ${allNotifications.length - migratedCount}`);
    console.log("   Status: ✅ Migration complete!");
  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run migration
migrateNotifications();
