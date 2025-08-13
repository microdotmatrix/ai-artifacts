import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { UserTable } from "./user";
import { EntryTable } from "./entries";

export const artifactDocumentType = pgEnum("artifact_document_type", [
  "obituary",
  "eulogy",
]);

export const ArtifactDocumentTable = pgTable(
  "artifact_document",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id").references(() => EntryTable.id, {
      onDelete: "cascade",
    }),
    docType: artifactDocumentType("doc_type").default("obituary"),
    title: text("title"),
    content: text("content").notNull().default(""),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    shareToken: text("share_token"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => ({
    // Ensure one document per (user, entry, type)
    userEntryTypeUnique: uniqueIndex("artifact_document_user_entry_type_unique").on(
      t.userId,
      t.entryId,
      t.docType
    ),
    byUserIdx: index("artifact_document_user_idx").on(t.userId),
    byEntryIdx: index("artifact_document_entry_idx").on(t.entryId),
    updatedIdx: index("artifact_document_updated_idx").on(t.updatedAt),
    shareTokenUnique: uniqueIndex("artifact_document_share_token_unique").on(
      t.shareToken
    ),
  })
);

export const artifactMessageRole = pgEnum("artifact_message_role", [
  "user",
  "assistant",
]);

export const ArtifactMessageTable = pgTable(
  "artifact_message",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    artifactId: uuid("artifact_id")
      .notNull()
      .references(() => ArtifactDocumentTable.id, { onDelete: "cascade" }),
    role: artifactMessageRole("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => ({
    byArtifactIdx: index("artifact_message_artifact_idx").on(t.artifactId),
    createdIdx: index("artifact_message_created_idx").on(t.createdAt),
  })
);

export const ArtifactDocumentRelations = relations(
  ArtifactDocumentTable,
  ({ many, one }) => ({
    messages: many(ArtifactMessageTable),
    user: one(UserTable, {
      fields: [ArtifactDocumentTable.userId],
      references: [UserTable.id],
    }),
    entry: one(EntryTable, {
      fields: [ArtifactDocumentTable.entryId],
      references: [EntryTable.id],
    }),
  })
);

export const ArtifactMessageRelations = relations(
  ArtifactMessageTable,
  ({ one }) => ({
    artifact: one(ArtifactDocumentTable, {
      fields: [ArtifactMessageTable.artifactId],
      references: [ArtifactDocumentTable.id],
    }),
  })
);

export type ArtifactDocument = typeof ArtifactDocumentTable.$inferSelect;
export type ArtifactMessage = typeof ArtifactMessageTable.$inferSelect;
