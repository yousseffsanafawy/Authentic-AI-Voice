"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Editor } from "@tiptap/react";
import { Sparkles } from "lucide-react";
import api from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useEditorSelection } from "@/hooks/useEditorSelection";
import TiptapEditor, { TiptapEditorRef } from "@/components/editor/TiptapEditor";
import Toolbar from "@/components/editor/Toolbar";
import { AppIcon } from "@/components/ui/AppLogo";
import VersionHistoryDrawer from "@/components/editor/VersionHistoryDrawer";
import AIPanel from "@/components/editor/AIPanel";
import ExportDialog from "@/components/export/ExportDialog";

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
  const { addToast, saveStatus, setDocId, setHistoryOpen, isHistoryOpen } = useEditorStore();
  const editorRef = useRef<TiptapEditorRef>(null);

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [title, setTitle] = useState("Untitled");
  const [wordCount, setWordCount] = useState(0);
  const [editorContent, setEditorContent] = useState<object>({});
  const [editorText, setEditorText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  // ── AI Panel state ───────────────────────────────────────────────────────────
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  // Floating "AI Enhance" bubble button position + visibility
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
  const { selectedText } = useEditorSelection(editorInstance);

  const { scheduleSave, forceSave } = useAutoSave({ documentId: id });

  // ── Load document on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    api
      .get(`/api/documents/${id}`)
      .then(({ data }) => {
        setDocument(data);
        setDocId(id);
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

  // ── Track text selection → show/hide floating "AI Enhance" bubble ────────────
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setBubblePos(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setBubblePos(null);
        return;
      }
      setBubblePos({
        top: rect.top + window.scrollY - 44,   // 44px above the selection
        left: rect.left + window.scrollX + rect.width / 2,
      });
    };

    window.document.addEventListener("selectionchange", handleSelectionChange);
    return () => window.document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

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

  // ── Ctrl+Shift+E: export dialog ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        setIsExportOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Ctrl+Shift+A: open AI panel ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAIPanelOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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

  const handleRestoreVersion = (content: unknown) => {
    const editor = editorRef.current?.editor;
    if (!editor) return;
    
    // Tiptap crashes if you pass an empty object {}
    const validContent = (content && Object.keys(content).length > 0)
      ? content
      : { type: "doc", content: [{ type: "paragraph" }] };
      
    editor.commands.setContent(validContent as import("@tiptap/core").Content);
  };

  // Replace the current selection in the editor with AI-enhanced text
  const handleReplaceSelection = useCallback(
    (text: string) => {
      const editor = editorRef.current?.editor;
      if (!editor) return;
      editor.chain().focus().insertContent(text).run();
    },
    []
  );

  // ── PDF export: direct download with document name ───────────────────────────
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Save latest content first
      await forceSave({ content: editorContent, content_text: editorText, word_count: wordCount });

      // IMPORTANT: responseType: 'blob' — without this Axios corrupts binary PDF bytes
      const response = await api.post(
        "/api/export/pdf",
        { document_id: id },
        { responseType: "blob" }
      );

      // Create a temporary object URL from the blob and trigger download
      const blob = new Blob([response.data], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(blob);
      const safeName = (title || "document").replace(/[^a-z0-9\-_\s]/gi, "").trim() || "document";

      const link = window.document.createElement("a");
      link.href = objectUrl;
      link.download = `${safeName}.pdf`;
      link.style.display = "none";
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);

      // Revoke the object URL after a short delay to free memory
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);

      addToast(`"${safeName}.pdf" downloaded!`, "success");
    } catch (err: any) {
      // Blob responses wrap errors differently — parse the blob to get detail
      let detail = "PDF export failed.";
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          detail = JSON.parse(text)?.detail ?? detail;
        } catch { /* ignore */ }
      } else {
        detail = err?.response?.data?.detail ?? detail;
      }
      addToast(detail, "error");
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
          <VersionHistoryDrawer onRestoreVersion={handleRestoreVersion} />
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
        isHistoryOpen={isHistoryOpen}
        onToggleHistory={() => setHistoryOpen(!isHistoryOpen)}
        onExport={() => setIsExportOpen(true)}
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

        {/* ── AI floating bubble — appears above text selection ─────────────── */}
        {bubblePos && selectedText && (
          <button
            onMouseDown={(e) => {
              e.preventDefault(); // prevent selection loss
              setIsAIPanelOpen(true);
            }}
            aria-label="Open AI Enhance panel"
            title="Open AI Panel (Ctrl+Shift+A)"
            style={{
              position: "fixed",
              top: bubblePos.top,
              left: bubblePos.left,
              transform: "translateX(-50%)",
              zIndex: 40,
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.35rem 0.75rem",
              borderRadius: "9999px",
              background: "linear-gradient(135deg, var(--color-cyan), var(--color-mint))",
              color: "#0a0f1a",
              fontWeight: 700,
              fontSize: "0.78rem",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(6,182,212,0.45)",
              whiteSpace: "nowrap",
              animation: "fade-in 0.15s ease-out",
            }}
          >
            <Sparkles size={13} aria-hidden="true" />
            AI Enhance
          </button>
        )}
      </div>

      {/* ── AI Panel ────────────────────────────────────────────────────────────── */}
      <AIPanel
        isOpen={isAIPanelOpen}
        onClose={() => setIsAIPanelOpen(false)}
        selectedText={selectedText}
        onReplaceSelection={handleReplaceSelection}
      />

      {/* ── Export Dialog ───────────────────────────────────────────────────────── */}
      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        documentId={id}
      />
    </div>
  );
}
