"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "./actions";

export type StartParams = {
  prompt: string;
  doc: string;
  messages: ChatMessage[];
  onDone?: (final: { message: string; document: string }) => void;
};

export const useArtifactStream = () => {
  const abortRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [assistantText, setAssistantText] = useState("");
  const [docText, setDocText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async ({ prompt, doc, messages, onDone }: StartParams) => {
      if (isStreaming) return;
      setAssistantText("");
      setDocText(doc);
      setError(null);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/artifact/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, doc, messages }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error("Stream failed to start");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const block = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 2);
            if (!block) continue;

            let eventName = "";
            let dataLine = "";
            for (const line of block.split("\n")) {
              if (line.startsWith("event:")) eventName = line.slice(6).trim();
              if (line.startsWith("data:")) dataLine = line.slice(5).trim();
            }
            if (!eventName) continue;

            if (eventName === "object") {
              try {
                const partial = JSON.parse(dataLine);
                if (typeof partial.message === "string") setAssistantText(partial.message);
                if (typeof partial.document === "string") setDocText(partial.document);
              } catch {
                // ignore partial parse errors
              }
            } else if (eventName === "done") {
              try {
                const final = JSON.parse(dataLine);
                if (typeof final.message === "string") setAssistantText(final.message);
                if (typeof final.document === "string") setDocText(final.document);
                onDone?.(final);
              } catch {
                // ignore
              }
            }
          }
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          // user aborted; expose partials as-is
        } else {
          setError(err instanceof Error ? err.message : "Stream failed");
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming]
  );

  const stop = useCallback(() => {
    const ctrl = abortRef.current;
    if (ctrl && !ctrl.signal.aborted) ctrl.abort();
  }, []);

  return { isStreaming, assistantText, docText, error, start, stop };
};
