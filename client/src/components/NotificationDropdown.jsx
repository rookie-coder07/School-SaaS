import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import EmptyState from "./ui/EmptyState";
import { ListSkeleton } from "./ui/Skeleton";
import { motion } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL;

/**
 * NotificationDropdown Component
 * Displays a list of notifications with ability to mark as read and navigate
 */
export default function NotificationDropdown({
  isOpen,
  onClose,
  token,
  toast,
  onNotificationsUpdated,
  showBackdrop = true,
}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [undoStack, setUndoStack] = useState([]);
  const [undoing, setUndoing] = useState(false);
  const navigate = useNavigate();

  // Fetch notifications when dropdown opens
  const fetchNotifications = useCallback(async (nextPage = 1, replace = false) => {
    try {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      const response = await axios.get(`${API_URL}/api/notifications?page=${nextPage}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log("📬 Notifications fetched:", response.data);
      console.log("   Total notifications:", response.data.notifications?.length || 0);
      console.log("   Unread count from API:", response.data.unreadCount || 0);
      console.log("   Sample notification fields:", response.data.notifications?.[0] ? Object.keys(response.data.notifications[0]) : "No notifications");
      
      const incoming = response.data.notifications || [];
      setNotifications((prev) => (replace ? incoming : [...prev, ...incoming]));
      setPage(response.data.page || nextPage);
      setTotalPages(response.data.totalPages || 1);
      
      // Immediately notify parent about the unread count
      if (onNotificationsUpdated) {
        onNotificationsUpdated();
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token, onNotificationsUpdated]);

  useEffect(() => {
    if (!isOpen || !token) return undefined;
    fetchNotifications(1, true);
    if (onNotificationsUpdated) onNotificationsUpdated();
    return undefined;
  }, [isOpen, token, fetchNotifications, onNotificationsUpdated]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await axios.put(`${API_URL}/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
      
      // Notify parent component to refresh unread count
      if (onNotificationsUpdated) {
        onNotificationsUpdated();
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.put(`${API_URL}/api/notifications/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Mark all as read in local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      
      // Notify parent component to refresh unread count
      if (onNotificationsUpdated) {
        onNotificationsUpdated();
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      const adminToken = localStorage.getItem("adminToken");
      const isAdminAction = token && adminToken && token === adminToken;
      const snapshot = notifications.find((n) => n._id === notificationId);

      if (isAdminAction) {
        const confirmed = window.confirm("This will remove this message for all teachers and students. Continue?");
        if (!confirmed) return;
      }

      const deleteUrl = isAdminAction
        ? `${API_URL}/api/admin/notifications/${notificationId}`
        : `${API_URL}/api/notifications/${notificationId}`;

      await axios.delete(deleteUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Remove from local state
      setNotifications((prev) =>
        prev.filter((n) => n._id !== notificationId)
      );
      if (isAdminAction && snapshot) {
        setUndoStack((prev) => [...prev, { type: "DELETE", model: "notification", data: snapshot, timestamp: Date.now() }]);
      }
      
      // Notify parent component to refresh unread count
      if (onNotificationsUpdated) {
        onNotificationsUpdated();
      }

      if (isAdminAction) {
        toast?.success("Message deleted for everyone", 10000, {
          actionLabel: "Undo",
          onAction: handleUndo,
        });
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
      toast?.error("Failed to delete notification");
    }
  };

  const handleUndo = async () => {
    if (!undoStack.length) return;
    const lastAction = undoStack[undoStack.length - 1];
    if (!lastAction?.data?._id) return;

    try {
      setUndoing(true);
      const res = await axios.post(
        `${API_URL}/api/admin/restore`,
        { model: "notification", data: lastAction.data },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.data?.success) throw new Error("Restore failed");

      setUndoStack((prev) => prev.slice(0, -1));
      setNotifications((prev) => [lastAction.data, ...prev]);
      toast?.success("Restored successfully");
      if (onNotificationsUpdated) onNotificationsUpdated();
    } catch (err) {
      console.error("Error undoing notification delete:", err);
      toast?.error("Failed to undo");
    } finally {
      setUndoing(false);
    }
  };

  const handleNotificationClick = (notification) => {
    // Log navigation details for debugging
    console.log("🔔 NOTIFICATION CLICKED");
    console.log("  Notification ID:", notification._id);
    console.log("  Type:", notification.type);
    console.log("  Target Route:", notification.targetRoute);
    
    // Mark as read before navigating
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }

    // Use targetRoute from notification, fallback to type-based mapping if not available
    let targetPath = notification.targetRoute;

    if (!targetPath) {
      console.warn("⚠️ No targetRoute in notification, using type mapping (fallback)");
      const navigationMap = {
        "homework": "/student/dashboard?section=homework",
        "event": "/student/dashboard?section=events",
        "announcement": "/student/dashboard?section=announcements",
        "timetable": "/student/dashboard?section=timetable",
        "exam": "/student/dashboard?section=exams",
        "syllabus": "/student/dashboard?section=syllabus",
        "voice": "/student/dashboard?section=voice",
        "attendance": "/student/dashboard?section=attendance",
      };
      targetPath = navigationMap[notification.type];
    }
    
    if (targetPath) {
      console.log("✅ Navigating to:", targetPath);
      onClose();
      navigate(targetPath);
    } else {
      console.error("❌ Could not determine target path for notification type:", notification.type);
      toast?.error("Could not open notification - invalid type");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 ${showBackdrop ? "bg-black/40" : "bg-transparent"} pointer-events-auto`}
        onClick={onClose}
      />

      {/* Dropdown Panel */}
      <motion.div
        className="pointer-events-auto absolute left-4 right-4 top-16 w-auto max-w-full glass-panel rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur-xl"
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="flex max-h-[72vh] flex-col overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/70 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-white">Notifications</h3>
              <div className="flex items-center gap-3">
                {undoStack.length > 0 && (
                  <button
                    onClick={handleUndo}
                    disabled={undoing}
                    className="text-sm text-amber-300 hover:text-amber-200 transition-colors disabled:opacity-50"
                  >
                    {undoing ? "Undoing..." : `Undo (${undoStack.length})`}
                  </button>
                )}
                {notifications.some((n) => !n.isRead) && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4">
                <ListSkeleton rows={2} />
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-400">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  tone="dark"
                  title="No notifications yet"
                  description="Your school updates will appear here."
                />
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 text-sm transition-colors cursor-pointer hover:bg-white/10 ${
                      notification.isRead
                        ? "bg-white/5"
                        : "bg-cyan-500/15"
                    }`}
                  >
                    {/* Notification Header */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0 max-w-full">
                        <p className="font-semibold text-white break-words whitespace-normal overflow-hidden [overflow-wrap:anywhere] max-w-full">
                          {notification.title}
                        </p>
                        <p className="text-sm break-words whitespace-normal overflow-hidden [overflow-wrap:anywhere] max-w-full text-gray-300 mt-1">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="ml-2 w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0" />
                      )}
                    </div>

                    {/* Notification Meta */}
                    <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
                      <span>
                        {new Date(notification.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>

                      {/* Actions */}
                      <div className="flex gap-2 items-center">
                        {notification.type === "voice" && notification.audioUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const audioUrl = notification.audioUrl.startsWith("http")
                                ? notification.audioUrl
                                : `${import.meta.env.VITE_API_URL}${notification.audioUrl}`;
                              const audio = new Audio(audioUrl);
                              audio.play().catch((err) => console.error("Error playing audio:", err));
                            }}
                            className="text-purple-300 hover:text-purple-200 transition-colors"
                            title="Play voice message"
                          >
                            Play
                          </button>
                        )}
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification._id);
                            }}
                            className="text-cyan-300 hover:text-cyan-200 transition-colors"
                            title="Mark as read"
                          >
                            Mark
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification._id);
                          }}
                          className="text-rose-300 hover:text-rose-200 transition-colors"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Type Badge */}
                    {notification.type && (
                      <div className="mt-2">
                        <span
                          className={`inline-block text-xs px-2 py-1 rounded-full ${
                            notification.type === "voice"
                              ? "bg-purple-900 text-purple-300"
                              : notification.type === "homework"
                              ? "bg-orange-900 text-orange-300"
                              : notification.type === "event"
                              ? "bg-pink-900 text-pink-300"
                              : notification.type === "announcement"
                              ? "bg-cyan-900 text-cyan-300"
                              : notification.type === "timetable"
                              ? "bg-green-900 text-green-300"
                              : notification.type === "exam"
                              ? "bg-indigo-900 text-indigo-300"
                              : notification.type === "syllabus"
                              ? "bg-indigo-900 text-indigo-300"
                              : notification.type === "attendance"
                              ? "bg-emerald-900 text-emerald-300"
                              : notification.type === "success"
                              ? "bg-green-900 text-green-300"
                              : notification.type === "warning"
                              ? "bg-yellow-900 text-yellow-300"
                              : "bg-blue-900 text-blue-300"
                          }`}
                        >
                          {notification.type === "voice"
                            ? "Voice"
                            : notification.type === "homework"
                            ? "Homework"
                            : notification.type === "event"
                            ? "Event"
                            : notification.type === "announcement"
                            ? "Announcement"
                            : notification.type === "timetable"
                            ? "Timetable"
                            : notification.type === "exam"
                            ? "Exam"
                            : notification.type === "syllabus"
                            ? "Syllabus"
                            : notification.type === "attendance"
                            ? "Attendance"
                            : notification.type}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {page < totalPages && (
                  <div className="p-3">
                    <button
                      onClick={() => fetchNotifications(page + 1, false)}
                      disabled={loadingMore}
                      className="w-full py-2 rounded-lg bg-slate-700 text-slate-100 text-sm font-semibold hover:bg-slate-600 transition disabled:opacity-50"
                    >
                      {loadingMore ? "Loading..." : "Load more"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}


