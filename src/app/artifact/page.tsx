import { getSessionUser, isAuthorized } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { getDocumentForEntry } from "@/lib/db/queries";
import { ArtifactMessageTable } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { submitArtifactMessage } from "./actions";
import { ArtifactWorkspace } from "./artifact-workspace";

export const metadata = {
  title: "Artifact",
  description: "Generate and iteratively refine a document with AI.",
};

export default async function ArtifactPage({
  searchParams,
}: {
  searchParams?: Promise<{ entryId?: string; docType?: "obituary" | "eulogy" }>;
}) {
  await isAuthorized();
  const user = await getSessionUser();
  // Fallback in case helper doesn't redirect
  if (!user || (user as any).error) return null;

  const entryId = (await searchParams)?.entryId ?? null;
  const docType =
    (await searchParams)?.docType === "eulogy" ? "eulogy" : "obituary";

  // Load document scoped by (userId, entryId, docType). Do not auto-create;
  // creation happens during streaming or server action flows.
  const docRow = await getDocumentForEntry({
    userId: (user as any).id,
    entryId,
    docType,
  });

  const messages = docRow
    ? await db
        .select()
        .from(ArtifactMessageTable)
        .where(eq(ArtifactMessageTable.artifactId, docRow.id))
        .orderBy(asc(ArtifactMessageTable.createdAt))
    : [];

  const initialDoc = docRow?.content ?? "";
  const initialMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  return (
    <main>
      <div className="container py-8">
        <h1 className="text-center">Artifact</h1>
        <p className="text-center mt-2 opacity-80">
          Generate a document from a prompt and refine it by chatting with the
          AI.
        </p>
        <section className="mt-8">
          <ArtifactWorkspace
            action={submitArtifactMessage}
            initialDoc={initialDoc}
            initialMessages={initialMessages}
            entryId={entryId}
            docType={docType}
          />
        </section>
      </div>
    </main>
  );
}
