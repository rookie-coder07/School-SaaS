import { useEffect, useState } from "react";
import { devToastEventName } from "../utils/devToast";

const toastClassByType = {
  success: "border-emerald-300/30 bg-emerald-500/20 text-emerald-100",
  warning: "border-amber-300/30 bg-amber-500/20 text-amber-100",
  error: "border-rose-300/30 bg-rose-500/20 text-rose-100",
  info: "border-cyan-300/30 bg-cyan-500/20 text-cyan-100",
};

export default function DevToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onToast = (event) => {
      const detail = event?.detail;
      if (!detail?.message) return;
      setToasts((prev) => [...prev, detail]);
      const timeout = Math.max(1500, Number(detail.durationMs) || 8000);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== detail.id));
      }, timeout);
    };
    window.addEventListener(devToastEventName, onToast);
    return () => window.removeEventListener(devToastEventName, onToast);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[320px] max-w-[90vw] flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className={`pointer-events-auto rounded-xl border px-3 py-2 text-sm ${toastClassByType[toast.type] || toastClassByType.info}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="line-clamp-2">{toast.message}</p>
            {toast.actionLabel ? (
              <button
                type="button"
                onClick={() => toast.onAction?.()}
                className="rounded bg-white/20 px-2 py-1 text-xs font-semibold text-white hover:bg-white/30"
              >
                {toast.actionLabel}
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
