"use server";

import { z } from "zod";
import { env } from "@/lib/env/server";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getSessionUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import {
  ArtifactDocumentTable,
  ArtifactMessageTable,
} from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ArtifactState = {
  doc: string;
  messages: ChatMessage[];
  error?: string;
  success?: string;
};

const inputSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(4000),
  doc: z.string().default(""),
  entryId: z.string().uuid().nullable().optional(),
  docType: z.enum(["obituary", "eulogy"]).optional().default("obituary"),
});

export async function submitArtifactMessage(
  prevState: ArtifactState,
  formData: FormData
): Promise<ArtifactState> {
  // Require auth
  const user = await getSessionUser();
  if (!(user as any)?.id) {
    return { ...prevState, error: "Unauthorized" };
  }

  let parsed: z.infer<typeof inputSchema>;
  try {
    parsed = inputSchema.parse({
      prompt: String(formData.get("prompt") ?? ""),
      doc: String(formData.get("doc") ?? ""),
      entryId: ((): string | null => {
        const v = formData.get("entryId");
        if (v === null) return null;
        const s = String(v);
        return s.length ? s : null;
      })(),
      docType: ((): "obituary" | "eulogy" => {
        const v = String(formData.get("docType") ?? "obituary");
        return v === "eulogy" ? "eulogy" : "obituary";
      })(),
    });
  } catch (e) {
    return { ...prevState, error: "Invalid input." };
  }

  // If user manually edited the document, prefer the form value over prev state
  const currentDoc = parsed.doc ?? prevState.doc ?? "";

  const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

  const system =
    "You are a helpful assistant that maintains a single user document. " +
    "You will receive the current document and a user request. Update the document accordingly and respond concisely. " +
    "Return a JSON object with exactly two top-level string fields: \"message\" (assistant reply) and \"document\" (the full updated document). " +
    "Do not include markdown code fences or any extra text outside of the JSON.";

  const history = prevState.messages.map((m) => ({ role: m.role, content: m.content }));

  const userMessage = `User request:\n${parsed.prompt}\n\nCurrent document:\n${currentDoc}`;

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        ...history,
        { role: "user", content: userMessage },
      ],
      schema: z.object({
        message: z.string(),
        document: z.string(),
      }),
    });

    // Persist state: ensure user doc exists, insert messages, update content
    let docRow = await db.query.ArtifactDocumentTable.findFirst({
      where: and(
        eq(ArtifactDocumentTable.userId, (user as any).id),
        (parsed.entryId ?? null) === null
          ? isNull(ArtifactDocumentTable.entryId)
          : eq(ArtifactDocumentTable.entryId, parsed.entryId as string),
        eq(ArtifactDocumentTable.docType, parsed.docType ?? "obituary")
      ),
    });
    if (!docRow) {
      const inserted = await db
        .insert(ArtifactDocumentTable)
        .values({
          id: crypto.randomUUID(),
          userId: (user as any).id,
          entryId: parsed.entryId ?? null,
          docType: parsed.docType ?? "obituary",
          title: null,
          content: currentDoc,
        })
        .returning();
      docRow = inserted[0];
    }
    await db.insert(ArtifactMessageTable).values([
      { artifactId: docRow.id, role: "user", content: parsed.prompt },
      { artifactId: docRow.id, role: "assistant", content: object.message },
    ]);
    await db
      .update(ArtifactDocumentTable)
      .set({ content: object.document?.length ? object.document : currentDoc, updatedAt: new Date() })
      .where(eq(ArtifactDocumentTable.id, docRow.id));

    const nextMessages: ChatMessage[] = [
      ...prevState.messages,
      { role: "user", content: parsed.prompt },
      { role: "assistant", content: object.message },
    ];

    return {
      doc: object.document?.length ? object.document : currentDoc,
      messages: nextMessages,
      success: "Updated",
    };
  } catch (err) {
    return { ...prevState, error: "AI request failed." };
  }
}
