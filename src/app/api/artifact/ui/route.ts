import { NextRequest } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/server";
import { getDocumentForEntry } from "@/lib/db/queries";
import { createDocument } from "@/lib/ai/tools/create-document";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";

const bodySchema = z.object({
  mode: z.enum(["create", "update", "suggestions"]),
  // create
  title: z.string().optional(),
  context: z.string().optional(),
  // update
  description: z.string().optional(),
  // entry association
  entryId: z.string().uuid().nullable().optional(),
  docType: z.enum(["obituary", "eulogy"]).optional().default("obituary"),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  const userId = (user as any)?.id ?? null;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  let parsed: z.infer<typeof bodySchema>;
  try {
    const json = await req.json();
    parsed = bodySchema.parse(json);
  } catch {
    return new Response("Invalid request", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      (async () => {
        // Resolve the user's current document for the given entry/docType if provided
        const existingDoc = await getDocumentForEntry({
          userId,
          entryId: parsed.entryId ?? null,
          docType: parsed.docType ?? "obituary",
        });

        // Build a lightweight UIMessageStreamWriter adapter
        const dataStream = { write } as unknown as import("ai").UIMessageStreamWriter<any>;

        try {
          const toolOptions = { toolCallId: "manual", messages: [] } as any;

          if (parsed.mode === "create") {
            const tool = createDocument({ userId, dataStream: dataStream as any });
            await tool.execute!(
              {
                title: parsed.title ?? "Document",
                kind: "text",
                context: parsed.context,
                entryId: parsed.entryId ?? null,
                docType: parsed.docType ?? "obituary",
              },
              toolOptions
            );
          } else if (parsed.mode === "update") {
            const tool = updateDocument({ userId, dataStream: dataStream as any });
            // If no doc yet, fall back to creation using description as context
            if (!existingDoc) {
              const createTool = createDocument({ userId, dataStream: dataStream as any });
              await createTool.execute!(
                {
                  title: parsed.title ?? "Document",
                  kind: "text",
                  context: parsed.description ?? parsed.context ?? "",
                  entryId: parsed.entryId ?? null,
                  docType: parsed.docType ?? "obituary",
                },
                toolOptions
              );
            } else {
              await tool.execute!(
                { id: existingDoc.id, description: parsed.description ?? "" },
                toolOptions
              );
            }
          } else if (parsed.mode === "suggestions") {
            if (!existingDoc) {
              write({ type: "data-finish", data: null, transient: true });
              return;
            }
            const tool = requestSuggestions({ userId, dataStream: dataStream as any });
            await tool.execute!({ documentId: existingDoc.id }, toolOptions);
          }
        } catch (err) {
          // Optionally surface a structured error for the client
          write({ type: "error", errorText: "Stream failed" });
        } finally {
          // Ensure the client knows the stream finished if the tool didn't emit it.
          write({ type: "data-finish", data: null, transient: true });
          controller.close();
        }
      })().catch((e) => controller.error(e));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
