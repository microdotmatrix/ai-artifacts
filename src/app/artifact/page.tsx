import { ArtifactWorkspace } from "./artifact-workspace";
import { submitArtifactMessage } from "./actions";

export const metadata = {
  title: "Artifact",
  description: "Generate and iteratively refine a document with AI.",
};

export default function ArtifactPage() {
  return (
    <main>
      <div className="container py-8">
        <h1 className="text-center">Artifact</h1>
        <p className="text-center mt-2 opacity-80">
          Generate a document from a prompt and refine it by chatting with the AI.
        </p>
        <section className="mt-8">
          <ArtifactWorkspace action={submitArtifactMessage} />
        </section>
      </div>
    </main>
  );
}
