import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const client = createAuthClient({
  baseURL: process.env.BASE_URL!,
  plugins: [adminClient(), organizationClient()],
});

export const { signIn, signOut, signUp, useSession, admin, organization } =
  client;
