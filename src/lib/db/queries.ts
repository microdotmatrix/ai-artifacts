import { and, eq, isNull, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  ArtifactDocumentTable,
  SuggestionTable,
  EntryTable,
  type ArtifactDocument,
  type Suggestion,
  type Entry,
} from "@/lib/db/schema";

// Upsert the per-user artifact document. One document per user.
// If a document exists for the user, update content/title; otherwise insert a new one with the provided id.
export async function saveDocument(args: {
  id: string;
  title: string | null;
  kind?: string; // unused here, reserved
  content: string;
  userId: string;
  entryId?: string | null;
  docType?: "obituary" | "eulogy";
}): Promise<ArtifactDocument> {
  const { id, title, content, userId, entryId = null, docType = "obituary" } = args;

  // Prefer lookup by explicit id first
  const existingById = await db.query.ArtifactDocumentTable.findFirst({
    where: eq(ArtifactDocumentTable.id, id),
  });
  if (existingById) {
    const [updated] = await db
      .update(ArtifactDocumentTable)
      .set({ title, content, updatedAt: new Date() })
      .where(eq(ArtifactDocumentTable.id, id))
      .returning();
    return updated;
  }

  // Otherwise, upsert by (userId, entryId, docType)
  const existing = await db.query.ArtifactDocumentTable.findFirst({
    where: and(
      eq(ArtifactDocumentTable.userId, userId),
      entryId === null
        ? isNull(ArtifactDocumentTable.entryId)
        : eq(ArtifactDocumentTable.entryId, entryId),
      eq(ArtifactDocumentTable.docType, docType)
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(ArtifactDocumentTable)
      .set({ title, content, updatedAt: new Date() })
      .where(eq(ArtifactDocumentTable.id, existing.id))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(ArtifactDocumentTable)
    .values({ id, userId, entryId, docType, title, content })
    .returning();
  return inserted;
}

export async function getDocumentById(args: {
  id: string;
}): Promise<ArtifactDocument | null> {
  const { id } = args;
  const doc = await db.query.ArtifactDocumentTable.findFirst({
    where: eq(ArtifactDocumentTable.id, id),
  });
  return doc ?? null;
}

export async function saveSuggestions(args: {
  suggestions: Array<Suggestion>;
}): Promise<void> {
  const { suggestions } = args;
  if (!suggestions.length) return;

  // Insert suggestions in bulk
  await db.insert(SuggestionTable).values(suggestions);
}

// Entries
export async function createEntry(args: {
  userId: string;
  name: string;
  dateOfBirth?: Date | null;
  dateOfDeath?: Date | null;
  placeOfBirth?: string | null;
  placeOfDeath?: string | null;
}): Promise<Entry> {
  const [row] = await db
    .insert(EntryTable)
    .values({
      userId: args.userId,
      name: args.name,
      dateOfBirth: args.dateOfBirth ?? null,
      dateOfDeath: args.dateOfDeath ?? null,
      placeOfBirth: args.placeOfBirth ?? null,
      placeOfDeath: args.placeOfDeath ?? null,
    })
    .returning();
  return row;
}

export async function listEntriesByUser(args: { userId: string }): Promise<Entry[]> {
  const rows = await db
    .select()
    .from(EntryTable)
    .where(and(eq(EntryTable.userId, args.userId), isNull(EntryTable.deletedAt)))
    .orderBy(desc(EntryTable.updatedAt));
  return rows;
}

export async function getEntryById(args: { userId: string; id: string }): Promise<Entry | null> {
  const row = await db.query.EntryTable.findFirst({
    where: and(eq(EntryTable.id, args.id), eq(EntryTable.userId, args.userId), isNull(EntryTable.deletedAt)),
  });
  return row ?? null;
}

export async function updateEntry(args: {
  userId: string;
  id: string;
  name?: string;
  dateOfBirth?: Date | null;
  dateOfDeath?: Date | null;
  placeOfBirth?: string | null;
  placeOfDeath?: string | null;
}): Promise<Entry | null> {
  const [row] = await db
    .update(EntryTable)
    .set({
      name: args.name,
      dateOfBirth: args.dateOfBirth,
      dateOfDeath: args.dateOfDeath,
      placeOfBirth: args.placeOfBirth,
      placeOfDeath: args.placeOfDeath,
      updatedAt: new Date(),
    })
    .where(and(eq(EntryTable.id, args.id), eq(EntryTable.userId, args.userId), isNull(EntryTable.deletedAt)))
    .returning();
  return row ?? null;
}

export async function softDeleteEntry(args: { userId: string; id: string }): Promise<void> {
  await db
    .update(EntryTable)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(EntryTable.id, args.id), eq(EntryTable.userId, args.userId), isNull(EntryTable.deletedAt)));
}

export async function getDocumentForEntry(args: {
  userId: string;
  entryId: string | null;
  docType?: "obituary" | "eulogy";
}): Promise<ArtifactDocument | null> {
  const { userId, entryId, docType = "obituary" } = args;
  const row = await db.query.ArtifactDocumentTable.findFirst({
    where: and(
      eq(ArtifactDocumentTable.userId, userId),
      entryId === null ? isNull(ArtifactDocumentTable.entryId) : eq(ArtifactDocumentTable.entryId, entryId),
      eq(ArtifactDocumentTable.docType, docType),
      isNull(ArtifactDocumentTable.deletedAt)
    ),
  });
  return row ?? null;
}
