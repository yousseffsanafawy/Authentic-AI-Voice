"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";
import { FileText, Plus, Search, Settings, LogOut, Check, X, Sparkles, ChevronRight, FileCode2 } from "lucide-react";
import api from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="flex flex-col items-center justify-center py-32 relative z-10"
    >
      <div className="relative w-40 h-40 mb-10 flex items-center justify-center">
        {/* Deep, high-opacity glassy rings */}
        <div className="absolute inset-0 rounded-full blur-[40px] opacity-60" 
             style={{ background: 'var(--color-mint)' }} />
        <div className="absolute inset-4 rounded-full border opacity-50 animate-[spin_12s_linear_infinite]" 
             style={{ borderColor: 'var(--color-purple)' }} />
        <div className="absolute inset-10 rounded-full border opacity-40 animate-[spin_8s_linear_infinite_reverse]" 
             style={{ borderColor: 'var(--color-cyan)' }} />
        <FileCode2 className="w-12 h-12 relative z-10" style={{ color: 'var(--color-mint)' }} />
      </div>
      <h3 className="text-3xl font-bold mb-3 tracking-widest text-transparent bg-clip-text"
          style={{ backgroundImage: 'linear-gradient(135deg, var(--color-mint), var(--color-purple))', fontFamily: 'var(--font-display)' }}>
        AWAITING INPUTS
      </h3>
      <p className="text-sm mb-10 max-w-md text-center leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        The neural core is empty. Initialize a new document to begin deep stylistic analysis and synthesis.
      </p>
      
      <motion.button 
        onClick={onCreate}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ 
          boxShadow: [
            "0px 0px 0px rgba(52,211,153,0)", 
            "0px 0px 30px rgba(52,211,153,0.5)", 
            "0px 0px 0px rgba(52,211,153,0)"
          ] 
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="flex items-center gap-3 px-8 py-4 rounded-[2rem] font-semibold tracking-widest uppercase text-sm border transition-all"
        style={{ 
          background: 'linear-gradient(135deg, rgba(52,211,153,0.1), rgba(139,92,246,0.1))',
          backdropFilter: 'blur(10px)',
          borderColor: 'var(--color-mint)',
          color: 'var(--color-text)'
        }}
      >
        <Plus size={18} style={{ color: 'var(--color-mint)' }} />
        Initialize Core
      </motion.button>
    </motion.div>
  );
}

interface DocumentCardProps {
  doc: DocumentOut;
  onClick: () => void;
  onDelete: () => void;
  onConfirm: () => void;
  onCancelDelete: () => void;
  isDeleting: boolean;
  showConfirm: boolean;
  index: number;
}

