"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import AppLogo from "@/components/ui/AppLogo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      // Store token in BOTH localStorage (for Axios) AND cookie (for middleware)
      localStorage.setItem("auth_token", data.access_token);
      document.cookie = `auth_token=${data.access_token}; path=/; max-age=${60 * 60 * 24}; SameSite=Strict`;
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Login failed. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--color-bg-deep)" }}
    >
      {/* Ambient glow blobs */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 70%)",
        }}
      />

      <div
        className="w-full max-w-[420px] relative"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "2.5rem",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <AppLogo size="md" />
        </div>

        <h1
          className="text-2xl font-bold mb-1 text-center"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}
        >
          Welcome back
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>
          Sign in to continue writing
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border-bright)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text)",
                padding: "0.7rem 1rem",
                width: "100%",
                outline: "none",
                transition: "border-color 0.2s",
                fontSize: "0.875rem",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-mint)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--color-border-bright)")}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)" }}
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border-bright)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--color-text)",
                  padding: "0.7rem 2.8rem 0.7rem 1rem",
                  width: "100%",
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontSize: "0.875rem",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--color-mint)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--color-border-bright)")}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: "var(--color-text-muted)" }}
                tabIndex={-1}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Inline error */}
          {error && (
            <p
              className="text-sm px-3 py-2 rounded-md"
              style={{
                color: "var(--color-error)",
                background: "rgba(244,63,94,0.08)",
                border: "1px solid rgba(244,63,94,0.2)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-1"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <>
                <span
                  className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"
                />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Register link */}
        <p className="text-center text-sm mt-6" style={{ color: "var(--color-text-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            style={{ color: "var(--color-mint)" }}
            className="font-medium hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
