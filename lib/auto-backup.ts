import type Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const NAME = /^pib-\d{8}-\d{6}\.sqlite$/;
const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;

export function listBackups(dir: string) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => NAME.test(name)).sort() : [];
}

type Options = { dbPath: string; dir: string; keep: number; intervalMs: number; now?: Date };

// Membuat satu file .sqlite utuh (VACUUM INTO, sudah memuat isi WAL) bila ada perubahan data
// sejak backup terakhir dan interval sudah lewat. Mengembalikan path file, atau null bila dilewati.
export function backupIfNeeded(db: Database.Database, { dbPath, dir, keep, intervalMs, now = new Date() }: Options) {
  const last = listBackups(dir).at(-1);
  if (last) {
    const lastMs = fs.statSync(path.join(dir, last)).mtimeMs;
    if (now.getTime() - lastMs < intervalMs) return null;
    const changed = [dbPath, `${dbPath}-wal`].some((file) => fs.existsSync(file) && fs.statSync(file).mtimeMs > lastMs);
    if (!changed) return null;
  }
  fs.mkdirSync(dir, { recursive: true });
  const stamp = now.toISOString().replace(/\.\d+Z$/, "").replace(/[-:]/g, "").replace("T", "-");
  const target = path.join(dir, `pib-${stamp}.sqlite`);
  if (fs.existsSync(target)) return null;
  const tmp = `${target}.tmp`;
  fs.rmSync(tmp, { force: true });
  db.exec(`VACUUM INTO ${quote(tmp)}`);
  fs.renameSync(tmp, target);
  for (const old of listBackups(dir).slice(0, -keep)) fs.rmSync(path.join(dir, old), { force: true });
  return target;
}

const positive = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const globalState = globalThis as unknown as { pibBackupTimer?: NodeJS.Timeout };

// Dipanggil sekali dari instrumentation.ts saat server menyala.
export async function startAutoBackup() {
  if (globalState.pibBackupTimer) return;
  const { db, databasePath } = await import("@/lib/db");
  if (databasePath === ":memory:") return;
  const dbPath = path.resolve(databasePath);
  const dir = process.env.PIB_BACKUP_DIR
    ? path.resolve(process.env.PIB_BACKUP_DIR)
    : path.join(path.dirname(dbPath), "backups", "scheduled");
  const options = {
    dbPath,
    dir,
    keep: Math.floor(positive(process.env.PIB_BACKUP_KEEP, 30)),
    intervalMs: positive(process.env.PIB_BACKUP_INTERVAL_HOURS, 2) * 3_600_000,
  };
  const tick = () => {
    try {
      const file = backupIfNeeded(db, options);
      if (file) console.log(`[PIB] Backup otomatis dibuat: ${file}`);
    } catch (error) {
      console.error("[PIB] Backup otomatis gagal:", error);
    }
  };
  tick();
  globalState.pibBackupTimer = setInterval(tick, Math.min(options.intervalMs, 600_000));
  globalState.pibBackupTimer.unref();
  console.log(`[PIB] Database: ${dbPath} | backup: ${dir}`);
}
