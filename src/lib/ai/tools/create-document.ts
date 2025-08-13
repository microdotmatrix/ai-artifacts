import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from "@/lib/ai/artifacts";
import type { ChatMessage } from "@/lib/ai/types";
import { generateUUID } from "@/lib/utils";
import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";

interface CreateDocumentProps {
  userId: string | null;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

export const createDocument = ({ userId, dataStream }: CreateDocumentProps) =>
  tool({
    description:
      "Create a document for a writing or content creation activities. This tool will call other functions that will generate the contents of the document based on the title, kind, and optional context.",
    inputSchema: z.object({
      title: z.string().describe("The title/name of the document"),
      kind: z.enum(artifactKinds),
      context: z
        .string()
        .optional()
        .describe(
          "Optional detailed context or prompt for generating the document content. Use this for complex requests like obituaries with specific details."
        ),
      entryId: z.string().uuid().nullable().optional(),
      docType: z.enum(["obituary", "eulogy"]).optional().default("obituary"),
    }),
    execute: async ({ title, kind, context, entryId, docType }) => {
      const id = generateUUID();

      dataStream.write({
        type: "data-kind",
        data: kind,
        transient: true,
      });

      dataStream.write({
        type: "data-id",
        data: id,
        transient: true,
      });

      dataStream.write({
        type: "data-title",
        data: title,
        transient: true,
      });

      dataStream.write({
        type: "data-clear",
        data: null,
        transient: true,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      await documentHandler.onCreateDocument({
        id,
        title,
        context,
        dataStream,
        userId,
        entryId: entryId ?? null,
        docType: docType ?? "obituary",
      });

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title,
        kind,
        content: "A document was created and is now visible to the user.",
      };
    },
  });
