import { textDocumentHandler } from "@/lib/artifacts/server";
import type { ArtifactKind, ChatMessage } from "@/lib/ai/types";
import { saveDocument } from "@/lib/db/queries";
import type { ArtifactDocument } from "@/lib/db/schema";
import type { UIMessageStreamWriter } from "ai";

export interface SaveDocumentProps {
  id: string;
  title: string | null;
  kind: ArtifactKind;
  content: string;
  userId: string;
  entryId?: string | null;
  docType?: "obituary" | "eulogy";
}

export interface CreateDocumentCallbackProps {
  id: string;
  title: string;
  context?: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  userId: string | null;
  entryId?: string | null;
  docType?: "obituary" | "eulogy";
}

export interface UpdateDocumentCallbackProps {
  document: ArtifactDocument;
  description: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  userId: string | null;
}

export interface DocumentHandler<T = ArtifactKind> {
  kind: T;
  onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<void>;
  onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<void>;
}

export function createDocumentHandler<T extends ArtifactKind>(config: {
  kind: T;
  onCreateDocument: (params: CreateDocumentCallbackProps) => Promise<string>;
  onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>;
}): DocumentHandler<T> {
  return {
    kind: config.kind,
    onCreateDocument: async (args: CreateDocumentCallbackProps) => {
      const draftContent = await config.onCreateDocument({
        id: args.id,
        title: args.title,
        context: args.context,
        dataStream: args.dataStream,
        userId: args.userId,
        entryId: args.entryId,
        docType: args.docType,
      });

      if (args.userId) {
        await saveDocument({
          id: args.id,
          title: args.title,
          content: draftContent,
          kind: config.kind,
          userId: args.userId,
          entryId: args.entryId ?? null,
          docType: args.docType ?? "obituary",
        });
      }

      return;
    },
    onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
      const draftContent = await config.onUpdateDocument({
        document: args.document,
        description: args.description,
        dataStream: args.dataStream,
        userId: args.userId,
      });

      if (args.userId) {
        await saveDocument({
          id: args.document.id,
          title: args.document.title,
          content: draftContent,
          kind: config.kind,
          userId: args.userId,
          entryId: args.document.entryId ?? null,
          docType: (args.document as any).docType ?? "obituary",
        });
      }

      return;
    },
  };
}

/*
 * Use this array to define the document handlers for each artifact kind.
 */
export const documentHandlersByArtifactKind: Array<DocumentHandler> = [
  textDocumentHandler,
];

export const artifactKinds = ["text"] as const;
