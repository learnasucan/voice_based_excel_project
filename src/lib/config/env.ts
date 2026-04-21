import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().default("file:./dev.db"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  APP_BASE_URL: z.string().default("http://localhost:3000")
});

export const env = EnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  APP_BASE_URL: process.env.APP_BASE_URL
});
