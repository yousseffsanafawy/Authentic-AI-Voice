"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Editor } from "@tiptap/react";
import api from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import TiptapEditor, { TiptapEditorRef } from "@/components/editor/TiptapEditor";
import Toolbar from "@/components/editor/Toolbar";
import { AppIcon } from "@/components/ui/AppLogo";

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

  // ── Load document on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    api
      .get(`/api/documents/${id}`)
      .then(({ data }) => {
        setDocument(data);
        setTitle(data.title || "Untitled");
        setWordCount(data.word_count || 0);
        setEditorContent(
          data.content || { type: "doc", content: [{ type: "paragraph" }] }
        );
      })
      .catch(() => {
        addToast("Failed to load document.", "error");
        router.push("/dashboard");
      })
      .finally(() => setLoading(false));
  }, [id, addToast, router]);

  // ── Editor update handler ────────────────────────────────────────────────────
  const handleEditorUpdate = useCallback(
    (json: object, text: string, words: number) => {
      setEditorContent(json);
      setEditorText(text);
      setWordCount(words);
      scheduleSave({ content: json, content_text: text, word_count: words });
      if (editorRef.current?.editor && !editorInstance) {
        setEditorInstance(editorRef.current.editor);
      }
    },
    [scheduleSave, editorInstance]
  );

  // ── Ctrl+S: force save ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        forceSave({ content: editorContent, content_text: editorText, word_count: wordCount });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [forceSave, editorContent, editorText, wordCount]);

  // ── Title save on blur ───────────────────────────────────────────────────────
  const handleTitleBlur = async () => {
    const trimmed = title.trim() || "Untitled";
    setTitle(trimmed);
    try {
      await api.patch(`/api/documents/${id}`, { title: trimmed });
    } catch {
      addToast("Failed to save title.", "error");
    }
  };

  // ── PDF export: direct download with document name ───────────────────────────
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Save latest content first
      await forceSave({ content: editorContent, content_text: editorText, word_count: wordCount });

      const { data } = await api.post("/api/export/pdf", { document_id: id });

      // Direct download — named after the document title
      const safeName = (title || "document").replace(/[^a-z0-9\-_\s]/gi, "").trim() || "document";
      const link = window.document.createElement("a");
      link.href = data.download_url;
      link.download = `${safeName}.pdf`;
      link.style.display = "none";
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);

      addToast(`"${safeName}.pdf" downloaded!`, "success");
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "PDF export failed.";
      if (detail.includes("GTK3")) {
        addToast("PDF requires GTK3 runtime. See setup docs.", "error");
      } else {
        addToast(detail, "error");
      }
    } finally {
      setIsExporting(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--color-bg-deep)" }}
      >
        <div className="flex flex-col items-center gap-4">
          {/* Animated mint ring */}
          <div className="relative w-12 h-12">
            <div
              className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--color-mint)", borderTopColor: "transparent" }}
            />
            <div
              className="absolute inset-2 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(52,211,153,0.15), transparent)" }}
            />
          </div>
          <span className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
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
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0"
        style={{
          background: "rgba(7,9,15,0.92)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {/* Back */}
        <button
          onClick={() => router.push("/dashboard")}
          className="btn-ghost flex-shrink-0"
        >
          ← Back
        </button>

        {/* Divider */}
        <div className="w-px h-5 flex-shrink-0" style={{ background: "var(--color-border-bright)" }} />

        {/* Editable title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="flex-1 bg-transparent border-none outline-none font-semibold text-sm text-white
            placeholder:text-gray-600 min-w-0 transition-colors duration-150"
          style={{ color: "var(--color-text)", fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          placeholder="Document title…"
          aria-label="Document title"
        />

        {/* Save status */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {saveStatus === "saving" && (
            <>
              <span className="status-dot saving" />
              <span className="text-xs" style={{ color: "var(--color-warning)" }}>Saving…</span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <span className="status-dot saved" />
              <span className="text-xs" style={{ color: "var(--color-mint)" }}>Saved</span>
            </>
          )}
          {saveStatus === "error" && (
            <>
              <span className="status-dot error" />
              <span className="text-xs" style={{ color: "var(--color-error)" }}>Error</span>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 flex-shrink-0" style={{ background: "var(--color-border-bright)" }} />

        {/* Export PDF */}
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="btn-primary py-1.5 px-4 text-sm flex-shrink-0"
        >
          {isExporting ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin flex-shrink-0" />
              Exporting…
            </>
          ) : (
            <>↓ Export PDF</>
          )}
        </button>

        {/* Logo mark */}
        <AppIcon size={26} />
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────────── */}
      <Toolbar
        editor={editorInstance}
        wordCount={wordCount}
        saveStatus={saveStatus}
        onExportPDF={handleExportPDF}
        isExporting={isExporting}
      />

      {/* ── Editor ──────────────────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-auto"
        style={{ background: "var(--color-surface)" }}
      >
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
