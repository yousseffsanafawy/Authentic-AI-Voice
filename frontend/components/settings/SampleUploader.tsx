"use client";

import { useState, useRef, useCallback } from "react";
import api from "@/lib/api";

export interface SampleEntry {
  id: string;
  filename: string;
  created_at: string;
}

interface SampleUploaderProps {
  onUploadSuccess: (sample: SampleEntry) => void;
  disabled?: boolean;
}

const ALLOWED_EXTS = [".txt", ".pdf", ".docx"];

export default function SampleUploader({ onUploadSuccess, disabled }: SampleUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        setUploadError(`File type not allowed. Use: ${ALLOWED_EXTS.join(", ")}`);
        return;
      }
      setIsUploading(true);
      try {
        const form = new FormData();
        form.append("file", file); // field name MUST be "file"
        const { data } = await api.post<SampleEntry>("/api/samples/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        onUploadSuccess(data);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        const detail = axiosErr?.response?.data?.detail ?? "Upload failed. Please try again.";
        setUploadError(detail);
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadSuccess]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled || isUploading) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, isUploading, handleFile]
  );

  const borderColor = isDragging ? "var(--color-mint)" : "rgba(255, 255, 255, 0.15)";
  const bgColor = isDragging 
    ? "linear-gradient(145deg, rgba(52,211,153,0.1) 0%, rgba(52,211,153,0.02) 100%)" 
    : "linear-gradient(145deg, rgba(30,36,53,0.3) 0%, rgba(22,27,39,0.2) 100%)";

  return (
    <div>
      <div
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !isUploading) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload writing sample"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled && !isUploading) fileInputRef.current?.click();
          }
        }}
        style={{
          border: `2px dashed ${borderColor}`,
          borderRadius: "var(--radius-lg)",
          padding: "2.5rem 1.5rem",
          textAlign: "center",
          cursor: disabled || isUploading ? "not-allowed" : "pointer",
          opacity: disabled ? 0.45 : 1,
          background: bgColor,
          backdropFilter: "blur(12px)",
          boxShadow: "inset 0 0 20px rgba(0,0,0,0.1)",
          transition: "all 0.2s ease",
        }}
      >
        {isUploading ? (
          <>
            <span
              style={{
                fontSize: "1.75rem",
                display: "inline-block",
                animation: "spin 1s linear infinite",
              }}
            >
              ⟳
            </span>
            <p
              style={{
                marginTop: "0.75rem",
                color: "var(--color-text-muted)",
                fontSize: "0.875rem",
              }}
            >
              Uploading sample…
            </p>
          </>
        ) : disabled ? (
          <>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
              Maximum 5 samples reached.
            </p>
            <p
              style={{
                color: "var(--color-text-muted)",
                fontSize: "0.75rem",
                marginTop: "0.25rem",
              }}
            >
              Delete a sample to add another.
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: "2rem" }}>📄</p>
            <p
              style={{
                color: "var(--color-text)",
                fontWeight: 600,
                marginTop: "0.5rem",
                fontFamily: "var(--font-sans)",
              }}
            >
              {isDragging ? "✦ Drop to upload ✦" : "Drop your writing here"}
            </p>
            <p
              style={{
                color: "var(--color-text-muted)",
                fontSize: "0.75rem",
                marginTop: "0.25rem",
              }}
            >
              or click to browse — .txt, .pdf, .docx
            </p>
          </>
        )}
      </div>

      {uploadError && (
        <p
          style={{
            marginTop: "0.5rem",
            fontSize: "0.78rem",
            color: "var(--color-error)",
            padding: "0.5rem 0.75rem",
            background: "rgba(239,68,68,0.08)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          {uploadError}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.pdf,.docx"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
