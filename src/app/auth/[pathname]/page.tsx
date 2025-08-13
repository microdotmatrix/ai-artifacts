import { getSession } from "@/lib/auth/server";
import { AuthCard } from "@daveyplate/better-auth-ui";
import { authViewPaths } from "@daveyplate/better-auth-ui/server";
import { redirect } from "next/navigation";

export function generateStaticParams() {
  return Object.values(authViewPaths).map((pathname) => ({ pathname }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ pathname: string }>;
}) {
  const { pathname } = await params;

  if (pathname === "settings") {
    const { session } = await getSession();
    if (!session?.user) redirect("/auth/login?redirectTo=/auth/settings");
  }

  return (
    <main className="flex flex-col grow p-4 items-center justify-center">
      <AuthCard
        pathname={pathname}
        socialLayout="auto"
        className="container mx-auto"
        classNames={{
          title: "text-2xl",
        }}
      />
    </main>
  );
}
