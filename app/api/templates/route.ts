import {NextResponse} from "next/server";import {db} from "@/lib/db";import {z} from "zod";
const schema=z.object({academicYearId:z.number().int().positive(),name:z.string().trim().min(2).max(100)});
export async function GET(){return NextResponse.json(db.prepare("SELECT t.*,y.name academic_year_name,y.semester FROM curriculum_templates t JOIN academic_years y ON y.id=t.academic_year_id WHERE t.is_active=1 ORDER BY t.name").all())}
export async function POST(req:Request){try{const x=schema.parse(await req.json());const r=db.prepare("INSERT INTO curriculum_templates(academic_year_id,name) VALUES(?,?)").run(x.academicYearId,x.name);return NextResponse.json({id:r.lastInsertRowid},{status:201})}catch{return NextResponse.json({error:"Template tidak valid atau sudah ada"},{status:400})}}
