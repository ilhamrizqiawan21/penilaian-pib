import {NextResponse} from "next/server";import {db} from "@/lib/db";import {z} from "zod";
const schema=z.object({name:z.string().trim().min(4).max(20),semester:z.enum(["Ganjil","Genap"]),isActive:z.boolean().optional()});
export async function GET(){return NextResponse.json(db.prepare("SELECT * FROM academic_years ORDER BY name DESC,semester").all())}
export async function POST(req:Request){try{const x=schema.parse(await req.json());const r=db.prepare("INSERT INTO academic_years(name,semester,is_active) VALUES(?,?,?)").run(x.name,x.semester,x.isActive?1:0);return NextResponse.json({id:r.lastInsertRowid},{status:201})}catch{return NextResponse.json({error:"Tahun ajaran tidak valid atau sudah ada"},{status:400})}}
