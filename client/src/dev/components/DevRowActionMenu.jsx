import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

export default function DevRowActionMenu({ actions = [] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onClick = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        aria-label="Open row actions"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-md border border-white/20 bg-white/10 p-1.5 text-slate-200 hover:bg-white/20"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 min-w-44 rounded-lg border border-white/15 bg-slate-900/95 p-1 shadow-xl">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={Boolean(action.disabled)}
              onClick={() => {
                setOpen(false);
                action.onClick?.();
              }}
              className={[
                "block w-full rounded-md px-3 py-2 text-left text-xs font-semibold transition",
                action.danger
                  ? "text-rose-200 hover:bg-rose-500/20"
                  : "text-slate-200 hover:bg-white/10",
                action.disabled ? "cursor-not-allowed opacity-50" : "",
              ].join(" ")}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
