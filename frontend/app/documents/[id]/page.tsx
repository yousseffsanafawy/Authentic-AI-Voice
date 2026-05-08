"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Editor } from "@tiptap/react";
import api from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import TiptapEditor, { TiptapEditorRef } from "@/components/editor/TiptapEditor";
import Toolbar from "@/components/editor/Toolbar";

interface DocumentDetail {
  id: string;
  title: string;
  content: object;
  content_text: string;
  word_count: number;
  updated_at: string;
}

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast, saveStatus } = useEditorStore();
  const editorRef = useRef<TiptapEditorRef>(null);

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [title, setTitle] = useState("Untitled");
  const [wordCount, setWordCount] = useState(0);
  const [editorContent, setEditorContent] = useState<object>({});
  const [editorText, setEditorText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  const { scheduleSave, forceSave } = useAutoSave({ documentId: id });

  // ── Load document on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    api
      .get(`/api/documents/${id}`)
      .then(({ data }) => {
        setDocument(data);
        setTitle(data.title || "Untitled");
        setWordCount(data.word_count || 0);
        setEditorContent(data.content || { type: "doc", content: [{ type: "paragraph" }] });
      })
      .catch(() => {
        addToast("Failed to load document.", "error");
        router.push("/dashboard");
      })
      .finally(() => setLoading(false));
  }, [id, addToast, router]);

  // ── Editor update handler ──────────────────────────────────────────────────
  const handleEditorUpdate = useCallback(
    (json: object, text: string, words: number) => {
      setEditorContent(json);
      setEditorText(text);
      setWordCount(words);
      scheduleSave({ content: json, content_text: text, word_count: words });
      // Sync editor instance from ref for Toolbar
      if (editorRef.current?.editor && !editorInstance) {
        setEditorInstance(editorRef.current.editor);
      }
    },
    [scheduleSave, editorInstance]
  );

  // ── Ctrl+S: force save ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        forceSave({
          content: editorContent,
          content_text: editorText,
          word_count: wordCount,
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [forceSave, editorContent, editorText, wordCount]);

  // ── Title save on blur ─────────────────────────────────────────────────────
  const handleTitleBlur = async () => {
    const trimmed = title.trim() || "Untitled";
    setTitle(trimmed);
    try {
      await api.patch(`/api/documents/${id}`, { title: trimmed });
    } catch {
      addToast("Failed to save title.", "error");
    }
  };

  // ── PDF export ─────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Save latest content first
      await forceSave({
        content: editorContent,
        content_text: editorText,
        word_count: wordCount,
      });
      const { data } = await api.post("/api/export/pdf", { document_id: id });
      window.open(data.download_url, "_blank");
      addToast("PDF exported successfully!", "success");
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "PDF export failed.";
      if (detail.includes("GTK3")) {
        addToast(
          "PDF requires GTK3. See docs/09_setup_dependencies.md for setup.",
          "error"
        );
      } else {
        addToast(detail, "error");
      }
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--color-bg-deep)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--color-neon-primary)" }}
          />
          <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Loading document…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: "var(--color-bg-deep)" }}
    >
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-6 py-3 flex-shrink-0"
        style={{
          background: "rgba(7,9,15,0.9)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {/* Back button */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-150"
          style={{ color: "var(--color-text-muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--color-surface-2)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)";
          }}
        >
          ← Back
        </button>

        {/* Editable title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="flex-1 bg-transparent border-none outline-none font-semibold text-base text-white
            placeholder:text-gray-600 min-w-0"
          style={{ color: "var(--color-text)" }}
          placeholder="Document title…"
          aria-label="Document title"
        />

        {/* Logo */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium gradient-text hidden sm:block">Authentic Voice</span>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <Toolbar
        editor={editorInstance}
        wordCount={wordCount}
        saveStatus={saveStatus}
        onExportPDF={handleExportPDF}
        isExporting={isExporting}
      />

      {/* ── Editor ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden" style={{ background: "var(--color-surface)" }}>
        {editorContent && Object.keys(editorContent).length > 0 && (
          <TiptapEditor
            ref={editorRef}
            initialContent={editorContent}
            onUpdate={handleEditorUpdate}
            onEditorReady={(editor) => setEditorInstance(editor)}
          />
        )}
      </div>
    </div>
  );
}
