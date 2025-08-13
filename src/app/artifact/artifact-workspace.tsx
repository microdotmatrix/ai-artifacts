"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { ArtifactState, ChatMessage } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useArtifactStream } from "./use-artifact-stream";

type InitialProps = {
  initialDoc?: string;
  initialMessages?: ChatMessage[];
};

type Props = {
  action: (prevState: ArtifactState, formData: FormData) => Promise<ArtifactState>;
  entryId?: string | null;
  docType?: "obituary" | "eulogy";
} & InitialProps;

export const ArtifactWorkspace = ({ action, initialDoc = "", initialMessages = [], entryId = null, docType = "obituary" }: Props) => {
  const initialState: ArtifactState = useMemo(
    () => ({ doc: initialDoc, messages: initialMessages }),
    [initialDoc, initialMessages]
  );
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [doc, setDoc] = useState<string>(initialDoc ?? "");
  const [prompt, setPrompt] = useState<string>("");
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const { isStreaming, assistantText, docText, error: streamError, start, stop } =
    useArtifactStream();

  // When server responds, sync doc
  useEffect(() => {
    if (state?.doc !== undefined) {
      setDoc(state.doc);
    }
  }, [state?.doc]);

  // While streaming, mirror streamed doc
  useEffect(() => {
    if (isStreaming) {
      setDoc(docText);
    }
  }, [docText, isStreaming]);
  const displayMessages = useMemo<ChatMessage[]>(() => {
    const base: ChatMessage[] = [...(state?.messages ?? []), ...localMessages];
    // Show ephemeral streaming messages without duplicating after completion
    if (isStreaming && lastPrompt) {
      base.push({ role: "user", content: lastPrompt });
    }
    if (isStreaming && assistantText.length > 0) {
      base.push({ role: "assistant", content: assistantText });
    }
    return base;
  }, [state?.messages, localMessages, isStreaming, assistantText, lastPrompt]);
  const hasMessages = useMemo(() => displayMessages.length > 0, [displayMessages]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="min-h-[60vh]">
        <CardHeader>
          <CardTitle>Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="min-h-[36vh] rounded-md border p-3 bg-card" aria-live="polite">
              {hasMessages ? (
                <ul className="space-y-3">
                  {displayMessages.map((m: ChatMessage, idx: number) => (
                    <li key={idx} className="text-sm">
                      <div className="mb-1 opacity-70">{m.role === "user" ? "You" : "Assistant"}</div>
                      <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="opacity-70 text-sm">No messages yet. Submit a prompt to generate a document.</div>
              )}
              {isStreaming && (
                <div className="mt-3 text-xs opacity-70">Streaming...</div>
              )}
            </div>

            <Separator />

            <form action={formAction} className="flex flex-col gap-3">
              {/* keep server action aware of current doc */}
              <input type="hidden" name="doc" value={doc} />
              {/* per-entry routing for persistence */}
              <input type="hidden" name="entryId" value={entryId ?? ""} />
              <input type="hidden" name="docType" value={docType} />

              <Input
                name="prompt"
                placeholder="Describe the document you want (e.g., 'One-page project brief for...')"
                required
                disabled={isPending || isStreaming}
                value={prompt}
                onChange={(e) => setPrompt(e.currentTarget.value)}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  disabled={isPending || isStreaming}
                  onClick={async () => {
                    const p = prompt.trim();
                    if (!p) return;
                    setLastPrompt(p);
                    await start({
                      prompt: p,
                      doc,
                      messages: ([...(state?.messages ?? []), ...localMessages]) as ChatMessage[],
                      entryId,
                      docType,
                      onDone: (final) => {
                        setDoc(final.document);
                        setLocalMessages((prev) => [
                          ...prev,
                          { role: "user", content: p },
                          { role: "assistant", content: final.message },
                        ]);
                      },
                    });
                    setPrompt("");
                    setLastPrompt("");
                  }}
                >
                  {isStreaming ? "Streaming..." : hasMessages ? "Stream Update" : "Stream Generate"}
                </Button>
                {isStreaming && (
                  <Button type="button" variant="destructive" onClick={stop}>
                    Stop
                  </Button>
                )}
                <Button type="submit" disabled={isPending || isStreaming} variant="secondary">
                  Non-stream Update
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setDoc("");
                    // reset client view; action state resets on next submit
                    toast.success("Cleared local document.");
                  }}
                >
                  Clear Doc
                </Button>
              </div>
            </form>

            {state?.error && (
              <div className="text-red-600 text-sm" role="status">
                {state.error}
              </div>
            )}
            {streamError && (
              <div className="text-red-600 text-sm" role="status">
                {streamError}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-[60vh]">
        <CardHeader>
          <CardTitle>Document</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Textarea
              value={doc}
              onChange={(e) => setDoc(e.currentTarget.value)}
              className="h-[48vh]"
              disabled={isStreaming}
              placeholder="The AI-generated document will appear here. You can edit it manually before the next update."
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(doc);
                  toast.success("Copied to clipboard");
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