function DocumentCard({ doc, onClick, onDelete, onConfirm, onCancelDelete, isDeleting, showConfirm, index }: DocumentCardProps) {
  const accentPairs = [
    { from: "var(--color-mint)", to: "var(--color-purple)" },
    { from: "var(--color-cyan)", to: "var(--color-mint)" },
    { from: "var(--color-purple)", to: "var(--color-cyan)" },
  ];
  const accent = accentPairs[doc.id.charCodeAt(0) % 3];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: "easeOut" }}
      whileHover={!isDeleting ? { scale: 1.02, y: -6 } : {}}
      whileTap={!isDeleting ? { scale: 0.98 } : {}}
      onClick={!isDeleting && !showConfirm ? onClick : undefined}
      className="group relative p-7 rounded-3xl overflow-hidden transition-all duration-500"
      style={{
        opacity: isDeleting ? 0.4 : 1,
        pointerEvents: isDeleting ? 'none' : 'auto',
        cursor: showConfirm ? 'default' : 'pointer',
        background: 'rgba(255, 255, 255, 0.015)',
        backdropFilter: 'blur(32px)',
        border: '1px solid var(--color-border-bright)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.02)'
      }}
    >
      {/* Intense Glowing Hover Border */}
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" 
           style={{ 
             boxShadow: `inset 0 0 40px ${accent.from}15, inset 0 0 0 1px ${accent.from}80` 
           }} />

      {/* Dynamic Top Gradient Bar */}
      <div className="absolute top-0 left-0 h-1.5 w-12 rounded-r-full transition-all duration-700 ease-out group-hover:w-full opacity-70 group-hover:opacity-100" 
           style={{ background: `linear-gradient(90deg, ${accent.from}, ${accent.to})` }} />
      
      {/* Delete Controls - Glassy & High Contrast */}
      <div className="absolute top-5 right-5 z-20">
        {showConfirm ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border"
            style={{ 
              background: 'rgba(244, 63, 94, 0.1)', 
              backdropFilter: 'blur(20px)',
              borderColor: 'rgba(244, 63, 94, 0.4)'
            }}
          >
            <button 
              onClick={e => { e.stopPropagation(); onConfirm(); }}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors hover:text-white"
              style={{ color: 'var(--color-error)' }}
            >
              <Check size={14} /> Purge
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button 
              onClick={e => { e.stopPropagation(); onCancelDelete(); }}
              className="px-1 transition-colors hover:text-white"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X size={15} />
            </button>
          </motion.div>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg hover:bg-white/5"
            style={{ color: 'var(--color-text-muted)' }}
            title="Delete document"
          >
            <X size={20} className="hover:text-[var(--color-error)] transition-colors" />
          </button>
        )}
      </div>

      <div className="flex flex-col h-full relative z-10">
        <div className="flex items-start gap-4 mb-6 mt-2">
          {/* Deep Glass Icon Container */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border relative overflow-hidden"
               style={{
                 background: `linear-gradient(135deg, ${accent.from}15, ${accent.to}15)`,
                 borderColor: `${accent.from}30`,
                 boxShadow: `0 8px 24px ${accent.from}20, inset 0 0 12px rgba(255,255,255,0.1)`
               }}>
            <div className="absolute inset-0 opacity-40 blur-md" style={{ background: accent.from }} />
            <FileText size={24} className="relative z-10" style={{ color: 'var(--color-text)' }} />
          </div>
          
          <div className="flex-1 min-w-0 pr-8 pt-1">
            <h3 className="font-bold text-lg truncate tracking-wide" style={{ color: 'var(--color-text)' }} title={doc.title}>
              {doc.title || "Untitled"}
            </h3>
            <p className="text-xs mt-1.5 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
              Neural Record
            </p>
          </div>
        </div>
        
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <span className="px-2.5 py-1 rounded-lg font-mono border" 
                  style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    borderColor: 'var(--color-border)',
                    color: accent.from
                  }}>
              {doc.word_count.toLocaleString()} tok
            </span>
            <span>{timeAgo(doc.updated_at)}</span>
          </div>
          <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" 
                        style={{ color: accent.from }} />
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [splashVisible, setSplashVisible] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const router = useRouter();
  const { addToast } = useEditorStore();

  // Mouse tracking for the deep neural spotlight mask
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { damping: 50, stiffness: 300 });
  const springY = useSpring(mouseY, { damping: 50, stiffness: 300 });
  const maskImage = useMotionTemplate`radial-gradient(700px circle at ${springX}px ${springY}px, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 70%)`;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setSplashVisible(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const { data } = await api.get("/api/documents");
      setDocuments(data);
    } catch {
      addToast("Failed to connect to neural core.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    api.get("/api/auth/me")
      .then(({ data }) => setUserEmail(data.email))
      .catch(() => { });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    document.cookie = "auth_token=; path=/; max-age=0";
    router.push("/login");
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data } = await api.post("/api/documents", { title: "Untitled" });
      router.push(`/documents/${data.id}`);
    } catch {
      addToast("Failed to initialize document.", "error");
      setCreating(false);
    }
  };

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    try {
      await api.delete(`/api/documents/${docId}`);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      addToast("Record successfully purged.", "success");
    } catch {
      addToast("Failed to purge record.", "error");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const filtered = documents.filter(d =>
    (d.title || "Untitled").toLowerCase().includes(search.toLowerCase())
  );

  const initial = userEmail ? userEmail[0].toUpperCase() : "A";

  return (
    <div className="relative min-h-screen text-white overflow-hidden font-sans" style={{ background: 'var(--color-bg-deep)' }}>
      
      {/* ── IMMERSIVE NEURAL SPLASH SCREEN ── */}
      <AnimatePresence>
        {splashVisible && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(7, 9, 15, 0.85)', backdropFilter: 'blur(40px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center gap-8"
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 blur-[50px] opacity-40 animate-pulse" style={{ background: 'var(--color-mint)' }} />
                <Sparkles className="w-16 h-16 relative z-10" style={{ color: 'var(--color-mint)' }} />
              </div>
              <h2 className="text-xl md:text-3xl font-light tracking-[0.4em] uppercase text-center"
                  style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)', textShadow: '0 0 30px var(--color-mint)' }}>
                Neural Link <span style={{ color: 'var(--color-mint)', fontWeight: 700 }}>Active</span>
              </h2>
              <div className="w-80 h-1 rounded-full overflow-hidden mt-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className="h-full shadow-[0_0_20px_rgba(52,211,153,1)]"
                  style={{ background: 'linear-gradient(90deg, var(--color-cyan), var(--color-mint), var(--color-purple))' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HIGH-OPACITY DYNAMIC NEURAL MASK ── */}
      {mounted && (
        <motion.div 
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.85]"
          style={{
            backgroundImage: `
              url("data:image/svg+xml,%3Csvg width='240' height='240' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 60 L180 30 L210 150 L120 220 Z M40 60 L120 120 L180 30 M120 120 L210 150 M120 120 L120 220 M40 60 L0 120 M240 120 L210 150 M120 0 L180 30 M120 240 L120 220 M0 0 L40 60 M240 240 L210 150 M240 0 L180 30 M0 240 L120 220 M0 50 L40 60 M240 50 L180 30 M0 180 L120 220 M240 180 L210 150' stroke='rgba(52,211,153,0.18)' stroke-width='1.5' fill='none'/%3E%3Ccircle cx='40' cy='60' r='3' fill='rgba(139,92,246,0.7)'/%3E%3Ccircle cx='180' cy='30' r='3.5' fill='rgba(6,182,212,0.7)'/%3E%3Ccircle cx='210' cy='150' r='2.5' fill='rgba(52,211,153,0.7)'/%3E%3Ccircle cx='120' cy='220' r='3' fill='rgba(139,92,246,0.7)'/%3E%3Ccircle cx='120' cy='120' r='4' fill='rgba(6,182,212,0.9)'/%3E%3C/svg%3E"),
              url("data:image/svg+xml,%3Csvg width='360' height='360' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 90 L270 45 L315 225 L180 330 Z M60 90 L180 180 L270 45 M180 180 L315 225 M180 180 L180 330 M60 90 L0 180 M360 180 L315 225 M180 0 L270 45 M180 360 L180 330 M0 0 L60 90 M360 360 L315 225 M360 0 L270 45 M0 360 L180 330 M0 75 L60 90 M360 75 L270 45 M0 270 L180 330 M360 270 L315 225' stroke='rgba(139,92,246,0.15)' stroke-width='1' fill='none'/%3E%3Ccircle cx='60' cy='90' r='2' fill='rgba(52,211,153,0.5)'/%3E%3Ccircle cx='270' cy='45' r='3' fill='rgba(139,92,246,0.5)'/%3E%3Ccircle cx='315' cy='225' r='2' fill='rgba(6,182,212,0.5)'/%3E%3Ccircle cx='180' cy='330' r='2' fill='rgba(52,211,153,0.5)'/%3E%3Ccircle cx='180' cy='180' r='3.5' fill='rgba(139,92,246,0.6)'/%3E%3C/svg%3E")
            `,
            backgroundSize: '240px 240px, 360px 360px',
            backgroundPosition: '0 0, 120px 120px',
            maskImage: maskImage,
            WebkitMaskImage: maskImage,
          }}
        >
          {/* Deep Glowing Accent Orbs inside the grid */}
          <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-30" style={{ background: 'var(--color-purple)' }} />
          <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-20" style={{ background: 'var(--color-mint)' }} />
          <div className="absolute top-[40%] right-[40%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-20" style={{ background: 'var(--color-cyan)' }} />
        </motion.div>
      )}

      {/* ── ULTRA-GLASS HEADER ── */}
      <header className="sticky top-0 z-40 px-8 py-5 flex items-center justify-between transition-all"
              style={{
                background: 'rgba(7, 9, 15, 0.3)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                borderBottom: '1px solid var(--color-border-bright)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
              }}>
        <div className="flex items-center gap-3 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]">
          <AppLogo size="md" />
        </div>

        <div className="flex items-center gap-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold tracking-wider uppercase transition-all"
            style={{ 
              background: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(139,92,246,0.15))',
              border: '1px solid var(--color-mint)',
              boxShadow: '0 0 20px rgba(52,211,153,0.2)',
              color: 'var(--color-text)'
            }}
          >
            {creating ? (
              <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-mint)' }} />
            ) : (
              <Plus size={18} style={{ color: 'var(--color-mint)' }} />
            )}
            New Sync
          </motion.button>

          <a
            href="/settings"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:bg-white/5 border"
            style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)', background: 'rgba(255,255,255,0.02)' }}
          >
            <Settings size={16} style={{ color: 'var(--color-purple)' }} />
            Settings
          </a>

          <div className="w-px h-8 bg-white/10 mx-2" />

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border"
                 style={{ 
                   background: 'rgba(52,211,153,0.1)',
                   borderColor: 'var(--color-mint)', 
                   color: 'var(--color-mint)',
                   boxShadow: '0 0 20px rgba(52,211,153,0.3), inset 0 0 10px rgba(52,211,153,0.2)',
                   textShadow: '0 0 10px var(--color-mint)'
                 }}>
              {initial}
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-full transition-colors hover:bg-white/5"
              style={{ color: 'var(--color-text-muted)' }}
              title="Disconnect"
            >
              <LogOut size={20} className="hover:text-[var(--color-error)] transition-colors" />
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <h1 className="text-5xl font-extrabold mb-3 tracking-tight"
                style={{ 
                  fontFamily: 'var(--font-display)',
                  background: 'linear-gradient(135deg, #fff, var(--color-text-muted))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
              Neural Memory
            </h1>
            <p className="font-mono text-sm uppercase tracking-[0.2em] flex items-center gap-3"
               style={{ color: 'var(--color-mint)' }}>
              <span className="w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_10px_var(--color-mint)]" style={{ background: 'var(--color-mint)' }} />
              {loading ? "Scanning core..." : `${documents.length} Records Found`}
            </p>
          </motion.div>

          {!loading && documents.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="relative w-full md:w-96 group"
            >
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={20} className="transition-colors group-focus-within:text-white" style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search document name..."
                className="w-full rounded-full py-3.5 pl-12 pr-5 text-sm transition-all focus:outline-none"
                style={{ 
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
                }}
              />
            </motion.div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 rounded-3xl animate-pulse relative overflow-hidden"
                   style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)' }}>
                 <div className="absolute inset-0 animate-[shimmer_2s_infinite]" 
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)' }} />
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState onCreate={handleCreate} />
        ) : (
          <>
            {search && filtered.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-24 font-mono tracking-widest text-lg"
                style={{ color: 'var(--color-text-muted)' }}
              >
                [ ERROR: Pattern "{search}" not found in current sector ]
              </motion.div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
              {filtered.map((doc, i) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  index={i}
                  onClick={() => router.push(`/documents/${doc.id}`)}
                  onDelete={() => setConfirmId(doc.id)}
                  onConfirm={() => handleDelete(doc.id)}
                  onCancelDelete={() => setConfirmId(null)}
                  isDeleting={deletingId === doc.id}
                  showConfirm={confirmId === doc.id}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
