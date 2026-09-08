import {NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/db";
import {isResponse,readJson,requireUser,writeGuard} from "@/lib/api";

const createInput=z.object({studentId:z.number().int().positive(),assessmentIds:z.array(z.number().int().positive()).min(1).max(200)});
const itemSelect=`SELECT i.id,i.assessment_id,i.display_order,a.title,a.weight,ch.title chapter,su.title subchapter,s.score,s.mistakes,s.updated_at FROM individual_test_session_items i JOIN assessments a ON a.id=i.assessment_id JOIN subchapters su ON su.id=a.subchapter_id JOIN chapters ch ON ch.id=su.chapter_id LEFT JOIN scores s ON s.student_id=? AND s.assessment_id=i.assessment_id`;
function detail(id:number,studentId:number){
  const session=db.prepare(`SELECT x.*,st.name student_name,c.name class_name FROM individual_test_sessions x JOIN students st ON st.id=x.student_id JOIN classes c ON c.id=x.class_id WHERE x.id=? AND x.student_id=?`).get(id,studentId) as Record<string,unknown>|undefined;
  if(!session)return null;
  const items=db.prepare(`${itemSelect} WHERE i.session_id=? ORDER BY i.display_order`).all(studentId,id);
  return {...session,items};
}
export async function GET(req:Request){
  const user=await requireUser();if(isResponse(user))return user;
  const p=new URL(req.url).searchParams;const studentId=Number(p.get("studentId"));const id=Number(p.get("id"));
  if(id){const row=detail(id,Number(p.get("studentId")||0));return row?NextResponse.json(row):NextResponse.json({error:"Sesi tidak ditemukan"},{status:404});}
  if(!studentId)return NextResponse.json({error:"studentId wajib diisi"},{status:400});
  const rows=db.prepare("SELECT id FROM individual_test_sessions WHERE student_id=? AND status='ACTIVE' ORDER BY updated_at DESC").all(studentId) as {id:number}[];
  return NextResponse.json({sessions:rows.map(x=>detail(x.id,studentId))});
}
export async function POST(req:Request){
  const guard=writeGuard(req);if(guard)return guard;const user=await requireUser();if(isResponse(user))return user;
  try{const x=createInput.parse(await readJson(req));
    const student=db.prepare("SELECT id,class_id FROM students WHERE id=? AND is_active=1").get(x.studentId) as {id:number;class_id:number}|undefined;
    if(!student)return NextResponse.json({error:"Siswa tidak ditemukan"},{status:404});
    const valid=db.prepare(`SELECT a.id FROM assessments a JOIN subchapters su ON su.id=a.subchapter_id JOIN chapters ch ON ch.id=su.chapter_id JOIN curriculum_templates t ON t.id=ch.template_id JOIN classes c ON c.academic_year_id=t.academic_year_id WHERE a.is_active=1 AND a.id IN (${x.assessmentIds.map(()=>"?").join(",")}) AND c.id=?`).all(...x.assessmentIds,student.class_id) as {id:number}[];
    const allowed=new Set(valid.map(v=>v.id));if(allowed.size!==x.assessmentIds.length)return NextResponse.json({error:"Sebagian materi tidak tersedia untuk kelas siswa"},{status:400});
    const requested=[...x.assessmentIds].sort((a,b)=>a-b).join(",");
    const candidates=db.prepare("SELECT id FROM individual_test_sessions WHERE student_id=? AND class_id=? ORDER BY id DESC").all(x.studentId,student.class_id) as {id:number}[];
    for(const candidate of candidates){
      const existing=(db.prepare("SELECT assessment_id FROM individual_test_session_items WHERE session_id=? ORDER BY assessment_id").all(candidate.id) as {assessment_id:number}[]).map(row=>row.assessment_id).sort((a,b)=>a-b).join(",");
      if(existing===requested)return NextResponse.json(detail(candidate.id,x.studentId));
    }
    const create=db.transaction(()=>{const result=db.prepare("INSERT INTO individual_test_sessions(student_id,class_id) VALUES(?,?)").run(x.studentId,student.class_id);x.assessmentIds.forEach((aid,index)=>db.prepare("INSERT INTO individual_test_session_items(session_id,assessment_id,display_order) VALUES(?,?,?)").run(result.lastInsertRowid,aid,index));return Number(result.lastInsertRowid)});
    return NextResponse.json(detail(create(),x.studentId),{status:201});
  }catch{return NextResponse.json({error:"Data sesi tidak valid"},{status:400})}
}
export async function PATCH(req:Request){
  const guard=writeGuard(req);if(guard)return guard;const user=await requireUser();if(isResponse(user))return user;
  try{const x=z.object({id:z.number().int().positive(),status:z.enum(["COMPLETED","CANCELLED"])}).parse(await readJson(req));const session=db.prepare("SELECT id,student_id FROM individual_test_sessions WHERE id=? AND status='ACTIVE'").get(x.id) as {id:number;student_id:number}|undefined;if(!session)return NextResponse.json({error:"Sesi aktif tidak ditemukan"},{status:404});db.prepare("UPDATE individual_test_sessions SET status=?,updated_at=CURRENT_TIMESTAMP,completed_at=CASE WHEN ?='COMPLETED' THEN CURRENT_TIMESTAMP ELSE completed_at END WHERE id=?").run(x.status,x.status,x.id);return NextResponse.json(detail(x.id,session.student_id));}catch{return NextResponse.json({error:"Status sesi tidak valid"},{status:400})}
}
