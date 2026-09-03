import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { env, sqlitePath } from "@/lib/env";
import { runMigrations } from "@/lib/migrations";
const globalDb=globalThis as unknown as {pibDb?:Database.Database};
export const databasePath=sqlitePath(env.DATABASE_URL);
function snapshot(db:Database.Database,reason:"migration"|"restore"){if(databasePath===":memory:"||!fs.existsSync(databasePath))return null;const dir=path.join(path.dirname(path.resolve(databasePath)),"backups","auto");fs.mkdirSync(dir,{recursive:true});db.pragma("wal_checkpoint(TRUNCATE)");const target=path.join(dir,`pre-${reason}-${new Date().toISOString().replace(/[:.]/g,"-")}.sqlite`);fs.copyFileSync(databasePath,target);return target}
export const db=globalDb.pibDb??new Database(databasePath);
db.pragma("foreign_keys = ON");db.pragma("journal_mode = WAL");
if(!globalDb.pibDb){const has=Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get());const current=has?Number(db.prepare("SELECT MAX(version) FROM schema_migrations").pluck().get()??0):0;if(current<2)snapshot(db,"migration");runMigrations(db)}
globalDb.pibDb=db;
export const createSnapshot=(reason:"migration"|"restore")=>snapshot(db,reason);
export const schemaVersion=()=>Number(db.prepare("SELECT MAX(version) FROM schema_migrations").pluck().get()??0);
export const audit=(userId:number|null,entity:string,entityId:string,action:string,summary:string)=>db.prepare("INSERT INTO audit_logs(user_id,entity,entity_id,action,summary) VALUES(?,?,?,?,?)").run(userId,entity,entityId,action,summary);
