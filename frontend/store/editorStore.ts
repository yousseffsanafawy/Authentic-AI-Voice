"use client";

import { create } from "zustand";
import api from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export interface VersionEntry {
  id: string;
  version_number: number;
  created_at: string;
}

// ── Store interface ────────────────────────────────────────────────────────────

interface EditorStore {
  // Toast state
  toasts: ToastItem[];
  addToast: (message: string, type: ToastItem["type"]) => void;
  removeToast: (id: string) => void;

  // Auto-save state
  saveStatus: "idle" | "saving" | "saved" | "error";
  setSaveStatus: (status: EditorStore["saveStatus"]) => void;

  // Version history state (S3-F4)
  docId: string | null;
  setDocId: (id: string) => void;
  versions: VersionEntry[];
  isHistoryOpen: boolean;
  isVersionsLoading: boolean;
  versionsError: string | null;
  setHistoryOpen: (open: boolean) => void;
  fetchVersions: () => Promise<void>;
  saveSnapshot: () => Promise<void>;
}

// ── Store implementation ───────────────────────────────────────────────────────

export const useEditorStore = create<EditorStore>((set, get) => ({
  // ── Toasts ──────────────────────────────────────────────────────────────────
  toasts: [],
  addToast: (message, type) => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  // ── Save status ─────────────────────────────────────────────────────────────
  saveStatus: "idle",
  setSaveStatus: (status) => set({ saveStatus: status }),

  // ── Version history ─────────────────────────────────────────────────────────
  docId: null,
  setDocId: (id) => set({ docId: id }),

  versions: [],
  isHistoryOpen: false,
  isVersionsLoading: false,
  versionsError: null,

  setHistoryOpen: (open) => {
    set({ isHistoryOpen: open });
    // Auto-fetch when opening so the list is always fresh
    if (open) get().fetchVersions();
  },

  fetchVersions: async () => {
    const { docId } = get();
    if (!docId) return;
    set({ isVersionsLoading: true, versionsError: null });
    try {
      const { data } = await api.get<VersionEntry[]>(
        `/api/documents/${docId}/versions`
      );
      set({ versions: data });
    } catch {
      set({ versionsError: "Could not load version history." });
    } finally {
      set({ isVersionsLoading: false });
    }
  },

  saveSnapshot: async () => {
    const { docId, fetchVersions, addToast } = get();
    if (!docId) return;
    try {
      const { data } = await api.post<{ version_number: number }>(
        `/api/documents/${docId}/versions`
      );
      addToast(`Snapshot v${data.version_number} saved.`, "success");
      await fetchVersions();
    } catch {
      addToast("Failed to save snapshot.", "error");
    }
  },
}));