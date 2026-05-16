"use client";

import { useState, useEffect, useCallback } from "react";
import { X, History, Save, RotateCcw, Clock } from "lucide-react";
import api from "@/lib/api";

interface VersionEntry {
  id: string;
  version_number: number;
  created_at: string;
}

interface VersionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  onRestoreVersion: (content: unknown) => void;
}

export default function VersionPanel({
  isOpen,
  onClose,
  docId,
  onRestoreVersion,
}: VersionPanelProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    setLoadError(null);
    try {
      const { data } = await api.get<VersionEntry[]>(
        `/api/documents/${docId}/versions`
      );
      // API returns newest-first (ORDER BY version_number DESC)
      setVersions(data);
    } catch {
      setLoadError("Could not load versions.");
    }
  }, [docId]);

  useEffect(() => {
    if (isOpen) fetchVersions();
  }, [isOpen, fetchVersions]);

  if (!isOpen) return null;

  const handleSaveSnapshot = async () => {
    setSaving(true);
    try {
      await api.post(`/api/documents/${docId}/versions`);
      await fetchVersions();
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (versionNumber: number) => {
    setRestoring(versionNumber);
    try {
      const { data } = await api.get(
        `/api/documents/${docId}/versions/${versionNumber}`
      );
      onRestoreVersion(data.content);
      onClose();
    } finally {
      setRestoring(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — left side, opposite the AI panel */}
      <div
        role="dialog"
        aria-label="Version History Panel"
        className="fixed top-0 left-0 bottom-0 z-50 flex flex-col"
        style={{
          width: "320px",
          background: "var(--color-surface)",
          borderRight: "1px solid var(--color-border)",
          animation: "slide-in-left 0.22s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: "8px 0 32px rgba(0,0,0,0.4)",
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
            <History
              size={16}
              style={{ color: "var(--color-mint)" }}
              aria-hidden="true"
            />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "0.95rem",
                background:
                  "linear-gradient(135deg, var(--color-mint), var(--color-cyan))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Version History
            </span>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: "0.3rem", borderRadius: "var(--radius-sm)" }}
            aria-label="Close version history"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Save snapshot ── */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <button
            onClick={handleSaveSnapshot}
            disabled={saving}
            className="btn-secondary"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              opacity: saving ? 0.6 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            <Save size={13} aria-hidden="true" />
            {saving ? "Saving…" : "Save Snapshot"}
          </button>
        </div>

        {/* ── Version list ── */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "0.75rem" }}>
          {loadError && (
            <p
              style={{
                fontSize: "0.8rem",
                color: "#f87171",
                textAlign: "center",
                padding: "1rem",
              }}
            >
              {loadError}
            </p>
          )}

          {!loadError && versions.length === 0 && (
            <div
              className="flex flex-col items-center"
              style={{
                padding: "2.5rem 1rem",
                gap: "0.6rem",
                color: "var(--color-text-muted)",
              }}
            >
              <Clock size={28} style={{ opacity: 0.35 }} />
              <p style={{ fontSize: "0.8rem", textAlign: "center", lineHeight: 1.5 }}>
                No snapshots yet.
                <br />
                Auto-snapshots are saved every 10 edits,
                <br />
                or click "Save Snapshot" above.
              </p>
            </div>
          )}

          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {versions.map((v) => (
              <li
                key={v.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.65rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  gap: "0.5rem",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      color: "var(--color-cyan)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    v{v.version_number}
                  </p>
                  <p
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--color-text-muted)",
                      marginTop: "0.15rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {formatDate(v.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => handleRestore(v.version_number)}
                  disabled={restoring === v.version_number}
                  className="btn-ghost"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    fontSize: "0.72rem",
                    padding: "0.3rem 0.5rem",
                    borderRadius: "var(--radius-sm)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    opacity: restoring === v.version_number ? 0.5 : 1,
                    cursor: restoring === v.version_number ? "not-allowed" : "pointer",
                  }}
                  aria-label={`Restore version ${v.version_number}`}
                >
                  <RotateCcw size={11} aria-hidden="true" />
                  {restoring === v.version_number ? "…" : "Restore"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}