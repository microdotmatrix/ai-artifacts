import {
  boolean,
  integer,
  json,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm";
import { UserTable } from "./user";

export const UserUploadTable = pgTable("user_upload", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  storageProvider: text("storage_provider").notNull(), // e.g., 'S3', 'Cloudinary', etc.
  storageKey: text("storage_key").notNull(), // The key/path in the storage service
  metadata: json("metadata"), // For storing additional metadata like dimensions, EXIF data, etc.
  isPublic: boolean("is_public")
    .$defaultFn(() => false)
    .notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const UserUploadRelations = relations(UserUploadTable, ({ one }) => ({
  user: one(UserTable, {
    fields: [UserUploadTable.userId],
    references: [UserTable.id],
  }),
}));

export type UserUpload = typeof UserUploadTable.$inferSelect;
