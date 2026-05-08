"use client";

import { create } from "zustand";

interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface EditorStore {
  // Toast state
  toasts: ToastItem[];
  addToast: (message: string, type: ToastItem["type"]) => void;
  removeToast: (id: string) => void;

  // Auto-save state
  saveStatus: "idle" | "saving" | "saved" | "error";
  setSaveStatus: (status: EditorStore["saveStatus"]) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  toasts: [],
  addToast: (message, type) => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  saveStatus: "idle",
  setSaveStatus: (status) => set({ saveStatus: status }),
}));
