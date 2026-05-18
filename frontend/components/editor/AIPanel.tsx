"use client";

import { useState, useEffect, useRef } from "react";
import { X, Sparkles, Copy, CheckCheck } from "lucide-react";
import { useAIEnhance } from "@/hooks/useAIEnhance";

const PRESETS = [
  "Make this sound more like me",
  "Make this more concise",
  "Make this more formal",
  "Make this more engaging",
  "Fix grammar and style",
] as const;

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  onReplaceSelection: (text: string) => void;
}

export default function AIPanel({
  isOpen,
  onClose,
  selectedText,
  onReplaceSelection,
}: AIPanelProps) {
  const { streamedText, isStreaming, error, enhance, reset } = useAIEnhance();
  const [instruction, setInstruction] = useState<string>(PRESETS[0]);
  const [useCustom, setUseCustom] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output box as text streams in
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [streamedText]);

  // Reset AI state each time the panel opens fresh
  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const finalInstruction = useCustom ? customInstruction.trim() : instruction;
  const canEnhance = selectedText.length > 0 && !isStreaming && finalInstruction.length > 0;

  const handleEnhance = () => {
    reset();
    enhance(selectedText, finalInstruction);
  };

  const handleReplace = () => {
    if (streamedText) {
      onReplaceSelection(streamedText);
      onClose();
    }
  };

  const handleCopy = async () => {
    if (!streamedText) return;
    await navigator.clipboard.writeText(streamedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === "__custom__") {
      setUseCustom(true);
    } else {
      setUseCustom(false);
      setInstruction(e.target.value);
    }
  };

  return (
    <>
      {/* Backdrop — clicking outside closes the panel */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="AI Enhance Panel"
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col"
        style={{
          width: "min(360px, 90vw)",
          background: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
          animation: "slide-in-right 0.22s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between shrink-0"
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center gap-2">
            <Sparkles
              size={16}
              style={{ color: "var(--color-cyan)" }}
              aria-hidden="true"
            />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "0.95rem",
                background:
                  "linear-gradient(135deg, var(--color-cyan), var(--color-mint))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              AI Enhance
            </span>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: "0.3rem", borderRadius: "var(--radius-sm)" }}
            aria-label="Close AI panel"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div
          className="flex flex-col flex-1 overflow-y-auto"
          style={{ padding: "1.25rem", gap: "1.1rem" }}
        >
          {/* Selected text preview */}
          <section>
            <Label>Selected Text</Label>
            <div
              style={{
                marginTop: "0.5rem",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                fontSize: "0.875rem",
                color: selectedText
                  ? "var(--color-text)"
                  : "var(--color-text-muted)",
                fontStyle: selectedText ? "normal" : "italic",
                maxHeight: "110px",
                overflowY: "auto",
                lineHeight: 1.6,
              }}
            >
              {selectedText || "Select text in the editor first…"}
            </div>
          </section>

          {/* Instruction */}
          <section>
            <Label>Instruction</Label>
            <select
              value={useCustom ? "__custom__" : instruction}
              onChange={handleSelectChange}
              style={{
                marginTop: "0.5rem",
                width: "100%",
                padding: "0.6rem 0.75rem",
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border-bright)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text)",
                fontSize: "0.875rem",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value="__custom__">Custom instruction…</option>
            </select>

            {useCustom && (
              <textarea
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="Describe how to rewrite this…"
                rows={2}
                style={{
                  marginTop: "0.5rem",
                  width: "100%",
                  padding: "0.6rem 0.75rem",
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border-bright)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--color-text)",
                  fontSize: "0.875rem",
                  resize: "vertical",
                  outline: "none",
                  lineHeight: 1.5,
                }}
              />
            )}
          </section>

          {/* Enhance button */}
          <button
            onClick={handleEnhance}
            disabled={!canEnhance}
            className="btn-primary"
            style={{
              opacity: canEnhance ? 1 : 0.45,
              cursor: canEnhance ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
            }}
          >
            <Sparkles size={14} aria-hidden="true" />
            {isStreaming ? "Enhancing…" : "Enhance"}
          </button>

          {/* Error state */}
          {error && (
            <div
              role="alert"
              style={{
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#f87171",
                fontSize: "0.8rem",
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          {/* AI Output */}
          {(streamedText || isStreaming) && (
            <section>
              <div className="flex items-center justify-between" style={{ marginBottom: "0.5rem" }}>
                <Label>AI Output</Label>
                {streamedText && !isStreaming && (
                  <button
                    onClick={handleCopy}
                    className="btn-ghost"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      fontSize: "0.7rem",
                      padding: "0.2rem 0.4rem",
                      color: "var(--color-text-muted)",
                    }}
                    aria-label="Copy AI output"
                  >
                    {copied ? (
                      <CheckCheck size={12} style={{ color: "var(--color-mint)" }} />
                    ) : (
                      <Copy size={12} />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
              <div
                ref={outputRef}
                style={{
                  padding: "0.75rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-surface-3, var(--color-surface-2))",
                  border: "1px solid var(--color-border-bright)",
                  fontSize: "0.875rem",
                  lineHeight: 1.7,
                  minHeight: "80px",
                  maxHeight: "260px",
                  overflowY: "auto",
                  color: "var(--color-text)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {streamedText}
                {isStreaming && (
                  <span
                    aria-hidden="true"
                    style={{ animation: "pulse-mint 1s steps(1) infinite" }}
                  >
                    ▌
                  </span>
                )}
              </div>
            </section>
          )}

          {/* Replace button — visible only when streaming is done */}
          {streamedText && !isStreaming && (
            <button onClick={handleReplace} className="btn-secondary">
              Replace Selection
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/** Reusable muted uppercase label */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: "0.7rem",
        color: "var(--color-text-muted)",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
      }}
    >
      {children}
    </p>
  );
}