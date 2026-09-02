import { NextResponse } from "next/server"; import { db } from "@/lib/db";
export const dynamic="force-dynamic";
export async function GET(){const data={version:1,exportedAt:new Date().toISOString(),students:db.prepare("SELECT * FROM students").all(),assessments:db.prepare("SELECT * FROM assessments").all(),scores:db.prepare("SELECT * FROM scores").all()};return new NextResponse(JSON.stringify(data,null,2),{headers:{"Content-Type":"application/json","Content-Disposition":"attachment; filename=pib-backup.json"}});}
