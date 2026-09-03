import type Database from "better-sqlite3";
export type Migration = { version: number; name: string; up: (db: Database.Database) => void };
export const migrations: Migration[] = [
  { version: 1, name: "initial_schema", up: (db) => db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'TEACHER',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS academic_years(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,semester TEXT NOT NULL,is_active INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(name,semester));
CREATE TABLE IF NOT EXISTS classes(id INTEGER PRIMARY KEY AUTOINCREMENT,academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),name TEXT NOT NULL,grade_level TEXT NOT NULL DEFAULT '',homeroom_teacher TEXT NOT NULL DEFAULT '',is_active INTEGER NOT NULL DEFAULT 1,UNIQUE(academic_year_id,name));
CREATE TABLE IF NOT EXISTS students(id INTEGER PRIMARY KEY AUTOINCREMENT,class_id INTEGER NOT NULL REFERENCES classes(id),nis TEXT UNIQUE,nisn TEXT NOT NULL DEFAULT '',name TEXT NOT NULL,gender TEXT NOT NULL DEFAULT '',is_active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS curriculum_templates(id INTEGER PRIMARY KEY AUTOINCREMENT,academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),name TEXT NOT NULL,is_active INTEGER NOT NULL DEFAULT 1,UNIQUE(academic_year_id,name));
CREATE TABLE IF NOT EXISTS chapters(id INTEGER PRIMARY KEY AUTOINCREMENT,template_id INTEGER NOT NULL REFERENCES curriculum_templates(id) ON DELETE CASCADE,title TEXT NOT NULL,display_order INTEGER NOT NULL DEFAULT 0,UNIQUE(template_id,title));
CREATE TABLE IF NOT EXISTS subchapters(id INTEGER PRIMARY KEY AUTOINCREMENT,chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,title TEXT NOT NULL,display_order INTEGER NOT NULL DEFAULT 0,UNIQUE(chapter_id,title));
CREATE TABLE IF NOT EXISTS assessments(id INTEGER PRIMARY KEY AUTOINCREMENT,subchapter_id INTEGER NOT NULL REFERENCES subchapters(id) ON DELETE CASCADE,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',weight REAL NOT NULL DEFAULT 1,display_order INTEGER NOT NULL DEFAULT 0,is_active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS scores(id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,mistakes INTEGER,score INTEGER,assessed_at TEXT,assessor_id INTEGER REFERENCES users(id),initials TEXT NOT NULL DEFAULT '',note TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(student_id,assessment_id));
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,entity TEXT NOT NULL,entity_id TEXT NOT NULL,action TEXT NOT NULL,summary TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sync_operations(id TEXT PRIMARY KEY,device_id TEXT NOT NULL,operation TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'PENDING',error TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,synced_at TEXT);
`) },
  { version: 2, name: "query_indexes", up: (db) => db.exec(`
CREATE INDEX IF NOT EXISTS idx_students_class_active ON students(class_id,is_active);
CREATE INDEX IF NOT EXISTS idx_scores_assessment_student ON scores(assessment_id,student_id);
CREATE INDEX IF NOT EXISTS idx_scores_student_assessment ON scores(student_id,assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessments_subchapter_active ON assessments(subchapter_id,is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
`) },
];
export function runMigrations(db: Database.Database) {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  const applied = new Set(db.prepare("SELECT version FROM schema_migrations").pluck().all() as number[]);
  for (const migration of migrations) if (!applied.has(migration.version)) db.transaction(() => { migration.up(db); db.prepare("INSERT INTO schema_migrations(version) VALUES(?)").run(migration.version); })();
}
