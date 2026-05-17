"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import api from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";
import SampleUploader, { type SampleEntry } from "@/components/settings/SampleUploader";
import SampleList from "@/components/settings/SampleList";
import VoiceProfileCard from "@/components/settings/VoiceProfileCard";

type VoiceProfile = Record<string, number | Record<string, number>>;

export default function SettingsPage() {
  const { addToast } = useEditorStore();
  const [samples, setSamples] = useState<SampleEntry[]>([]);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const checkVoiceProfile = useCallback(async () => {
    try {
      const { data } = await api.get<{
        status: string;
        voice_profile?: VoiceProfile;
      }>("/api/samples/voice-profile");
      if (data.status === "ready" && data.voice_profile) {
        setVoiceProfile(data.voice_profile);
        setIsAnalyzing(false);
        stopPolling();
      }
    } catch {
      // silently ignore — polling will retry
    }
  }, [stopPolling]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return; // no double-start
    setIsAnalyzing(true);
    pollRef.current = setInterval(checkVoiceProfile, 3000);
  }, [checkVoiceProfile]);

  // Load samples and current profile on mount
  useEffect(() => {
    api
      .get<SampleEntry[]>("/api/samples")
      .then(({ data }) => setSamples(data))
      .catch(() => addToast("Failed to load samples.", "error"));

    checkVoiceProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handleUploadSuccess = (sample: SampleEntry) => {
    setSamples((prev) => [sample, ...prev]);
    setVoiceProfile(null); // invalidate while re-analyzing
    startPolling();
    addToast(`"${sample.filename}" uploaded. Analyzing your style…`, "info");
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/api/samples/${id}`);
    setSamples((prev) => prev.filter((s) => s.id !== id));
    setVoiceProfile(null);
    // Only re-analyze if samples will remain after this delete
    if (samples.length > 1) {
      startPolling();
    }
    addToast("Sample deleted.", "success");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg-deep)" }}>
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          padding: "1rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(7,9,15,0.88)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <a
          href="/dashboard"
          style={{
            fontSize: "0.82rem",
            color: "var(--color-text-muted)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.color = "var(--color-text)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.color = "var(--color-text-muted)")
          }
        >
          ← Dashboard
        </a>

        <h1
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--color-text)",
            margin: 0,
            fontFamily: "var(--font-display)",
          }}
        >
          Writing Style Settings
        </h1>

        <div style={{ width: "80px" }} />
      </header>

      {/* Main */}
      <main
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          padding: "2rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
        }}
      >
        {/* Intro */}
        <div style={{ animation: "fade-up 0.3s ease-out both" }}>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--color-text)",
              margin: 0,
              marginBottom: "0.4rem",
              fontFamily: "var(--font-display)",
            }}
          >
            Your Writing Voice
          </h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", margin: 0 }}>
            Upload samples of your writing. The AI will learn your style and enhance
            text to sound authentically like you.
          </p>
        </div>

        {/* Upload zone */}
        <section style={{ animation: "fade-up 0.35s ease-out both" }}>
          <SampleUploader
            onUploadSuccess={handleUploadSuccess}
            disabled={samples.length >= 5}
          />
        </section>

        {/* Sample list */}
        {samples.length > 0 && (
          <section style={{ animation: "fade-up 0.4s ease-out both" }}>
            <SampleList
              samples={samples}
              isAnalyzing={isAnalyzing}
              onDelete={handleDelete}
            />
          </section>
        )}

        {/* Voice profile */}
        <section style={{ animation: "fade-up 0.45s ease-out both" }}>
          <VoiceProfileCard
            profile={voiceProfile}
            isAnalyzing={isAnalyzing}
            hasSamples={samples.length > 0}
          />
        </section>
      </main>
    </div>
  );
}
