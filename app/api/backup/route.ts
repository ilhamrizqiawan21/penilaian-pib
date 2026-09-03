import {NextResponse} from "next/server";import {db} from "@/lib/db";
const tables=["users","academic_years","classes","students","curriculum_templates","chapters","subchapters","assessments","scores","settings","audit_logs"];
export async function GET(){const data=Object.fromEntries(tables.map(t=>[t,db.prepare("SELECT * FROM "+t).all()]));return new NextResponse(JSON.stringify({version:1,createdAt:new Date().toISOString(),data}),{headers:{"Content-Type":"application/json","Content-Disposition":"attachment; filename=backup-pib.json"}})}
