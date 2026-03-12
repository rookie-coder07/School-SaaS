import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const DEFAULT_POLL_INTERVAL_MS = 30000;

let activeToken = "";
let unreadCount = 0;
let inFlightRequest = null;
let pollTimer = null;
const subscribers = new Set();

function notifySubscribers() {
  subscribers.forEach((subscriber) => {
    subscriber.onChange(unreadCount);
  });
}

function getEffectivePollInterval() {
  let pollIntervalMs = DEFAULT_POLL_INTERVAL_MS;
  subscribers.forEach((subscriber) => {
    pollIntervalMs = Math.min(pollIntervalMs, Math.max(5000, Number(subscriber.pollIntervalMs) || DEFAULT_POLL_INTERVAL_MS));
  });
  return pollIntervalMs;
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling() {
  stopPolling();
  if (!activeToken || subscribers.size === 0) return;
  const pollIntervalMs = getEffectivePollInterval();
  pollTimer = setInterval(() => {
    refreshUnreadCount(activeToken);
  }, pollIntervalMs);
}

export async function refreshUnreadCount(tokenOverride) {
  const token = String(tokenOverride || activeToken || "").trim();
  if (!token) {
    unreadCount = 0;
    notifySubscribers();
    return unreadCount;
  }

  if (inFlightRequest) return inFlightRequest;

  inFlightRequest = axios
    .get(`${API_URL}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((response) => {
      unreadCount = Number(response.data?.unreadCount || 0);
      notifySubscribers();
      return unreadCount;
    })
    .catch((err) => {
      console.error("Error fetching unread count:", err);
      return unreadCount;
    })
    .finally(() => {
      inFlightRequest = null;
    });

  return inFlightRequest;
}

export function subscribeUnreadCount({
  token,
  onChange,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  immediate = true,
} = {}) {
  const normalizedToken = String(token || "").trim();
  if (!normalizedToken || typeof onChange !== "function") return () => {};

  if (normalizedToken !== activeToken) {
    activeToken = normalizedToken;
    unreadCount = 0;
  }

  const subscriber = { onChange, pollIntervalMs };
  subscribers.add(subscriber);
  onChange(unreadCount);
  startPolling();
  if (immediate) refreshUnreadCount(normalizedToken);

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) {
      stopPolling();
      activeToken = "";
      unreadCount = 0;
      inFlightRequest = null;
      return;
    }
    startPolling();
  };
}
