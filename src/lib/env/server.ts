import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BASE_URL: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
  },
  createFinalSchema: (env) => {
    return z.object(env).transform((val) => {
      const {
        DATABASE_URL,
        BASE_URL,
        OPENAI_API_KEY,
        RESEND_API_KEY,
        ...rest
      } = val;
      return {
        DATABASE_URL,
        BASE_URL,
        OPENAI_API_KEY,
        RESEND_API_KEY,
        ...rest,
      };
    });
  },
  emptyStringAsUndefined: true,
  experimental__runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BASE_URL: process.env.BASE_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  },
});
