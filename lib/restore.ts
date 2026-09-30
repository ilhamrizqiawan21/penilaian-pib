import type Database from "better-sqlite3";
import { db as appDb, schemaVersion } from "@/lib/db";

export class RestoreError extends Error {}

// Urutan induk -> anak. Penghapusan dilakukan dengan urutan terbalik.
export const RESTORE_ORDER = [
  "users",
  "academic_years",
  "classes",
  "students",
  "curriculum_templates",
  "chapters",
  "subchapters",
  "assessments",
  "scores",
  "individual_test_sessions",
  "individual_test_session_items",
  "settings",
  "audit_logs",
  "sync_operations",
] as const;

// Backup lama tidak memuat tabel ini. `users` dibiarkan apa adanya bila tidak ada di backup;
// tabel opsional lain dianggap kosong.
const OPTIONAL = new Set<string>(["users", "individual_test_sessions", "individual_test_session_items"]);
const KEEP_WHEN_ABSENT = "users";

const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;
const columnsOf = (db: Database.Database, table: string, schema = "main") =>
  (db.prepare(`PRAGMA ${schema}.table_info(${table})`).all() as { name: string }[]).map((c) => c.name);

// Nilai assessor yang tidak ada di tabel users (misalnya backup lama di device baru) dikosongkan
// agar pemulihan tidak gagal karena foreign key.
function finish(db: Database.Database) {
  db.prepare("UPDATE scores SET assessor_id=NULL WHERE assessor_id IS NOT NULL AND assessor_id NOT IN (SELECT id FROM users)").run();
  if (db.prepare("PRAGMA foreign_key_check").all().length) throw new RestoreError("Data backup melanggar relasi antar tabel");
}

export function restoreFromJson(db: Database.Database, data: Record<string, Record<string, unknown>[]>) {
  for (const key of Object.keys(data)) if (!(RESTORE_ORDER as readonly string[]).includes(key)) throw new RestoreError(`Tabel tidak dikenal: ${key}`);
  for (const table of RESTORE_ORDER) {
    const rows = data[table];
    if (!rows) {
      if (OPTIONAL.has(table)) continue;
      throw new RestoreError(`Backup tidak memuat tabel ${table}`);
    }
    const expected = columnsOf(db, table);
    for (const row of rows) if (Object.keys(row).some((key) => !expected.includes(key))) throw new RestoreError(`Kolom tidak dikenal pada tabel ${table}`);
  }
  return db.transaction(() => {
    for (const table of [...RESTORE_ORDER].reverse()) if (data[table] || table !== KEEP_WHEN_ABSENT) db.prepare(`DELETE FROM ${table}`).run();
    let rows = 0;
    for (const table of RESTORE_ORDER)
      for (const row of data[table] ?? []) {
        const columns = Object.keys(row);
        if (!columns.length) continue;
        db.prepare(`INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`).run(...columns.map((c) => row[c] ?? null));
        rows++;
      }
    finish(db);
    return rows;
  })();
}

// Memulihkan dari file .sqlite (mis. backup otomatis). File di-ATTACH, lalu isinya disalin
// dalam satu transaksi; bila gagal, data saat ini tidak berubah.
export function restoreFromSqliteFile(db: Database.Database, file: string) {
  try {
    db.exec(`ATTACH DATABASE ${quote(file)} AS src`);
  } catch {
    throw new RestoreError("File bukan database PIB yang valid");
  }
  try {
    let tables: string[];
    try {
      if (db.prepare("PRAGMA src.integrity_check").pluck().get() !== "ok") throw new RestoreError("File database rusak");
      tables = db.prepare("SELECT name FROM src.sqlite_master WHERE type='table'").pluck().all() as string[];
    } catch (error) {
      throw error instanceof RestoreError ? error : new RestoreError("File bukan database PIB yang valid");
    }
    if (!tables.includes("schema_migrations")) throw new RestoreError("File bukan database PIB yang valid");
    const version = Number(db.prepare("SELECT MAX(version) FROM src.schema_migrations").pluck().get() ?? 0);
    if (version > schemaVersion()) throw new RestoreError("Backup dibuat oleh versi aplikasi yang lebih baru. Perbarui aplikasi terlebih dahulu.");
    const plan = RESTORE_ORDER.map((table) => {
      if (!tables.includes(table)) {
        if (OPTIONAL.has(table)) return { table, columns: null };
        throw new RestoreError(`Backup tidak memuat tabel ${table}`);
      }
      const expected = columnsOf(db, table);
      const columns = columnsOf(db, table, "src");
      if (columns.some((c) => !expected.includes(c))) throw new RestoreError(`Kolom tidak dikenal pada tabel ${table}`);
      return { table, columns };
    });
    return db.transaction(() => {
      for (const { table, columns } of [...plan].reverse()) if (columns || table !== KEEP_WHEN_ABSENT) db.prepare(`DELETE FROM main.${table}`).run();
      let rows = 0;
      for (const { table, columns } of plan) {
        if (!columns?.length) continue;
        rows += db.prepare(`INSERT INTO main.${table} (${columns.join(",")}) SELECT ${columns.join(",")} FROM src.${table}`).run().changes;
      }
      finish(db);
      return rows;
    })();
  } finally {
    db.exec("DETACH DATABASE src");
  }
}

// Setelah restore, akun yang dipakai request ini bisa saja tidak ada lagi di tabel users.
export function auditUserId(id: number) {
  if (appDb.prepare("SELECT id FROM users WHERE id=?").pluck().get(id)) return id;
  return (appDb.prepare("SELECT id FROM users ORDER BY id LIMIT 1").pluck().get() as number | undefined) ?? null;
}
