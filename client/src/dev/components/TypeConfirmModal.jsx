import { useEffect, useState } from "react";

export default function TypeConfirmModal({
  isOpen,
  title = "Confirm Action",
  message = "This action is destructive.",
  confirmKeyword = "DELETE",
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!isOpen) setValue("");
  }, [isOpen]);

  if (!isOpen) return null;

  const canConfirm = String(value).trim().toUpperCase() === String(confirmKeyword).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-md rounded-2xl border border-rose-300/20 bg-slate-900 shadow-xl">
        <div className="border-b border-white/10 px-5 py-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-slate-200">{message}</p>
          <p className="text-xs text-amber-200">
            Type <span className="font-bold text-amber-100">{confirmKeyword}</span> to continue.
          </p>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400"
            placeholder={`Type ${confirmKeyword}`}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm || isLoading}
            className="rounded-lg border border-rose-300/30 bg-rose-500/25 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-500/35 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
