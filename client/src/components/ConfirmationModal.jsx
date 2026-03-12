import React from "react";
import { motion } from "framer-motion";

/**
 * ConfirmationModal Component
 * Displays a warning modal for destructive actions like delete
 */
export default function ConfirmationModal({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure?",
  warning = "This action is irreversible",
  confirmText = "Delete",
  cancelText = "Cancel",
  isLoading = false,
  isDangerous = true,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <motion.div
        className="glass-panel rounded-2xl max-w-sm w-full"
        initial={{ opacity: 0, scale: 0.96, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${isDangerous ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
          <h3 className={`text-lg font-bold ${isDangerous ? "text-red-900" : "text-slate-900"}`}>
            {title}
          </h3>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <p className="text-slate-700 text-sm">{message}</p>
          {warning && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-xs font-semibold">Warning: {warning}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg text-white font-semibold text-sm transition disabled:opacity-50 ${
              isDangerous
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

