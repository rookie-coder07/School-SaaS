const DEV_TOAST_EVENT = "dev:toast";

export const pushDevToast = ({ type = "info", message = "", durationMs = 8000, actionLabel = "", onAction = null } = {}) => {
  if (!message) return;
  window.dispatchEvent(
    new CustomEvent(DEV_TOAST_EVENT, {
      detail: { id: `${Date.now()}-${Math.random()}`, type, message, durationMs, actionLabel, onAction },
    })
  );
};

export const devToastEventName = DEV_TOAST_EVENT;
