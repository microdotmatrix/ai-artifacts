"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/server";
import {
  createEntry as createEntryQuery,
  updateEntry as updateEntryQuery,
  softDeleteEntry as softDeleteEntryQuery,
  getEntryById,
} from "@/lib/db/queries";

const dateStrToDate = (v: unknown): Date | null => {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  // Ensure valid YYYY-MM-DD
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  dateOfBirth: z.string().optional(),
  dateOfDeath: z.string().optional(),
  placeOfBirth: z.string().optional(),
  placeOfDeath: z.string().optional(),
});

export async function createEntryAction(formData: FormData) {
  const user = await getSessionUser();
  const userId = (user as any)?.id;
  if (!userId) return { ok: false, error: "Unauthorized" } as const;

  let parsed: z.infer<typeof createSchema>;
  try {
    parsed = createSchema.parse({
      name: String(formData.get("name") ?? ""),
      dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
      dateOfDeath: String(formData.get("dateOfDeath") ?? ""),
      placeOfBirth: String(formData.get("placeOfBirth") ?? ""),
      placeOfDeath: String(formData.get("placeOfDeath") ?? ""),
    });
  } catch (e) {
    return { ok: false, error: "Invalid input" } as const;
  }

  await createEntryQuery({
    userId,
    name: parsed.name,
    dateOfBirth: dateStrToDate(parsed.dateOfBirth),
    dateOfDeath: dateStrToDate(parsed.dateOfDeath),
    placeOfBirth: parsed.placeOfBirth?.trim() || null,
    placeOfDeath: parsed.placeOfDeath?.trim() || null,
  });

  revalidatePath("/entries");
  return { ok: true } as const;
}

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  dateOfBirth: z.string().optional(),
  dateOfDeath: z.string().optional(),
  placeOfBirth: z.string().optional(),
  placeOfDeath: z.string().optional(),
});

export async function updateEntryAction(formData: FormData) {
  const user = await getSessionUser();
  const userId = (user as any)?.id;
  if (!userId) return { ok: false, error: "Unauthorized" } as const;

  let parsed: z.infer<typeof updateSchema>;
  try {
    parsed = updateSchema.parse({
      id: String(formData.get("id") ?? ""),
      name: ((): string | undefined => {
        const v = formData.get("name");
        if (v === null) return undefined;
        return String(v);
      })(),
      dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
      dateOfDeath: String(formData.get("dateOfDeath") ?? ""),
      placeOfBirth: String(formData.get("placeOfBirth") ?? ""),
      placeOfDeath: String(formData.get("placeOfDeath") ?? ""),
    });
  } catch (e) {
    return { ok: false, error: "Invalid input" } as const;
  }

  // Ensure the entry belongs to the user
  const existing = await getEntryById({ userId, id: parsed.id });
  if (!existing) return { ok: false, error: "Not found" } as const;

  await updateEntryQuery({
    userId,
    id: parsed.id,
    name: parsed.name?.trim() || existing.name,
    dateOfBirth: dateStrToDate(parsed.dateOfBirth ?? "") ?? existing.dateOfBirth ?? null,
    dateOfDeath: dateStrToDate(parsed.dateOfDeath ?? "") ?? existing.dateOfDeath ?? null,
    placeOfBirth: (parsed.placeOfBirth?.trim() || existing.placeOfBirth || null) as string | null,
    placeOfDeath: (parsed.placeOfDeath?.trim() || existing.placeOfDeath || null) as string | null,
  });

  revalidatePath("/entries");
  return { ok: true } as const;
}

const deleteSchema = z.object({ id: z.string().uuid() });

export async function deleteEntryAction(formData: FormData) {
  const user = await getSessionUser();
  const userId = (user as any)?.id;
  if (!userId) return { ok: false, error: "Unauthorized" } as const;

  let parsed: z.infer<typeof deleteSchema>;
  try {
    parsed = deleteSchema.parse({ id: String(formData.get("id") ?? "") });
  } catch (e) {
    return { ok: false, error: "Invalid input" } as const;
  }

  // Ensure own entry
  const existing = await getEntryById({ userId, id: parsed.id });
  if (!existing) return { ok: false, error: "Not found" } as const;

  await softDeleteEntryQuery({ userId, id: parsed.id });
  revalidatePath("/entries");
  return { ok: true } as const;
}
