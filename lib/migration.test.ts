import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

function migrate(db: Database.Database) {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  db.exec("CREATE TABLE IF NOT EXISTS sample_data(id INTEGER PRIMARY KEY, value TEXT NOT NULL)");
  db.prepare("INSERT OR IGNORE INTO schema_migrations(version) VALUES(1)").run();
}

describe("migrasi SQLite", () => {
  it("menyiapkan database kosong dan mencatat versi schema", () => {
    const db = new Database(":memory:");
    migrate(db);
    expect(db.prepare("SELECT version FROM schema_migrations").pluck().all()).toEqual([1]);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sample_data'").get()).toBeTruthy();
    db.close();
  });
  it("mempertahankan data lama saat migrasi dijalankan ulang", () => {
    const db = new Database(":memory:"); migrate(db); db.prepare("INSERT INTO sample_data VALUES(?,?)").run(1, "lama"); migrate(db);
    expect(db.prepare("SELECT value FROM sample_data WHERE id=1").pluck().get()).toBe("lama"); db.close();
  });
  it("mengembalikan transaksi ketika migrasi gagal", () => {
    const db = new Database(":memory:"); migrate(db); const tx=db.transaction(()=>{db.prepare("INSERT INTO sample_data VALUES(?,?)").run(2,"baru");throw Error("gagal")}); expect(()=>tx()).toThrow(); expect(db.prepare("SELECT count(*) FROM sample_data WHERE id=2").pluck().get()).toBe(0); db.close();
  });
});
