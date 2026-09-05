import { z } from "zod";

const developmentSecret = "development-only-secret-change-me";
// Next.js mengevaluasi module route saat build; validasi production dijalankan saat runtime,
// bukan ketika artefak sedang dikompilasi.
const isProduction = process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build";
const schema = z.object({
  DATABASE_URL: z.string().min(1).default("file:./pib.sqlite"),
  SESSION_SECRET: isProduction
    ? z.string().min(32, "SESSION_SECRET production minimal 32 karakter")
    : z.string().min(16).default(developmentSecret),
  // AI provider configuration (diperlukan oleh modul asisten). Di production, API key wajib diisi jika provider memerlukan.
  OLLAMA_BASE_URL: z.string().url().optional(),
  OLLAMA_MODEL: z.string().optional(),
  OLLAMA_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_BASE_URL: z.string().url().optional(),
  AI_PROVIDER: z.enum(["ollama", "gemini"]).default("ollama"),
  AI_ASSISTANT_NAME: z.string().optional(),
});

export const env = schema.parse(process.env as Record<string, string | undefined>);
export function sqlitePath(databaseUrl = env.DATABASE_URL) {
  if (!databaseUrl.startsWith("file:")) throw new Error("DATABASE_URL harus memakai format file:");
  const value = databaseUrl.slice(5);
  return value || ":memory:";
}
