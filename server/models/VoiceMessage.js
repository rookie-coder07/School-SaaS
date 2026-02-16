import { ObjectId } from "mongodb";

/**
 * VoiceMessage Model
 * Stores voice broadcast messages sent by admins to teachers and students
 * 
 * Schema:
 * {
 *   _id: ObjectId,
 *   schoolId: ObjectId,      // School that this message belongs to
 *   senderRole: "ADMIN",      // Role of who sent it
 *   senderId: ObjectId,       // User ID of the sender (admin)
 *   title: String,            // Optional title for the announcement
 *   audioUrl: String,         // Path to the audio file (/uploads/voice/filename.webm)
 *   audioDuration: Number,    // Duration in seconds
 *   fileSize: Number,         // File size in bytes
 *   createdAt: Date,          // When the message was created
 *   updatedAt: Date
 * }
 */
export default function VoiceMessageModel(db) {
  return db.collection("voice_messages");
}
