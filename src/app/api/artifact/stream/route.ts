import { NextRequest } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env/server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { getSessionUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import {
  ArtifactDocumentTable,
  ArtifactMessageTable,
} from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

const requestSchema = z.object({
  prompt: z.string().min(1),
  doc: z.string().default(""),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .default([]),
  entryId: z.string().uuid().nullable().optional(),
  docType: z.enum(["obituary", "eulogy"]).optional().default("obituary"),
});

export async function POST(req: NextRequest) {
  // Require auth
  const user = await getSessionUser();
  if (!(user as any)?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = await req.json();
  const { prompt, doc, messages, entryId, docType } = requestSchema.parse(body);

  const system =
    "You are a helpful assistant that maintains a single user document. " +
    "You will receive the current document and a user request. Update the document accordingly and respond concisely. " +
    "Return a JSON object with exactly two top-level string fields: \"message\" (assistant reply) and \"document\" (the full updated document). " +
    "Do not include markdown code fences or any extra text outside of the JSON.";

  const userMessage = `User request:\n${prompt}\n\nCurrent document:\n${doc}`;

  const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

  const result = await streamObject({
    model: openai("gpt-4o-mini"),
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      ...messages,
      { role: "user", content: userMessage },
    ],
    schema: z.object({ message: z.string(), document: z.string() }),
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      (async () => {
        controller.enqueue(
          encoder.encode(`event: start\ndata: {}\n\n`)
        );

        for await (const partial of result.partialObjectStream) {
          controller.enqueue(
            encoder.encode(
              `event: object\ndata: ${JSON.stringify(partial)}\n\n`
            )
          );
        }
 
        const finalObject = await result.object;
        // Persist final result for the authenticated user
        try {
          let docRow = await db.query.ArtifactDocumentTable.findFirst({
            where: and(
              eq(ArtifactDocumentTable.userId, (user as any).id),
              (entryId ?? null) === null
                ? isNull(ArtifactDocumentTable.entryId)
                : eq(ArtifactDocumentTable.entryId, entryId as string),
              eq(ArtifactDocumentTable.docType, docType ?? "obituary")
            ),
          });
          if (!docRow) {
            const inserted = await db
              .insert(ArtifactDocumentTable)
              .values({
                userId: (user as any).id,
                entryId: entryId ?? null,
                docType: docType ?? "obituary",
                title: null,
                content: doc ?? "",
              })
              .returning();
            docRow = inserted[0];
          }
          await db.insert(ArtifactMessageTable).values([
            { artifactId: docRow.id, role: "user", content: prompt },
            { artifactId: docRow.id, role: "assistant", content: finalObject.message },
          ]);
          await db
            .update(ArtifactDocumentTable)
            .set({ content: finalObject.document, updatedAt: new Date() })
            .where(eq(ArtifactDocumentTable.id, docRow.id));
        } catch (e) {
          // Swallow persistence errors to not break stream delivery
        }
        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify(finalObject)}\n\n`
          )
        );
        controller.close();
      })().catch((err) => {
        controller.error(err);
      });
    },
    cancel() {
      // nothing to cancel here; AI SDK handles aborts by throwing
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
