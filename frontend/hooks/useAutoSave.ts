"use client";

import { useCallback, useRef } from "react";
import api from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";

interface AutoSaveOptions {
  documentId: string;
  debounceMs?: number;
}

export function useAutoSave({ documentId, debounceMs = 3000 }: AutoSaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setSaveStatus } = useEditorStore();

  const save = useCallback(
    async (payload: {
      title?: string;
      content?: object;
      content_text?: string;
      word_count?: number;
    }) => {
      setSaveStatus("saving");
      try {
        await api.patch(`/api/documents/${documentId}`, payload);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    },
    [documentId, setSaveStatus]
  );

  const scheduleSave = useCallback(
    (payload: Parameters<typeof save>[0]) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setSaveStatus("saving");
      timerRef.current = setTimeout(() => save(payload), debounceMs);
    },
    [save, debounceMs, setSaveStatus]
  );

  const forceSave = useCallback(
    (payload: Parameters<typeof save>[0]) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      return save(payload);
    },
    [save]
  );

  return { scheduleSave, forceSave };
}
