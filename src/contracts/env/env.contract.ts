export type AppNodeEnv = "development" | "test" | "production";

export type AIProvider = "stub" | "openai";

export type SpeechProvider = "stub" | "openai-whisper" | "browser";

export interface AppEnvContract {
  NODE_ENV: AppNodeEnv;
  DATABASE_URL: string;
  NEXT_PUBLIC_APP_NAME: string;
  NEXT_PUBLIC_API_BASE_PATH: string;
  AI_PROVIDER: AIProvider;
  AI_API_KEY?: string;
  SPEECH_PROVIDER: SpeechProvider;
  SPEECH_API_KEY?: string;
  EXPORT_STORAGE_PATH: string;
}

export const requiredServerEnvKeys: ReadonlyArray<keyof AppEnvContract> = [
  "DATABASE_URL",
  "AI_PROVIDER",
  "SPEECH_PROVIDER",
  "EXPORT_STORAGE_PATH"
];
