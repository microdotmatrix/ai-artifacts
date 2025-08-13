"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "./actions";

export type StartParams = {
  prompt: string;
  doc: string;
  messages: ChatMessage[];
  onDone?: (final: { message: string; document: string }) => void;
  entryId?: string | null;
  docType?: "obituary" | "eulogy";
};

export const useArtifactStream = () => {
  const abortRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [assistantText, setAssistantText] = useState("");
  const [docText, setDocText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async ({ prompt, doc, messages, onDone, entryId, docType }: StartParams) => {
      if (isStreaming) return;
      setAssistantText("");
      setDocText(doc);
      setError(null);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // Use the new UI data stream route powered by AI SDK tools
        const res = await fetch("/api/artifact/ui", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // We always request an update with the prompt as description.
          // The server falls back to create when no document exists.
          body: JSON.stringify({
            mode: "update",
            description: prompt,
            entryId: entryId ?? null,
            docType: docType ?? "obituary",
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error("Stream failed to start");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let localAssistant = "";
        let localDoc = doc;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const block = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 2);
            if (!block) continue;

            // Parse SSE block. We only rely on data: JSON lines per AI SDK Data Stream Protocol.
            let dataLine = "";
            for (const line of block.split("\n")) {
              if (line.startsWith("data:")) dataLine = line.slice(5).trim();
            }
            if (!dataLine) continue;

            try {
              const payload = JSON.parse(dataLine);
              const t: string | undefined = payload?.type;
              // Handle custom data parts emitted by our tools
              if (t === "data-clear") {
                localAssistant = "";
                localDoc = "";
                setAssistantText("");
                setDocText("");
              } else if (t === "data-textDelta") {
                const delta = typeof payload.data === "string" ? payload.data : "";
                if (delta) {
                  localDoc += delta;
                  localAssistant += delta;
                  setDocText(localDoc);
                  setAssistantText(localAssistant);
                }
              } else if (t === "data-finish") {
                // Stream finished; surface the final aggregates
                onDone?.({ message: localAssistant, document: localDoc });
              } else if (t === "error") {
                const et = typeof payload.errorText === "string" ? payload.errorText : "Stream error";
                setError(et);
              } else if (t === "text-delta") {
                // Be defensive: if text parts are ever merged into stream
                const delta = typeof payload.delta === "string" ? payload.delta : "";
                if (delta) {
                  localDoc += delta;
                  localAssistant += delta;
                  setDocText(localDoc);
                  setAssistantText(localAssistant);
                }
              }
            } catch {
              // ignore JSON parse errors for malformed chunks
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
