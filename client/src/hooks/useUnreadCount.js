import { useCallback, useEffect, useState } from "react";
import { refreshUnreadCount, subscribeUnreadCount } from "../services/unreadNotificationService";

export default function useUnreadCount(token, options = {}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const pollIntervalMs = options.pollIntervalMs;
  const immediate = options.immediate ?? true;

  useEffect(() => {
    const unsubscribe = subscribeUnreadCount({
      token,
      onChange: setUnreadCount,
      pollIntervalMs,
      immediate,
    });
    return unsubscribe;
  }, [token, pollIntervalMs, immediate]);

  const refresh = useCallback(() => refreshUnreadCount(token), [token]);
  return { unreadCount, refreshUnreadCount: refresh };
}
