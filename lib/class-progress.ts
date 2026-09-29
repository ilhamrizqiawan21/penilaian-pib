import type Database from "better-sqlite3";

export type ProgressMaterial={id:number;title:string;chapter_id:number;chapter:string;subchapter_id:number;subchapter:string};
export type ProgressStudent={id:number;name:string;nis:string|null};
export type ProgressScore={student_id:number;assessment_id:number;score:number|null;mistakes:number|null;updated_at:string;assessed_at:string|null};
export type ClassProgress={classId:number;className:string;materials:ProgressMaterial[];students:ProgressStudent[];scores:ProgressScore[]};

// One payload per class: switching students in Setoran needs no further request.
// Cleared rows (score NULL) are kept: their updated_at is the version sync checks against.
export function getClassProgress(db:Database.Database,classId:number):ClassProgress|null{
  const row=db.prepare("SELECT id,name,academic_year_id FROM classes WHERE id=?").get(classId) as {id:number;name:string;academic_year_id:number}|undefined;
  if(!row)return null;
  const materials=db.prepare(`SELECT a.id,a.title,ch.id chapter_id,ch.title chapter,su.id subchapter_id,su.title subchapter FROM assessments a JOIN subchapters su ON su.id=a.subchapter_id JOIN chapters ch ON ch.id=su.chapter_id JOIN curriculum_templates t ON t.id=ch.template_id WHERE a.is_active=1 AND t.academic_year_id=? ORDER BY t.id,ch.display_order,ch.id,su.display_order,su.id,a.display_order,a.id`).all(row.academic_year_id) as ProgressMaterial[];
  const students=db.prepare("SELECT id,name,nis FROM students WHERE class_id=? AND is_active=1 ORDER BY name").all(classId) as ProgressStudent[];
  const scores=db.prepare(`SELECT s.student_id,s.assessment_id,s.score,s.mistakes,s.updated_at,s.assessed_at FROM scores s JOIN students st ON st.id=s.student_id WHERE st.class_id=? AND st.is_active=1`).all(classId) as ProgressScore[];
  return {classId:row.id,className:row.name,materials,students,scores};
}

export type StudentPosition={assessed:number;total:number;lastIndex:number;nextIndex:number;gaps:number[]};
// Students advance sequentially; unscored materials before the furthest score are gaps, not the next target.
export function studentPosition(materialIds:number[],isScored:(assessmentId:number)=>boolean):StudentPosition{
  let lastIndex=-1,assessed=0;
  materialIds.forEach((id,index)=>{if(isScored(id)){assessed++;lastIndex=index}});
  const gaps=materialIds.slice(0,Math.max(0,lastIndex)).flatMap((id,index)=>isScored(id)?[]:[index]);
  const ahead=materialIds.findIndex((id,index)=>index>lastIndex&&!isScored(id));
  return {assessed,total:materialIds.length,lastIndex,nextIndex:ahead>=0?ahead:gaps[0]??-1,gaps};
}

// Assessed timestamps are ISO (UTC); compare by the teacher's local calendar day.
export function isSameLocalDay(iso:string|null|undefined,now=new Date()){
  if(!iso)return false;
  const date=new Date(iso);
  return !Number.isNaN(date.getTime())&&date.getFullYear()===now.getFullYear()&&date.getMonth()===now.getMonth()&&date.getDate()===now.getDate();
}
