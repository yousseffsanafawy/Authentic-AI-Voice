"use client";

type VoiceProfile = Record<string, number | Record<string, number>>;

interface VoiceProfileCardProps {
  profile: VoiceProfile | null;
  isAnalyzing: boolean;
  hasSamples: boolean;
}

interface FeatureConfig {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  pct?: boolean;
}

const FEATURE_CONFIG: FeatureConfig[] = [
  { key: "avg_sentence_length",   label: "Avg Sentence Length",  unit: "words",  min: 5,   max: 40   },
  { key: "avg_word_length",       label: "Avg Word Length",       unit: "chars",  min: 3,   max: 8    },
  { key: "type_token_ratio",      label: "Vocabulary Variety",    unit: "%",      min: 0,   max: 1,   pct: true },
  { key: "passive_voice_ratio",   label: "Passive Voice",         unit: "%",      min: 0,   max: 0.3, pct: true },
  { key: "flesch_reading_ease",   label: "Reading Ease",          unit: "/100",   min: 0,   max: 100  },
  { key: "flesch_kincaid_grade",  label: "Grade Level",           unit: "grade",  min: 1,   max: 16   },
  { key: "conjunction_frequency", label: "Conjunctions",          unit: "%",      min: 0,   max: 0.1, pct: true },
  { key: "adverb_frequency",      label: "Adverb Usage",          unit: "%",      min: 0,   max: 0.1, pct: true },
  { key: "first_person_ratio",    label: "First-Person Ratio",    unit: "%",      min: 0,   max: 0.15, pct: true },
  { key: "paragraph_length_avg",  label: "Avg Paragraph Length",  unit: "words",  min: 20,  max: 200  },
  { key: "transition_word_ratio", label: "Transition Words",      unit: "%",      min: 0,   max: 0.05, pct: true },
];

function getBarColor(key: string, value: number): string {
  if (key === "flesch_reading_ease") {
    if (value >= 60) return "var(--color-mint)";
    if (value >= 30) return "#f59e0b";
    return "var(--color-error, #ef4444)";
  }
  return "var(--color-cyan)";
}

function getReadingLabel(value: number): string {
  if (value >= 60) return "Conversational";
  if (value >= 30) return "Moderate";
  return "Very Academic";
}

function formatValue(value: number, pct?: boolean): string {
  if (pct) return (value * 100).toFixed(1);
  return value.toFixed(1);
}

function SkeletonCard() {
  return (
    <div
      style={{
        borderRadius: "var(--radius-md)",
        padding: "1rem",
        height: "100px",
        background:
          "linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-surface-3) 50%, var(--color-surface-2) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        border: "1px solid var(--color-border)",
      }}
    />
  );
}

function StatCard({ feature, value }: { feature: FeatureConfig; value: number }) {
  const barWidth = Math.min(100, Math.max(0, ((value - feature.min) / (feature.max - feature.min)) * 100));
  const barColor = getBarColor(feature.key, value);
  const displayValue = formatValue(value, feature.pct);

  return (
    <div
      style={{
        background: "linear-gradient(145deg, rgba(30,36,53,0.5) 0%, rgba(22,27,39,0.3) 100%)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        borderRadius: "var(--radius-md)",
        padding: "1rem",
        animation: "fade-up 0.3s ease-out both",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-20px",
          right: "-20px",
          width: "80px",
          height: "80px",
          background: barColor,
          filter: "blur(40px)",
          opacity: 0.15,
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      <p
        style={{
          fontSize: "0.7rem",
          color: "var(--color-text-muted)",
          margin: 0,
          marginBottom: "0.4rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {feature.label}
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "0.25rem",
          marginBottom: "0.5rem",
        }}
      >
        <span
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            background: "linear-gradient(to right, var(--color-mint-soft), var(--color-cyan))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1.1,
          }}
        >
          {displayValue}
        </span>
        <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
          {feature.unit}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: "4px",
          background: "var(--color-surface-3)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${barWidth}%`,
            background: barColor,
            borderRadius: "2px",
            transition: "width 0.6s ease",
          }}
        />
      </div>

      {/* Qualitative label for reading ease */}
      {feature.key === "flesch_reading_ease" && (
        <p
          style={{
            fontSize: "0.65rem",
            color: barColor,
            margin: 0,
            marginTop: "0.3rem",
            fontWeight: 600,
          }}
        >
          {getReadingLabel(value)}
        </p>
      )}
    </div>
  );
}

function PunctuationCard({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).slice(0, 5);

  return (
    <div
      style={{
        background: "linear-gradient(145deg, rgba(30,36,53,0.5) 0%, rgba(22,27,39,0.3) 100%)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        borderRadius: "var(--radius-md)",
        padding: "1rem",
        animation: "fade-up 0.3s ease-out both",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-20px",
          right: "-20px",
          width: "80px",
          height: "80px",
          background: "var(--color-purple)",
          filter: "blur(40px)",
          opacity: 0.15,
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      <p
        style={{
          fontSize: "0.7rem",
          color: "var(--color-text-muted)",
          margin: 0,
          marginBottom: "0.5rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Punctuation Style
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
        {entries.map(([char, ratio]) => (
          <div
            key={char}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.78rem",
            }}
          >
            <span
              style={{
                color: "var(--color-text-muted)",
                fontFamily: "monospace",
                fontWeight: 600,
              }}
            >
              {char === "." ? "period" : char === "," ? "comma" : char}
            </span>
            <span 
              style={{ 
                fontWeight: 600,
                background: "linear-gradient(to right, var(--color-cyan), var(--color-purple))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {(ratio * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VoiceProfileCard({
  profile,
  isAnalyzing,
  hasSamples,
}: VoiceProfileCardProps) {
  // State 1 — no samples yet
  if (!hasSamples && !profile && !isAnalyzing) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          background: "var(--color-surface-2)",
          borderRadius: "var(--radius-lg)",
          border: "1px dashed var(--color-border)",
        }}
      >
        <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎙️</p>
        <p style={{ color: "var(--color-text)", fontWeight: 600, margin: 0 }}>
          Your Voice Profile
        </p>
        <p
          style={{
            color: "var(--color-text-muted)",
            fontSize: "0.82rem",
            marginTop: "0.4rem",
          }}
        >
          Upload writing samples above to reveal your style profile.
        </p>
      </div>
    );
  }

  // State 2 — analyzing (skeleton)
  if (isAnalyzing && !profile) {
    return (
      <div>
        <h3
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            background: "linear-gradient(to right, var(--color-mint), var(--color-cyan))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: 0,
            marginBottom: "0.75rem",
          }}
        >
          Your Voice Profile
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // State 3 — profile ready
  if (!profile) return null;

  const punctuation = profile["top_punctuation"] as Record<string, number> | undefined;

  return (
    <div>
      <h3
        style={{
          fontSize: "1.1rem",
          fontWeight: 700,
          background: "linear-gradient(to right, var(--color-cyan), var(--color-purple))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "0.75rem",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <span style={{ color: "var(--color-mint)" }}>✦</span> Your Voice Profile
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {FEATURE_CONFIG.map((feature) => {
          const raw = profile[feature.key];
          if (typeof raw !== "number") return null;
          return <StatCard key={feature.key} feature={feature} value={raw} />;
        })}
        {punctuation && typeof punctuation === "object" && (
          <PunctuationCard data={punctuation} />
        )}
      </div>
    </div>
  );
}
