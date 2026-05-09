"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";
import { DocumentCardSkeleton } from "@/components/ui/Skeleton";
import AppLogo from "@/components/ui/AppLogo";

interface DocumentOut {
  id: string;
  title: string;
  word_count: number;
  updated_at: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 animate-fade-up">
      {/* Animated icon */}
      <div
        className="w-28 h-28 rounded-3xl mb-7 flex items-center justify-center relative"
        style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
      >
        <div
          className="absolute inset-0 rounded-3xl opacity-40"
          style={{
            background: "radial-gradient(circle at 60% 40%, rgba(52,211,153,0.25), transparent 70%)",
          }}
        />
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="8" y="6" width="28" height="36" rx="4" stroke="var(--color-text-muted)" strokeWidth="1.5" />
          <line x1="14" y1="14" x2="30" y2="14" stroke="var(--color-mint)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="14" y1="20" x2="30" y2="20" stroke="var(--color-text-subtle)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="14" y1="26" x2="23" y2="26" stroke="var(--color-text-subtle)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="36" cy="36" r="9" fill="var(--color-surface)" stroke="var(--color-mint)" strokeWidth="1.5" />
          <line x1="36" y1="32" x2="36" y2="40" stroke="var(--color-mint)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="32" y1="36" x2="40" y2="36" stroke="var(--color-mint)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      <h3 className="text-xl font-semibold text-white mb-2">No documents yet</h3>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>
        Create your first document and start writing
      </p>
      <button onClick={onCreate} className="btn-primary px-7 py-2.5 text-base animate-pulse-mint">
        <span>✦</span> Create Document
      </button>
    </div>
  );
}

function DocumentCard({ doc, onClick }: { doc: DocumentOut; onClick: () => void }) {
  // Deterministic accent color per doc based on id char
  const accentColors = [
    { from: "var(--color-cyan)", to: "var(--color-mint)" },
    { from: "var(--color-mint)", to: "var(--color-purple)" },
    { from: "var(--color-purple)", to: "var(--color-cyan)" },
  ];
  const accent = accentColors[doc.id.charCodeAt(0) % 3];

  return (
    <div
      onClick={onClick}
      className="group p-5 rounded-2xl cursor-pointer card-hover animate-fade-up"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      {/* Top accent bar */}
      <div
        className="h-0.5 w-12 rounded-full mb-4 transition-all duration-300 group-hover:w-20"
        style={{ background: `linear-gradient(90deg, ${accent.from}, ${accent.to})` }}
      />

      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${accent.from}22, ${accent.to}22)`,
            border: `1px solid ${accent.from}33`,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="1" width="10" height="14" rx="1.5" stroke={accent.from} strokeWidth="1.2" />
            <line x1="4" y1="5" x2="10" y2="5" stroke={accent.to} strokeWidth="1" strokeLinecap="round" />
            <line x1="4" y1="7.5" x2="10" y2="7.5" stroke={accent.from} strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.5" />
            <line x1="4" y1="10" x2="7" y2="10" stroke={accent.from} strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.5" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate text-sm leading-snug mb-1"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
            title={doc.title}>
            {doc.title || "Untitled"}
          </h3>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {doc.word_count.toLocaleString()} {doc.word_count === 1 ? "word" : "words"}
            &nbsp;·&nbsp;{timeAgo(doc.updated_at)}
          </p>
        </div>

        <span
          className="text-lg opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5"
          style={{ color: "var(--color-mint)" }}
        >
          →
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const { addToast } = useEditorStore();

  const fetchDocuments = useCallback(async () => {
    try {
      const { data } = await api.get("/api/documents");
      setDocuments(data);
    } catch {
      addToast("Failed to load documents. Is the backend running?", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data } = await api.post("/api/documents", { title: "Untitled" });
      router.push(`/documents/${data.id}`);
    } catch {
      addToast("Failed to create document.", "error");
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-deep)" }}>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 px-6 py-4 flex items-center justify-between"
        style={{
          background: "rgba(7,9,15,0.88)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <AppLogo size="md" />

        <div className="flex items-center gap-3">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="btn-primary"
          >
            {creating ? (
              <>
                <span
                  className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"
                  style={{ flexShrink: 0 }}
                />
                Creating…
              </>
            ) : (
              <>✦ New Document</>
            )}
          </button>

          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: "linear-gradient(135deg, var(--color-surface-3), var(--color-surface-2))",
              border: "1px solid var(--color-border-bright)",
              color: "var(--color-text-muted)",
            }}
            title="Sign in — Sprint 2"
          >
            ?
          </div>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* Page title row */}
        <div className="flex items-end justify-between mb-8 animate-fade-in">
          <div>
            <h1
            className="text-2xl font-bold text-white mb-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            My Documents
          </h1>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {loading ? "Loading…" : `${documents.length} document${documents.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Decorative mint pill */}
          {!loading && documents.length > 0 && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: "rgba(52,211,153,0.1)",
                color: "var(--color-mint)",
                border: "1px solid rgba(52,211,153,0.2)",
              }}
            >
              <span className="status-dot saved" /> All synced
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <DocumentCardSkeleton key={i} />)}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState onCreate={handleCreate} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc, i) => (
              <div key={doc.id} style={{ animationDelay: `${i * 60}ms` }}>
                <DocumentCard
                  doc={doc}
                  onClick={() => router.push(`/documents/${doc.id}`)}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
