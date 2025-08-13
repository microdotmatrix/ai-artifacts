import "server-only";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const getSession = async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return {
      error: "User not authorized",
    };
  }

  return { session, user: session.user };
};

export const getSessionUser = async () => {
  const session = await getSession();

  if (!session?.user) {
    return {
      error: "User not authorized",
    };
  }

  return session.user;
};

export const isAuthorized = async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/auth/login");
  }
};
