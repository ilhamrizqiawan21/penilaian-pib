import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { backupIfNeeded, listBackups } from "@/lib/auto-backup";
import { adoptLegacyDatabase, defaultDataDir, resolveDatabaseUrl } from "@/lib/data-dir";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "pib-test-"));

describe("lokasi database", () => {
  it("memakai PIB_DATA_DIR bila diatur", () => {
    const dir = tmp();
    expect(defaultDataDir({ PIB_DATA_DIR: dir })).toBe(path.resolve(dir));
    expect(resolveDatabaseUrl(undefined, { PIB_DATA_DIR: dir })).toBe(`file:${path.join(path.resolve(dir), "pib.sqlite")}`);
  });
  it("memperlakukan nilai launcher lama sebagai default, tetapi menghormati path eksplisit", () => {
    const env = { PIB_DATA_DIR: tmp() };
    expect(resolveDatabaseUrl("file:./pib.sqlite", env)).toContain("PIB_DATA_DIR" in env ? path.resolve(env.PIB_DATA_DIR) : "");
    expect(resolveDatabaseUrl("file:D:/lain/x.sqlite", env)).toBe("file:D:/lain/x.sqlite");
  });
  it("default Windows berada di APPDATA", () => {
    expect(defaultDataDir({ APPDATA: "C:\Users\a\AppData\Roaming" }, "win32", "C:\Users\a")).toContain("PIB-Penilaian");
  });
});

describe("pemindahan database lama", () => {
  it("menyalin data termasuk isi WAL dan tidak menghapus file lama", () => {
    const dir = tmp();
    const legacy = path.join(dir, "pib.sqlite");
    const old = new Database(legacy);
    old.pragma("journal_mode = WAL");
    old.exec("CREATE TABLE t(v TEXT); INSERT INTO t VALUES('terbaru')");
    // old sengaja tidak ditutup: data masih berada di file -wal
    const target = path.join(dir, "data", "pib.sqlite");
    expect(adoptLegacyDatabase(target, legacy)).toBe(legacy);
    const copy = new Database(target, { readonly: true });
    expect(copy.prepare("SELECT v FROM t").pluck().get()).toBe("terbaru");
    copy.close(); old.close();
    expect(fs.existsSync(legacy)).toBe(true);
  });
  it("tidak menimpa database tujuan yang sudah ada", () => {
    const dir = tmp();
    const legacy = path.join(dir, "pib.sqlite");
    new Database(legacy).close();
    const target = path.join(dir, "baru.sqlite");
    fs.writeFileSync(target, "sudah ada");
    expect(adoptLegacyDatabase(target, legacy)).toBeNull();
    expect(fs.readFileSync(target, "utf8")).toBe("sudah ada");
  });
});

describe("backup otomatis", () => {
  const setup = () => {
    const dir = tmp();
    const dbPath = path.join(dir, "pib.sqlite");
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.exec("CREATE TABLE t(v INTEGER)");
    return { db, dbPath, dir: path.join(dir, "bk") };
  };
  const hours = (n: number) => n * 3_600_000;
  const tick = () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50); // mtime harus terpaut nyata dari backup

  it("membuat backup utuh, melewati bila tidak ada perubahan, dan merotasi", () => {
    const { db, dbPath, dir } = setup();
    const base = { dbPath, dir, keep: 2, intervalMs: hours(1) };
    db.prepare("INSERT INTO t VALUES(1)").run();
    const t0 = new Date();
    const first = backupIfNeeded(db, { ...base, now: t0 });
    expect(first).toBeTruthy();
    const copy = new Database(first!, { readonly: true });
    expect(copy.prepare("SELECT COUNT(*) FROM t").pluck().get()).toBe(1);
    copy.close();

    expect(backupIfNeeded(db, { ...base, now: new Date(t0.getTime() + hours(2)) })).toBeNull(); // tidak berubah
    tick();
    db.prepare("INSERT INTO t VALUES(2)").run();
    expect(backupIfNeeded(db, { ...base, now: new Date(t0.getTime() + hours(0.5)) })).toBeNull(); // belum sampai interval
    const later = new Date(Date.now() + hours(3));
    expect(backupIfNeeded(db, { ...base, now: later })).toBeTruthy();
    tick();
    db.prepare("INSERT INTO t VALUES(3)").run();
    expect(backupIfNeeded(db, { ...base, now: new Date(later.getTime() + hours(3)) })).toBeTruthy();
    expect(listBackups(dir)).toHaveLength(2);
    db.close();
  });
});
