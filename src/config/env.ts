import {
  type AIProvider,
  type AppEnvContract,
  type AppNodeEnv,
  type SpeechProvider,
  requiredServerEnvKeys
} from "@/contracts/env/env.contract";

const DEFAULT_PUBLIC_APP_NAME = "Record Studio MVP";
const DEFAULT_PUBLIC_API_BASE_PATH = "/api/v1";

function getRequiredEnv(key: keyof AppEnvContract): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function loadEnv(): AppEnvContract {
  for (const key of requiredServerEnvKeys) {
    getRequiredEnv(key);
  }

  return {
    NODE_ENV: (process.env.NODE_ENV as AppNodeEnv) ?? "development",
    DATABASE_URL: getRequiredEnv("DATABASE_URL"),
    NEXT_PUBLIC_APP_NAME:
      process.env.NEXT_PUBLIC_APP_NAME ?? DEFAULT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_API_BASE_PATH:
      process.env.NEXT_PUBLIC_API_BASE_PATH ?? DEFAULT_PUBLIC_API_BASE_PATH,
    AI_PROVIDER: getRequiredEnv("AI_PROVIDER") as AIProvider,
    AI_API_KEY: process.env.AI_API_KEY,
    SPEECH_PROVIDER: getRequiredEnv("SPEECH_PROVIDER") as SpeechProvider,
    SPEECH_API_KEY: process.env.SPEECH_API_KEY,
    EXPORT_STORAGE_PATH: getRequiredEnv("EXPORT_STORAGE_PATH")
  };
}

export const env = loadEnv();
