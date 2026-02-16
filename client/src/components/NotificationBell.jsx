import { useEffect, useState } from "react";

/**
 * NotificationBell Component
 * Shows a bell icon with unread count badge
 * Triggers opening of notification dropdown
 */
export default function NotificationBell({ onClick, unreadCount = 0, isOpen = false }) {
  const [displayCount, setDisplayCount] = useState(unreadCount);

  useEffect(() => {
    setDisplayCount(unreadCount);
    if (unreadCount > 0) {
      console.log(
        `🔔 NotificationBell updated - unreadCount: ${unreadCount}, isOpen: ${isOpen}`
      );
    }
  }, [unreadCount, isOpen]);

  return (
    <button
      onClick={onClick}
      className={`relative p-2 transition-colors rounded-lg ${
        isOpen 
          ? "bg-amber-100 text-amber-600" 
          : displayCount > 0 
          ? "text-amber-500 hover:text-amber-400 hover:bg-amber-50" 
          : "text-gray-600 hover:text-gray-700 hover:bg-gray-100"
      }`}
      title={displayCount > 0 ? `${displayCount} unread notifications` : "Notifications"}
      aria-label={displayCount > 0 ? `Notifications: ${displayCount} unread` : "Notifications"}
      aria-pressed={isOpen}
    >
      {/* Bell Icon */}
      <svg
        className={`w-6 h-6 transition-transform ${isOpen ? "scale-110" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      {/* Unread Count Badge - Only show if count > 0 */}
      {displayCount > 0 && (
        <span
          className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[20px] h-5 shadow-md"
          aria-live="polite"
          aria-atomic="true"
        >
          {displayCount > 99 ? "99+" : displayCount}
        </span>
      )}
    </button>
  );
}
