import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { ArtifactDocumentTable } from "./artifact";
import { UserTable } from "./user";

export const SuggestionTable = pgTable("suggestion", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").notNull(),
  documentCreatedAt: timestamp("document_created_at").notNull(),
  originalText: text("original_text").notNull(),
  suggestedText: text("suggested_text").notNull(),
  description: text("description"),
  isResolved: boolean("is_resolved").notNull().default(false),
  userId: text("user_id")
    .notNull()
    .references(() => UserTable.id),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const SuggestionRelations = relations(SuggestionTable, ({ one }) => ({
  user: one(UserTable, {
    fields: [SuggestionTable.userId],
    references: [UserTable.id],
  }),
  document: one(ArtifactDocumentTable, {
    fields: [SuggestionTable.documentId, SuggestionTable.documentCreatedAt],
    references: [ArtifactDocumentTable.id, ArtifactDocumentTable.createdAt],
  }),
}));

export type Suggestion = typeof SuggestionTable.$inferSelect;
