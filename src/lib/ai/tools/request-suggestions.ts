import type { ChatMessage } from "@/lib/ai/types";
import { getDocumentById, saveSuggestions } from "@/lib/db/queries";
import type { Suggestion } from "@/lib/db/schema";
import { generateUUID } from "@/lib/utils";
import { streamObject, tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import { providers } from "../providers";

interface RequestSuggestionsProps {
  userId: string | null;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

export const requestSuggestions = ({ userId, dataStream }: RequestSuggestionsProps) =>
  tool({
    description: "Request suggestions for a document",
    inputSchema: z.object({
      documentId: z
        .string()
        .describe("The ID of the document to request edits"),
    }),
    execute: async ({ documentId }) => {
      const document = await getDocumentById({ id: documentId });

      if (!document || !document.content) {
        return {
          error: "Document not found",
        };
      }

      const suggestions: Array<
        Omit<Suggestion, "userId" | "createdAt" | "documentCreatedAt">
      > = [];

      const { elementStream } = streamObject({
        model: providers.languageModel("openai-artifact"),
        system:
          "You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.",
        prompt: document.content,
        output: "array",
        schema: z.object({
          originalText: z.string().describe("The original text"),
          suggestedText: z.string().describe("The suggested text"),
          description: z.string().describe("The description of the suggestion"),
        }),
      });

      for await (const element of elementStream) {
        // @ts-ignore todo: fix type
        const suggestion: Suggestion = {
          originalText: element.originalText,
          suggestedText: element.suggestedText,
          description: element.description,
          id: generateUUID(),
          documentId: documentId,
          isResolved: false,
        };

        dataStream.write({
          type: "data-suggestion",
          data: suggestion,
          transient: true,
        });

        suggestions.push(suggestion);
      }

      if (userId) {
        await saveSuggestions({
          suggestions: suggestions.map((suggestion) => ({
            ...suggestion,
            userId,
            createdAt: new Date(),
            documentCreatedAt: document.createdAt,
          })),
        });
      }

      return {
        id: documentId,
        title: document.title,
        kind: "text" as const,
        message: "Suggestions have been added to the document",
      };
    },
  });
