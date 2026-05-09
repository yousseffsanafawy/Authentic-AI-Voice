"use client";

import { useEditorStore } from "@/store/editorStore";

export function ToastContainer() {
  const { toasts, removeToast } = useEditorStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-slide-in pointer-events-auto flex items-center gap-3
            px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg
            border border-white/10 backdrop-blur-xl"
          style={{
            background:
              toast.type === "success"
                ? "linear-gradient(135deg, #065f46, #047857)"
                : toast.type === "error"
                ? "linear-gradient(135deg, #7f1d1d, #b91c1c)"
                : "linear-gradient(135deg, #1e1b4b, #3730a3)",
          }}
        >
          <span className="text-base">
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}
          </span>
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-1 opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
