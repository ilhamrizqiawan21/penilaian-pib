import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json(db.prepare("SELECT * FROM academic_years ORDER BY is_active DESC,name DESC,semester").all()); }
export async function POST(req: Request) { try { const { name, semester, isActive=false } = await req.json(); if (!/^\d{4}\/\d{4}$/.test(String(name)) || !["Ganjil","Genap"].includes(semester)) return NextResponse.json({ error:"Tahun ajaran harus berformat YYYY/YYYY dan semester wajib dipilih" },{status:400}); const run=db.transaction(()=>{if(isActive)db.prepare("UPDATE academic_years SET is_active=0").run();return db.prepare("INSERT INTO academic_years(name,semester,is_active) VALUES(?,?,?)").run(name,semester,isActive?1:0)}); const result=run(); return NextResponse.json({id:result.lastInsertRowid},{status:201}); } catch { return NextResponse.json({error:"Tahun ajaran tersebut sudah ada"},{status:400}); } }
