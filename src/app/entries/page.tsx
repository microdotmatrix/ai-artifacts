import Link from "next/link";
import { isAuthorized, getSessionUser } from "@/lib/auth/server";
import { listEntriesByUser } from "@/lib/db/queries";
import { createEntryAction, updateEntryAction, deleteEntryAction } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata = {
  title: "Entries",
  description: "Manage deceased person entries and open Artifact flows.",
};

export default async function EntriesPage() {
  await isAuthorized();
  const user = await getSessionUser();
  if (!user || (user as any).error) return null;

  const entries = await listEntriesByUser({ userId: (user as any).id });

  const formatDateInput = (v?: string | Date | null): string => {
    if (!v) return "";
    if (typeof v === "string") return v;
    try {
      return v.toISOString().slice(0, 10);
    } catch {
      return "";
    }
  };

  return (
    <main>
      <div className="container py-8">
        <h1 className="text-center">Entries</h1>
        <p className="text-center mt-2 opacity-80">Create and manage entries. Open the Artifact workspace for each entry and document type.</p>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Create Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                action={async (fd) => {
                  'use server';
                  await createEntryAction(fd);
                }}
                className="grid gap-3"
              >
                <Input name="name" placeholder="Full name" required />
                <div className="grid grid-cols-2 gap-2">
                  <Input name="dateOfBirth" type="date" placeholder="Date of birth" />
                  <Input name="dateOfDeath" type="date" placeholder="Date of death" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input name="placeOfBirth" placeholder="Place of birth" />
                  <Input name="placeOfDeath" placeholder="Place of death" />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <div className="opacity-70 text-sm">No entries yet.</div>
              ) : (
                <ul className="space-y-4">
                  {entries.map((e) => (
                    <li key={e.id} className="rounded-md border p-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">{e.name}</div>
                          <div className="flex items-center gap-2">
                            <Link href={`/artifact?entryId=${e.id}&docType=obituary`} className="underline text-sm">
                              Open Obituary
                            </Link>
                            <span className="opacity-40">|</span>
                            <Link href={`/artifact?entryId=${e.id}&docType=eulogy`} className="underline text-sm">
                              Open Eulogy
                            </Link>
                          </div>
                        </div>

                        <form
                          action={async (fd) => {
                            'use server';
                            await updateEntryAction(fd);
                          }}
                          className="grid gap-2 md:grid-cols-2"
                        >
                          <input type="hidden" name="id" value={e.id} />
                          <Input name="name" defaultValue={e.name ?? ""} placeholder="Full name" />
                          <Input name="dateOfBirth" type="date" defaultValue={formatDateInput(e.dateOfBirth)} placeholder="Date of birth" />
                          <Input name="dateOfDeath" type="date" defaultValue={formatDateInput(e.dateOfDeath)} placeholder="Date of death" />
                          <Input name="placeOfBirth" defaultValue={e.placeOfBirth ?? ""} placeholder="Place of birth" />
                          <Input name="placeOfDeath" defaultValue={e.placeOfDeath ?? ""} placeholder="Place of death" />
                          <div className="md:col-span-2 flex items-center gap-2">
                            <Button type="submit" variant="secondary">Save</Button>
                          </div>
                        </form>

                        <form
                          action={async (fd) => {
                            'use server';
                            await deleteEntryAction(fd);
                          }}
                          className="flex items-center gap-2"
                        >
                          <input type="hidden" name="id" value={e.id} />
                          <Button type="submit" variant="destructive">Delete</Button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
