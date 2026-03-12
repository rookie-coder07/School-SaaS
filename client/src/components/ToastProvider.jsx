import { createContext, useState, useCallback, useContext } from "react";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info", duration = 4000, options = {}) => {
    const id = Date.now();
    const newToast = { id, message, type, actionLabel: options.actionLabel, onAction: options.onAction };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const success = useCallback((message, duration, options) => addToast(message, "success", duration ?? 4000, options), [addToast]);
  const error = useCallback((message, duration, options) => addToast(message, "error", duration ?? 4000, options), [addToast]);
  const warning = useCallback((message, duration, options) => addToast(message, "warning", duration ?? 4000, options), [addToast]);
  const info = useCallback((message, duration, options) => addToast(message, "info", duration ?? 4000, options), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function Toast({ toast, onRemove }) {
  const getStyles = () => {
    switch (toast.type) {
      case "success":
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-300/40",
          text: "text-emerald-700",
          icon: "✓",
        };
      case "error":
        return {
          bg: "bg-rose-500/10",
          border: "border-rose-300/40",
          text: "text-rose-700",
          icon: "✕",
        };
      case "warning":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-300/40",
          text: "text-amber-700",
          icon: "!",
        };
      default:
        return {
          bg: "bg-sky-500/10",
          border: "border-sky-300/40",
          text: "text-sky-700",
          icon: "i",
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`
        ${styles.bg} ${styles.border} ${styles.text}
        border rounded-2xl px-4 py-3 max-w-md shadow-[0_12px_30px_rgba(15,23,42,0.18)]
        flex items-center gap-3 pointer-events-auto
        animate-in fade-in slide-in-from-right-4 duration-300
      `}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-current/20 text-sm font-bold">
        {styles.icon}
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold">{toast.message}</p>
        {toast.actionLabel && typeof toast.onAction === "function" && (
          <button
            onClick={() => {
              toast.onAction();
              onRemove(toast.id);
            }}
            className={`mt-1 text-xs font-bold underline ${styles.text} hover:opacity-80 transition`}
          >
            {toast.actionLabel}
          </button>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className={`ml-2 ${styles.text} opacity-60 hover:opacity-100 transition`}
      >
        ✕
      </button>
    </div>
  );
}
