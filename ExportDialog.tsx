"use client";

import { useState } from "react";
import api from "@/lib/api";
import { useEditorStore } from "@/store/editorStore"; // adjust to your actual store path

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
}

// ── types ──────────────────────────────────────────────────────────────────
type Tab = "pdf" | "latex";
type Template = "academic" | "article" | "report";
type FontSize = "10pt" | "11pt" | "12pt";
type PaperSize = "a4paper" | "letterpaper";

// ── spinner ────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        border: "2px solid rgba(255,255,255,0.25)",
        borderTopColor: "#34d399",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        marginRight: 8,
        verticalAlign: "middle",
      }}
    />
  );
}

// ── select wrapper ─────────────────────────────────────────────────────────
function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "var(--color-text-muted, #64748b)", textTransform: "uppercase" }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8,
          color: "#e2e8f0",
          padding: "8px 12px",
          fontSize: 14,
          outline: "none",
          cursor: "pointer",
          appearance: "none",
          WebkitAppearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2364748b' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          paddingRight: 32,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "#0f121c" }}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ── toggle ─────────────────────────────────────────────────────────────────
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <span style={{ fontSize: 14, color: "#e2e8f0" }}>{label}</span>
      <span
        onClick={() => onChange(!checked)}
        style={{
          position: "relative",
          display: "inline-block",
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked
            ? "linear-gradient(90deg, #34d399, #22d3ee)"
            : "rgba(255,255,255,0.08)",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 19 : 3,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.2s",
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          }}
        />
      </span>
    </label>
  );
}

// ── main component ─────────────────────────────────────────────────────────
export default function ExportDialog({ isOpen, onClose, documentId }: ExportDialogProps) {
  const addToast = useEditorStore((s: any) => s.addToast);

  const [activeTab, setActiveTab] = useState<Tab>("pdf");
  const [template, setTemplate] = useState<Template>("academic");
  const [fontSize, setFontSize] = useState<FontSize>("12pt");
  const [paperSize, setPaperSize] = useState<PaperSize>("a4paper");
  const [includeToc, setIncludeToc] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  // ── handlers ──────────────────────────────────────────────────────────
  const handlePDFExport = async () => {
    setIsExporting(true);
    try {
      const response = await api.post(
        "/api/export/pdf",
        { document_id: documentId },
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "document.pdf";
      a.click();
      URL.revokeObjectURL(url);
      addToast?.("PDF downloaded!", "success");
    } catch {
      addToast?.("PDF export failed.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleLaTeXExport = async () => {
    setIsExporting(true);
    try {
      const response = await api.post(
        "/api/export/latex",
        {
          document_id: documentId,
          options: {
            template,
            font_size: fontSize,
            paper_size: paperSize,
            include_toc: includeToc,
          },
        },
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "document.tex";
      a.click();
      URL.revokeObjectURL(url);
      addToast?.("LaTeX downloaded!", "success");
    } catch {
      addToast?.("LaTeX export failed.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // ── styles ─────────────────────────────────────────────────────────────
  const tabBase: React.CSSProperties = {
    padding: "10px 20px",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "0.04em",
    cursor: "pointer",
    border: "none",
    background: "transparent",
    color: "var(--color-text-muted, #64748b)",
    position: "relative",
    transition: "color 0.2s",
  };

  const tabActive: React.CSSProperties = {
    ...tabBase,
    color: "#e2e8f0",
  };

  const exportBtn: React.CSSProperties = {
    width: "100%",
    padding: "11px",
    borderRadius: 10,
    border: "none",
    background: isExporting
      ? "rgba(52,211,153,0.15)"
      : "linear-gradient(135deg, #34d399 0%, #22d3ee 100%)",
    color: isExporting ? "#34d399" : "#07090f",
    fontWeight: 700,
    fontSize: 14,
    cursor: isExporting ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.2s",
    opacity: isExporting ? 0.7 : 1,
    letterSpacing: "0.03em",
  };

  return (
    <>
      {/* keyframe injection */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>

      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* dialog */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "rgba(15,18,28,0.92)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(52,211,153,0.06)",
            width: "100%",
            maxWidth: 440,
            overflow: "hidden",
            animation: "fadeIn 0.2s ease",
          }}
        >
          {/* header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 24px 0",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>
              Export Document
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "none",
                borderRadius: 8,
                color: "#64748b",
                width: 30,
                height: 30,
                cursor: "pointer",
                fontSize: 16,
                lineHeight: "30px",
                textAlign: "center",
                transition: "background 0.15s",
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              marginTop: 16,
              paddingLeft: 8,
            }}
          >
            {(["pdf", "latex"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={activeTab === tab ? tabActive : tabBase}
              >
                {tab === "pdf" ? "PDF" : "LaTeX (.tex)"}
                {activeTab === tab && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      borderRadius: "2px 2px 0 0",
                      background: "linear-gradient(90deg, #34d399, #22d3ee)",
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* body */}
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            {activeTab === "pdf" ? (
              <>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                  Export your document as a formatted PDF. The layout reflects your current editor content.
                </p>
                <button
                  style={exportBtn}
                  onClick={handlePDFExport}
                  disabled={isExporting}
                >
                  {isExporting && <Spinner />}
                  {isExporting ? "Exporting…" : "Download PDF"}
                </button>
              </>
            ) : (
              <>
                {/* warning banner */}
                <div
                  style={{
                    background: "rgba(251,191,36,0.1)",
                    border: "1px solid rgba(251,191,36,0.3)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(251,191,36,0.9)", lineHeight: 1.6 }}>
                    LaTeX output requires a compiler (e.g.{" "}
                    <a
                      href="https://www.overleaf.com"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#22d3ee" }}
                    >
                      Overleaf
                    </a>
                    ) to produce a PDF. Some content may need manual adjustment.
                  </p>
                </div>

                {/* controls */}
                <Select
                  label="Template"
                  value={template}
                  onChange={setTemplate}
                  options={[
                    { value: "academic", label: "Academic (single-column)" },
                    { value: "article", label: "Article (two-column IEEE)" },
                    { value: "report", label: "Report (fancy headers)" },
                  ]}
                />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Select
                    label="Font size"
                    value={fontSize}
                    onChange={setFontSize}
                    options={[
                      { value: "10pt", label: "10pt" },
                      { value: "11pt", label: "11pt" },
                      { value: "12pt", label: "12pt" },
                    ]}
                  />
                  <Select
                    label="Paper size"
                    value={paperSize}
                    onChange={setPaperSize}
                    options={[
                      { value: "a4paper", label: "A4" },
                      { value: "letterpaper", label: "Letter" },
                    ]}
                  />
                </div>

                <Toggle
                  label="Include table of contents"
                  checked={includeToc}
                  onChange={setIncludeToc}
                />

                <button
                  style={exportBtn}
                  onClick={handleLaTeXExport}
                  disabled={isExporting}
                >
                  {isExporting && <Spinner />}
                  {isExporting ? "Exporting…" : "Download .tex"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
