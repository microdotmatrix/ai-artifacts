import { relations } from "drizzle-orm";
import { date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { UserTable } from "./user";

export const EntryTable = pgTable(
  "entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    dateOfBirth: date("date_of_birth", { mode: "date" }),
    dateOfDeath: date("date_of_death", { mode: "date" }),
    placeOfBirth: text("place_of_birth"),
    placeOfDeath: text("place_of_death"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => ({
    byUserIdx: index("entries_user_idx").on(t.userId),
    updatedIdx: index("entries_updated_idx").on(t.updatedAt),
  })
);

export const EntryRelations = relations(EntryTable, ({ one }) => ({
  user: one(UserTable, {
    fields: [EntryTable.userId],
    references: [UserTable.id],
  }),
}));

export type Entry = typeof EntryTable.$inferSelect;
