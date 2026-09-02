import Database from "better-sqlite3";
import path from "path";

const file = path.join(process.cwd(), "pib.sqlite");
const globalDb = globalThis as unknown as { pibDb?: Database.Database };
export const db = globalDb.pibDb ?? new Database(file);

function hasColumn(table: string, column: string) {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((item) => item.name === column);
}

function migrate() {
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS academic_years(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, semester TEXT NOT NULL CHECK(semester IN ('Ganjil','Genap')), is_active INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(name, semester));
    CREATE TABLE IF NOT EXISTS classes(id INTEGER PRIMARY KEY AUTOINCREMENT, academic_year_id INTEGER NOT NULL REFERENCES academic_years(id), name TEXT NOT NULL, grade_level TEXT DEFAULT '', homeroom_teacher TEXT DEFAULT '', is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(academic_year_id, name));
    CREATE TABLE IF NOT EXISTS students(id INTEGER PRIMARY KEY AUTOINCREMENT, nis TEXT UNIQUE, name TEXT NOT NULL, class_name TEXT NOT NULL DEFAULT '', class_id INTEGER REFERENCES classes(id), nisn TEXT DEFAULT '', gender TEXT DEFAULT '' CHECK(gender IN ('','L','P')), active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS assessments(id INTEGER PRIMARY KEY AUTOINCREMENT, chapter TEXT NOT NULL, subchapter TEXT NOT NULL, title TEXT NOT NULL, description TEXT DEFAULT '', weight REAL NOT NULL DEFAULT 1 CHECK(weight > 0), position INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS scores(id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL REFERENCES students(id), assessment_id INTEGER NOT NULL REFERENCES assessments(id), mistakes INTEGER NOT NULL DEFAULT 0, score INTEGER NOT NULL DEFAULT 90, note TEXT DEFAULT '', assessed_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(student_id, assessment_id));
    CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);

  // Upgrade the original MVP schema without deleting existing records.
  if (!hasColumn("students", "class_id")) db.exec("ALTER TABLE students ADD COLUMN class_id INTEGER REFERENCES classes(id)");
  if (!hasColumn("students", "nisn")) db.exec("ALTER TABLE students ADD COLUMN nisn TEXT DEFAULT ''");
  if (!hasColumn("students", "gender")) db.exec("ALTER TABLE students ADD COLUMN gender TEXT DEFAULT ''");
  if (!hasColumn("students", "created_at")) db.exec("ALTER TABLE students ADD COLUMN created_at TEXT DEFAULT ''");
  if (!hasColumn("students", "updated_at")) db.exec("ALTER TABLE students ADD COLUMN updated_at TEXT DEFAULT ''");
  if (!hasColumn("assessments", "description")) db.exec("ALTER TABLE assessments ADD COLUMN description TEXT DEFAULT ''");
  if (!hasColumn("assessments", "weight")) db.exec("ALTER TABLE assessments ADD COLUMN weight REAL NOT NULL DEFAULT 1");
  if (!hasColumn("assessments", "created_at")) db.exec("ALTER TABLE assessments ADD COLUMN created_at TEXT DEFAULT ''");
  if (!hasColumn("assessments", "updated_at")) db.exec("ALTER TABLE assessments ADD COLUMN updated_at TEXT DEFAULT ''");

  const legacyClasses = db.prepare("SELECT DISTINCT class_name FROM students WHERE class_name <> '' AND class_id IS NULL").all() as { class_name: string }[];
  if (legacyClasses.length) {
    const existing = db.prepare("SELECT id FROM academic_years WHERE name=? AND semester=?").get("Data lama", "Ganjil") as { id: number } | undefined;
    const yearId = existing?.id ?? Number(db.prepare("INSERT INTO academic_years(name,semester,is_active) VALUES(?,?,?)").run("Data lama", "Ganjil", 0).lastInsertRowid);
    const insertClass = db.prepare("INSERT OR IGNORE INTO classes(academic_year_id,name) VALUES(?,?)");
    const findClass = db.prepare("SELECT id FROM classes WHERE academic_year_id=? AND name=?");
    const assign = db.prepare("UPDATE students SET class_id=? WHERE class_name=? AND class_id IS NULL");
    for (const item of legacyClasses) {
      insertClass.run(yearId, item.class_name);
      assign.run((findClass.get(yearId, item.class_name) as { id: number }).id, item.class_name);
    }
  }
}

migrate();
globalDb.pibDb = db;

export function overview() {
  return { students: db.prepare("SELECT count(*) AS n FROM students WHERE active=1").get() as { n: number }, assessments: db.prepare("SELECT count(*) AS n FROM assessments WHERE active=1").get() as { n: number }, scored: db.prepare("SELECT count(*) AS n FROM scores").get() as { n: number } };
}
