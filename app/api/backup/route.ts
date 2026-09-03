import {NextResponse} from "next/server";
import {audit,db,schemaVersion} from "@/lib/db";
import {isResponse,requireRole,requireUser} from "@/lib/api";
const tables=["academic_years","classes","students","curriculum_templates","chapters","subchapters","assessments","scores","settings","audit_logs","sync_operations"] as const;
export async function GET(){const user=await requireUser();if(isResponse(user))return user;const role= requireRole(user,["TEACHER","ADMIN"]);if(role)return role;const data=Object.fromEntries(tables.map(table=>[table,db.prepare(`SELECT * FROM ${table}`).all()]));audit(user.id,"backup","local","DOWNLOAD","Backup data-only dibuat");return new NextResponse(JSON.stringify({version:2,schemaVersion:schemaVersion(),createdAt:new Date().toISOString(),app:"pib-penilaian",data}),{headers:{"Content-Type":"application/json","Content-Disposition":"attachment; filename=backup-pib.json","Cache-Control":"no-store"}})}
