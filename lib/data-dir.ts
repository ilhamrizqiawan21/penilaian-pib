import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Nilai DATABASE_URL yang ditulis launcher lama. Diperlakukan sama dengan "tidak diatur"
// sehingga instalasi lama otomatis berpindah ke folder data pengguna.
export const LEGACY_DATABASE_URL = "file:./pib.sqlite";

export function defaultDataDir(env: Record<string, string | undefined> = process.env, platform: NodeJS.Platform = process.platform, home = os.homedir()) {
  if (env.PIB_DATA_DIR) return path.resolve(env.PIB_DATA_DIR);
  if (platform === "win32") return path.join(env.APPDATA || path.join(home, "AppData", "Roaming"), "PIB-Penilaian");
  if (platform === "darwin") return path.join(home, "Library", "Application Support", "PIB-Penilaian");
  return path.join(env.XDG_DATA_HOME || path.join(home, ".local", "share"), "PIB-Penilaian");
}

export function usesDefaultDatabase(configured?: string) {
  return !configured || configured === LEGACY_DATABASE_URL;
}

export function resolveDatabaseUrl(configured?: string, env: Record<string, string | undefined> = process.env) {
  if (!usesDefaultDatabase(configured)) return configured as string;
  return `file:${path.join(defaultDataDir(env), "pib.sqlite")}`;
}

const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;

// Menyalin database lama (./pib.sqlite di folder proyek) ke lokasi baru sekali saja.
// VACUUM INTO membaca isi file utama beserta WAL, sehingga data terbaru ikut terbawa.
// File lama tidak dihapus sebagai cadangan.
export function adoptLegacyDatabase(target: string, legacy = path.resolve("pib.sqlite")) {
  if (target === ":memory:") return null;
  const dest = path.resolve(target);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (dest === legacy || fs.existsSync(dest) || !fs.existsSync(legacy)) return null;
  const tmp = `${dest}.migrating-${process.pid}`;
  const source = new Database(legacy, { readonly: true });
  try {
    fs.rmSync(tmp, { force: true });
    source.exec(`VACUUM INTO ${quote(tmp)}`);
  } finally {
    source.close();
  }
  // Ubah ke WAL sekarang, sebelum file terlihat proses lain; mengubah mode journal saat
  // beberapa proses membuka file bersamaan dapat menghasilkan SQLITE_BUSY.
  const copy = new Database(tmp);
  copy.pragma("journal_mode = WAL");
  copy.close();
  try {
    fs.renameSync(tmp, dest);
  } catch (error) {
    fs.rmSync(tmp, { force: true });
    if (!fs.existsSync(dest)) throw error; // proses lain (worker build) sudah menyelesaikannya
  }
  return legacy;
}
