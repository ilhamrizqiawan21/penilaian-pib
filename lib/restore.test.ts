import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pib-restore-"));
process.env.DATABASE_URL = `file:${path.join(dir, "main.sqlite")}`;

let db: typeof import("@/lib/db").db;
let lib: typeof import("@/lib/restore");

const seed = (name: string, user: string) => {
  db.exec("DELETE FROM scores; DELETE FROM students; DELETE FROM classes; DELETE FROM academic_years; DELETE FROM users");
  db.prepare("INSERT INTO users(id,name,email,password_hash) VALUES(7,?,?,'x')").run(user, `${user}@pib.local`);
  db.prepare("INSERT INTO academic_years(id,name,semester) VALUES(1,'2026/2027','Ganjil')").run();
  db.prepare("INSERT INTO classes(id,academic_year_id,name) VALUES(1,1,'7A')").run();
  db.prepare("INSERT INTO students(id,class_id,name) VALUES(1,1,?)").run(name);
};
const names = () => db.prepare("SELECT name FROM students").pluck().all();
const users = () => db.prepare("SELECT name FROM users").pluck().all();

beforeAll(async () => {
  ({ db } = await import("@/lib/db"));
  lib = await import("@/lib/restore");
});

describe("restore dari file sqlite", () => {
  it("mengganti data dan akun dengan isi backup", () => {
    seed("Ali", "guru-lama");
    const file = path.join(dir, "backup.sqlite");
    db.exec(`VACUUM INTO '${file}'`);
    seed("Budi", "guru-baru");
    expect(names()).toEqual(["Budi"]);
    lib.restoreFromSqliteFile(db, file);
    expect(names()).toEqual(["Ali"]);
    expect(users()).toEqual(["guru-lama"]);
    expect(db.prepare("PRAGMA database_list").all()).toHaveLength(1); // src sudah di-detach
  });
  it("menolak file yang bukan database PIB tanpa mengubah data", () => {
    seed("Ali", "guru");
    const junk = path.join(dir, "junk.sqlite");
    fs.writeFileSync(junk, "bukan database");
    expect(() => lib.restoreFromSqliteFile(db, junk)).toThrow(lib.RestoreError);
    expect(names()).toEqual(["Ali"]);
  });
});

describe("restore dari JSON", () => {
  it("backup lama tanpa users mempertahankan akun dan mengosongkan assessor yatim", () => {
    seed("Ali", "guru-sekarang");
    const dump = (t: string) => db.prepare(`SELECT * FROM ${t}`).all() as Record<string, unknown>[];
    const data: Record<string, Record<string, unknown>[]> = {};
    for (const t of lib.RESTORE_ORDER) if (t !== "users" && !t.startsWith("individual")) data[t] = dump(t);
    data.students = [{ ...data.students[0], name: "Dari Backup" }];
    lib.restoreFromJson(db, data);
    expect(names()).toEqual(["Dari Backup"]);
    expect(users()).toEqual(["guru-sekarang"]);
  });
  it("menolak tabel atau kolom yang tidak dikenal", () => {
    const data: Record<string, Record<string, unknown>[]> = {};
    for (const t of lib.RESTORE_ORDER) if (t !== "users") data[t] = [];
    expect(() => lib.restoreFromJson(db, { ...data, hacker: [] })).toThrow(lib.RestoreError);
    expect(() => lib.restoreFromJson(db, { ...data, settings: [{ key: "a", value: "b", x: 1 }] })).toThrow(lib.RestoreError);
  });
});
