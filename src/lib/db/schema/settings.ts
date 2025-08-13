import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { UserTable } from "./user";

export const UserSettingsTable = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  theme: text("theme").default("system").notNull(),
  notifications: boolean("notifications").default(true).notNull(),
  cookies: boolean("cookies").default(false).notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const UserSettingsRelations = relations(
  UserSettingsTable,
  ({ one }) => ({
    user: one(UserTable, {
      fields: [UserSettingsTable.userId],
      references: [UserTable.id],
    }),
  })
);

export type UserSettings = typeof UserSettingsTable.$inferSelect;
