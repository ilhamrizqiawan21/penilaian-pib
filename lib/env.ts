import { z } from "zod";

const developmentSecret = "development-only-secret-change-me";
// Next.js mengevaluasi module route saat build; validasi production dijalankan saat runtime,
// bukan ketika artefak sedang dikompilasi.
const isProduction = process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build";
const schema = z.object({
  DATABASE_URL: z.string().min(1).default("file:./pib.sqlite"),
  SESSION_SECRET: isProduction
    ? z.string().min(32, "SESSION_SECRET production minimal 32 karakter").refine((value) => value !== developmentSecret, "SESSION_SECRET default tidak boleh dipakai di production")
    : z.string().min(16).default(developmentSecret),
});

export const env = schema.parse({ DATABASE_URL: process.env.DATABASE_URL, SESSION_SECRET: process.env.SESSION_SECRET });
export function sqlitePath(databaseUrl = env.DATABASE_URL) {
  if (!databaseUrl.startsWith("file:")) throw new Error("DATABASE_URL harus memakai format file:");
  const value = databaseUrl.slice(5);
  return value || ":memory:";
}
