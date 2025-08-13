import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { UserUploadTable } from "./uploads";

export const UserTable = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role"),
  banned: boolean("banned"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const UserEntriesTable = pgTable("user_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  birthDate: text("birth_date").notNull(),
  deathDate: text("death_date").notNull(),
  birthLocation: text("birth_location"),
  image: text("image").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const UserRelations = relations(UserTable, ({ one }) => ({
  upload: one(UserUploadTable),
  entries: one(UserEntriesTable),
}));

export type User = typeof UserTable.$inferSelect;
export type UserEntry = typeof UserEntriesTable.$inferSelect;
