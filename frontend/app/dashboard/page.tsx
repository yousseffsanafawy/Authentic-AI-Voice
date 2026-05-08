"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";
import { DocumentCardSkeleton } from "@/components/ui/Skeleton";

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
    <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
      <div
        className="w-24 h-24 rounded-3xl mb-6 flex items-center justify-center"
        style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect x="8" y="5" width="24" height="30" rx="3" stroke="var(--color-text-muted)" strokeWidth="1.5" />
          <line x1="13" y1="13" x2="27" y2="13" stroke="var(--color-neon-primary)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="13" y1="18" x2="27" y2="18" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="13" y1="23" x2="21" y2="23" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="30" cy="30" r="7" fill="var(--color-surface)" stroke="var(--color-neon-primary)" strokeWidth="1.5" />
          <line x1="30" y1="27" x2="30" y2="33" stroke="var(--color-neon-primary)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="27" y1="30" x2="33" y2="30" stroke="var(--color-neon-primary)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">No documents yet</h3>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
        Create your first document and start writing
      </p>
      <button
        onClick={onCreate}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200"
        style={{
          background: "linear-gradient(135deg, var(--color-neon-primary), var(--color-neon-purple))",
          boxShadow: "0 0 20px rgba(6,182,212,0.3)",
        }}
      >
        + Create Document
      </button>
    </div>
  );
}

function DocumentCard({
  doc,
  onClick,
}: {
  doc: DocumentOut;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group p-5 rounded-2xl cursor-pointer transition-all duration-200 animate-fade-in"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-neon-primary)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 20px rgba(6,182,212,0.15)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
          style={{ background: "var(--color-surface-3)" }}
        >
          📄
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-white truncate text-sm leading-snug mb-0.5"
            title={doc.title}
          >
            {doc.title || "Untitled"}
          </h3>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {doc.word_count.toLocaleString()} {doc.word_count === 1 ? "word" : "words"}
            &nbsp;·&nbsp;Updated {timeAgo(doc.updated_at)}
          </p>
        </div>
        <span
          className="text-lg opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "var(--color-neon-primary)" }}
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

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-6 py-4 flex items-center justify-between"
        style={{
          background: "rgba(7,9,15,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
            style={{ background: "linear-gradient(135deg, var(--color-neon-primary), var(--color-neon-purple))" }}
          >
            ✦
          </div>
          <span className="font-bold text-lg gradient-text">Authentic Voice</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
              text-white transition-all duration-200 disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, var(--color-neon-primary), var(--color-neon-purple))",
              boxShadow: "0 0 16px rgba(6,182,212,0.25)",
            }}
          >
            {creating ? "Creating…" : "+ New Document"}
          </button>

          {/* Avatar placeholder — Sprint 2 */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ background: "var(--color-surface-3)", color: "var(--color-text-muted)" }}
            title="Sign in — Sprint 2"
          >
            ?
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">My Documents</h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {loading
              ? "Loading…"
              : `${documents.length} document${documents.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <DocumentCardSkeleton key={i} />)}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState onCreate={handleCreate} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onClick={() => router.push(`/documents/${doc.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
