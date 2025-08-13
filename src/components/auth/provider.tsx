"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { client } from "@/lib/auth/client";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();

  return (
    <AuthUIProvider
      authClient={client}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => {
        // Clear router cache (protected routes)
        router.refresh();
      }}
      viewPaths={{
        SIGN_IN: "login",
        SIGN_OUT: "logout",
        SIGN_UP: "register",
        FORGOT_PASSWORD: "forgot-password",
        RESET_PASSWORD: "reset-password",
        MAGIC_LINK: "magic-link",
        SETTINGS: "settings",
      }}
      avatar
      optimistic={true}
      Link={Link}
    >
      {children}
    </AuthUIProvider>
  );
};
