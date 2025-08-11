"use server";

import { z } from "zod";
import { env } from "@/lib/env/server";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

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
});

export async function submitArtifactMessage(
  prevState: ArtifactState,
  formData: FormData
): Promise<ArtifactState> {
  let parsed: z.infer<typeof inputSchema>;
  try {
    parsed = inputSchema.parse({
      prompt: String(formData.get("prompt") ?? ""),
      doc: String(formData.get("doc") ?? ""),
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
