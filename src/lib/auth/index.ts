import { resend } from "@/lib/api/email";
import {
  AccountTable,
  InvitationTable,
  MemberTable,
  OrganizationTable,
  SessionTable,
  UserTable,
  VerificationTable,
} from "@/lib/db/schema";
import { env } from "@/lib/env/server";
import { EmailTemplate } from "@daveyplate/better-auth-ui/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, organization } from "better-auth/plugins";
import { db } from "../db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: UserTable,
      session: SessionTable,
      account: AccountTable,
      verification: VerificationTable,
      organization: OrganizationTable,
      member: MemberTable,
      invitation: InvitationTable,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      const name = user.name || user.email.split("@")[0];
      await resend.emails.send({
        from: "no-reply@newtech.dev",
        to: user.email,
        subject: "Verify your email address",
        react: EmailTemplate({
          action: "Verify Email",
          content: `
            <div>
              <p>
                Hello ${name}
              </p>
              <p>
                Click the button below to verify your email address.
              </p>
            </div>
          `,
          heading: "Verify Email",
          siteName: "NEW-TECH",
          baseUrl: env.BASE_URL,
          url,
        }),
      });
    },
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
  },
  // socialProviders: {
  //   github: {
  //     clientId: env.GITHUB_CLIENT_ID,
  //     clientSecret: env.GITHUB_CLIENT_SECRET,
  //     redirectURI: env.BASE_URL + "/api/auth/callback/github",
  //   },
  //   google: {
  //     clientId: env.GOOGLE_CLIENT_ID,
  //     clientSecret: env.GOOGLE_CLIENT_SECRET,
  //     redirectURI: env.BASE_URL + "/api/auth/callback/google",
  //   },
  //   discord: {
  //     clientId: env.DISCORD_CLIENT_ID,
  //     clientSecret: env.DISCORD_CLIENT_SECRET,
  //     redirectURI: env.BASE_URL + "/api/auth/callback/discord",
  //   },
  // },
  plugins: [nextCookies(), admin(), organization()],
});
