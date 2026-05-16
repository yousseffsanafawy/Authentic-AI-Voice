"use client";

import { useRef } from "react";
import { X, History, Save, RotateCcw, Clock, AlertCircle } from "lucide-react";
import { useEditorStore, VersionEntry } from "@/store/editorStore";
import api from "@/lib/api";

interface VersionHistoryDrawerProps {
  onRestoreVersion: (content: unknown) => void;
}

export default function VersionHistoryDrawer({
  onRestoreVersion,
}: VersionHistoryDrawerProps) {
  const {
    isHistoryOpen,
    setHistoryOpen,
    versions,
    isVersionsLoading,
    versionsError,
    saveSnapshot,
    addToast,
    docId,
  } = useEditorStore();

  // Track which version row is currently restoring
  const restoringRef = useRef<number | null>(null);

  if (!isHistoryOpen) return null;

  const handleRestore = async (v: VersionEntry) => {
    if (restoringRef.current !== null) return; // prevent double-click
    restoringRef.current = v.version_number;

    try {
      const { data } = await api.get(
        `/api/documents/${docId}/versions/${v.version_number}`
      );
      onRestoreVersion(data.content);
      addToast(`Restored to version ${v.version_number}.`, "success");
      setHistoryOpen(false);
    } catch {
      addToast("Failed to restore version.", "error");
    } finally {
      restoringRef.current = null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={() => setHistoryOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer — right side, below AIPanel (z-49) */}
      <div
        role="dialog"
        aria-label="Version History"
        className="fixed top-0 right-0 bottom-0 z-49 flex flex-col"
        style={{
          width: "320px",
          height: "100vh", 
          maxHeight: "100vh",
          zIndex: 49,
          background: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
          animation: "slide-in-right 0.22s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.45)",
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
              size={15}
              style={{ color: "var(--color-mint)" }}
              aria-hidden="true"
            />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "0.9rem",
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
            onClick={() => setHistoryOpen(false)}
            className="btn-ghost"
            style={{ padding: "0.3rem", borderRadius: "var(--radius-sm)" }}
            aria-label="Close version history"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Save snapshot ── */}
        <div
          style={{
            padding: "0.875rem 1.25rem",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <button
            onClick={() => saveSnapshot()}
            className="btn-secondary"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              fontSize: "0.8rem",
            }}
          >
            <Save size={13} aria-hidden="true" />
            Save Snapshot
          </button>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.68rem",
              color: "var(--color-text-muted)",
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            Auto-snapshots saved every 10 edits.
          </p>
        </div>

        {/* ── Version list ── */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "0.75rem" }}>
          {/* Loading */}
          {isVersionsLoading && (
            <div className="flex items-center justify-center" style={{ padding: "2rem" }}>
              <div
                className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                style={{
                  borderColor: "var(--color-mint)",
                  borderTopColor: "transparent",
                }}
              />
            </div>
          )}

          {/* Error */}
          {!isVersionsLoading && versionsError && (
            <div
              className="flex items-center gap-2"
              style={{
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#f87171",
                fontSize: "0.78rem",
              }}
            >
              <AlertCircle size={13} aria-hidden="true" />
              {versionsError}
            </div>
          )}

          {/* Empty state */}
          {!isVersionsLoading && !versionsError && versions.length === 0 && (
            <div
              className="flex flex-col items-center"
              style={{
                padding: "2.5rem 1rem",
                gap: "0.75rem",
                color: "var(--color-text-muted)",
              }}
            >
              <Clock size={30} style={{ opacity: 0.3 }} aria-hidden="true" />
              <p
                style={{
                  fontSize: "0.78rem",
                  textAlign: "center",
                  lineHeight: 1.6,
                }}
              >
                No snapshots yet.
                <br />
                Edit 10 times or click
                <br />
                "Save Snapshot" above.
              </p>
            </div>
          )}

          {/* Version rows */}
          {!isVersionsLoading && versions.length > 0 && (
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
              {versions.map((v) => (
                <VersionRow
                  key={v.id}
                  version={v}
                  onRestore={handleRestore}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

// ── Version row sub-component ──────────────────────────────────────────────────

interface VersionRowProps {
  version: VersionEntry;
  onRestore: (v: VersionEntry) => Promise<void>;
}

function VersionRow({ version, onRestore }: VersionRowProps) {
  const isRestoring = useRef(false);

  const handleClick = async () => {
    if (isRestoring.current) return;
    isRestoring.current = true;
    await onRestore(version);
    isRestoring.current = false;
  };

  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.6rem 0.75rem",
        borderRadius: "var(--radius-md)",
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        gap: "0.5rem",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontWeight: 700,
            fontSize: "0.78rem",
            color: "var(--color-cyan)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          v{version.version_number}
        </p>
        <p
          style={{
            fontSize: "0.68rem",
            color: "var(--color-text-muted)",
            marginTop: "0.1rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {formatDate(version.created_at)}
        </p>
      </div>
      <button
        onClick={handleClick}
        className="btn-ghost"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
          fontSize: "0.7rem",
          padding: "0.28rem 0.5rem",
          borderRadius: "var(--radius-sm)",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
        aria-label={`Restore version ${version.version_number}`}
      >
        <RotateCcw size={10} aria-hidden="true" />
        Restore
      </button>
    </li>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}