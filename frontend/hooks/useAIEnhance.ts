"use client";

import { useState, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface UseAIEnhanceReturn {
  streamedText: string;
  isStreaming: boolean;
  error: string | null;
  enhance: (selectedText: string, instruction: string) => Promise<void>;
  reset: () => void;
}

export function useAIEnhance(): UseAIEnhanceReturn {
  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStreamedText("");
    setError(null);
    setIsStreaming(false);
  }, []);

  const enhance = useCallback(
    async (selectedText: string, instruction: string) => {
      setStreamedText("");
      setError(null);
      setIsStreaming(true);

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("auth_token")
          : null;

      try {
        const response = await fetch(`${API_URL}/api/ai/enhance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            selected_text: selectedText,
            instruction,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          if (response.status === 429) {
            throw new Error(
              data.detail ||
                "Rate limit exceeded. Please wait 60 seconds and try again."
            );
          }
          throw new Error(data.detail || "AI enhancement failed.");
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const lines = decoder.decode(value).split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              setIsStreaming(false);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                setStreamedText((prev) => prev + parsed.text);
              }
            } catch {
              // ignore malformed chunks
            }
          }
        }
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  return { streamedText, isStreaming, error, enhance, reset };
}
