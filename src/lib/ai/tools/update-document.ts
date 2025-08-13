import { documentHandlersByArtifactKind } from "@/lib/ai/artifacts";
import type { ChatMessage } from "@/lib/ai/types";
import { getDocumentById } from "@/lib/db/queries";
import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";

interface UpdateDocumentProps {
  userId: string | null;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

export const updateDocument = ({ userId, dataStream }: UpdateDocumentProps) =>
  tool({
    description: "Update a document with the given description.",
    inputSchema: z.object({
      id: z.string().describe("The ID of the document to update"),
      description: z
        .string()
        .describe("The description of changes that need to be made"),
    }),
    execute: async ({ id, description }) => {
      const document = await getDocumentById({ id });

      if (!document) {
        return {
          error: "Document not found",
        };
      }

      dataStream.write({
        type: "data-clear",
        data: null,
        transient: true,
      });

      // Currently only the 'text' artifact kind is supported; artifact documents
      // do not persist a kind column. Default to the text handler.
      const documentHandler =
        documentHandlersByArtifactKind.find(
          (h) => h.kind === "text"
        ) ?? documentHandlersByArtifactKind[0];

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: text`);
      }

      await documentHandler.onUpdateDocument({
        document,
        description,
        dataStream,
        userId,
      });

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title: document.title,
        kind: "text" as const,
        content: "The document has been updated successfully.",
      };
    },
  });
