"use client";

import { useState } from "react";
import type { SampleEntry } from "./SampleUploader";

interface SampleListProps {
  samples: SampleEntry[];
  isAnalyzing: boolean;
  onDelete: (id: string) => Promise<void>;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function SampleRow({
  sample,
  onDelete,
}: {
  sample: SampleEntry;
  onDelete: (id: string) => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(sample.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.6rem 0.75rem",
        borderRadius: "var(--radius-md)",
        background: "linear-gradient(145deg, rgba(30,36,53,0.5) 0%, rgba(22,27,39,0.3) 100%)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        opacity: isDeleting ? 0.5 : 1,
        transition: "opacity 0.15s ease",
        animation: "fade-in 0.2s ease-out",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          minWidth: 0,
          flex: 1,
        }}
      >
        <span style={{ fontSize: "1rem", flexShrink: 0 }}>📄</span>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "var(--color-text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              margin: 0,
            }}
            title={sample.filename}
          >
            {sample.filename}
          </p>
          <p
            style={{
              fontSize: "0.68rem",
              color: "var(--color-text-muted)",
              margin: 0,
              marginTop: "0.1rem",
            }}
          >
            {formatDate(sample.created_at)}
          </p>
        </div>
      </div>

      <button
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label={`Delete ${sample.filename}`}
        style={{
          padding: "0.25rem 0.45rem",
          borderRadius: "var(--radius-sm)",
          background: "transparent",
          border: "none",
          color: isDeleting ? "var(--color-text-muted)" : "var(--color-error)",
          cursor: isDeleting ? "not-allowed" : "pointer",
          fontSize: "0.9rem",
          flexShrink: 0,
          marginLeft: "0.75rem",
          transition: "opacity 0.15s",
          opacity: isDeleting ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isDeleting)
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(239,68,68,0.1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
      >
        {isDeleting ? "⟳" : "✕"}
      </button>
    </li>
  );
}

export default function SampleList({ samples, isAnalyzing, onDelete }: SampleListProps) {
  const atMax = samples.length >= 5;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              background: "linear-gradient(to right, var(--color-mint), var(--color-cyan))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: 0,
            }}
          >
            Your Writing Samples
          </h3>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              padding: "0.1rem 0.45rem",
              borderRadius: "var(--radius-sm)",
              background: atMax
                ? "rgba(245,158,11,0.15)"
                : "var(--color-surface-3)",
              color: atMax ? "#f59e0b" : "var(--color-text-muted)",
              border: atMax
                ? "1px solid rgba(245,158,11,0.3)"
                : "1px solid var(--color-border)",
            }}
          >
            {samples.length}/5
          </span>
        </div>

        {isAnalyzing && (
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--color-cyan)",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>
              ⟳
            </span>
            Analyzing your style…
          </span>
        )}
      </div>

      {/* List */}
      {samples.length === 0 ? (
        <p
          style={{
            fontSize: "0.82rem",
            color: "var(--color-text-muted)",
            textAlign: "center",
            padding: "1.5rem",
            background: "linear-gradient(145deg, rgba(30,36,53,0.3) 0%, rgba(22,27,39,0.2) 100%)",
            backdropFilter: "blur(12px)",
            borderRadius: "var(--radius-md)",
            border: "1px dashed rgba(255, 255, 255, 0.1)",
            margin: 0,
          }}
        >
          No samples yet. Upload your writing above.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
          {samples.map((s) => (
            <SampleRow key={s.id} sample={s} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </div>
  );
}
