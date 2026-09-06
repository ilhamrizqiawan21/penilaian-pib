import type Database from "better-sqlite3";
import {chapterInput,subchapterInput,materialInput,curriculumEdit,curriculumMove,curriculumCopy,type CurriculumKind,type CurriculumPeriod,type CurriculumContext,type CurriculumItem,type CopyPreview} from "./curriculum-schema";
type DB=Database.Database;
export class CurriculumError extends Error{constructor(message:string,public status=400){super(message)}}
const normalize=(s:string)=>s.trim().toLocaleLowerCase("id");
function year(db:DB,id:number){
  const y=db.prepare("SELECT * FROM academic_years WHERE id=?").get(id) as CurriculumPeriod|undefined;
  if(!y)throw new CurriculumError("Periode tidak ditemukan.",404);
  return y;
}
type Chapter={id:number;title:string;template_id:number;academic_year_id:number;semester:string;template_name:string;display_order:number};
function chapter(db:DB,id:number){
  const c=db.prepare("SELECT c.*,t.academic_year_id,t.name template_name,y.semester FROM chapters c JOIN curriculum_templates t ON t.id=c.template_id JOIN academic_years y ON y.id=t.academic_year_id WHERE c.id=?").get(id) as Chapter|undefined;
  if(!c)throw new CurriculumError("Bab tidak ditemukan.",404);return c;
}
function subchapter(db:DB,id:number){
  const s=db.prepare("SELECT * FROM subchapters WHERE id=?").get(id) as {id:number;title:string;chapter_id:number}|undefined;
  if(!s)throw new CurriculumError("Subbab tidak ditemukan.",404);return s;
}
function template(db:DB,period:number){
  const y=year(db,period),name="Materi "+y.semester;
  db.prepare("INSERT OR IGNORE INTO curriculum_templates(academic_year_id,name) VALUES(?,?)").run(period,name);
  const t=db.prepare("SELECT id,is_active FROM curriculum_templates WHERE academic_year_id=? AND name=?").get(period,name) as {id:number;is_active:number};
  if(!t.is_active)throw new CurriculumError("Template tujuan tidak aktif; tinjau template periode ini.",409);
  return t.id;
}
function titles(db:DB,kind:CurriculumKind,parent:number):{id:number;title:string;display_order:number}[]{
  if(kind==="chapters")return db.prepare("SELECT c.id,c.title,c.display_order FROM chapters c JOIN curriculum_templates t ON t.id=c.template_id WHERE t.academic_year_id=? ORDER BY c.display_order,c.id").all(parent) as never;
  return db.prepare(kind==="subchapters"?"SELECT id,title,display_order FROM subchapters WHERE chapter_id=? ORDER BY display_order,id":"SELECT id,title,display_order FROM assessments WHERE subchapter_id=? AND is_active=1 ORDER BY display_order,id").all(parent) as never;
}
function unique(db:DB,kind:CurriculumKind,parent:number,title:string,except?:number){
  if(titles(db,kind,parent).some(x=>x.id!==except&&normalize(x.title)===normalize(title)))throw new CurriculumError("Nama sudah digunakan pada daftar ini.",409);
}
const mismatch=(name:string,semester:string)=>/^Materi (Ganjil|Genap)$/.test(name)&&name!=="Materi "+semester;
export function curriculumContext(db:DB,input:{yearId?:number;chapterId?:number;subchapterId?:number}):CurriculumContext{
  const c=input.chapterId?chapter(db,input.chapterId):null;
  const s=input.subchapterId?subchapter(db,input.subchapterId):null;
  if(s&&(!c||s.chapter_id!==c.id))throw new CurriculumError("Subbab tidak berada dalam Bab pada alamat ini.",404);
  if(c&&input.yearId&&c.academic_year_id!==input.yearId)throw new CurriculumError("Bab tidak berada pada periode yang dipilih.",404);
  const period=year(db,c?.academic_year_id??input.yearId??0);
  const warnings=(db.prepare("SELECT name FROM curriculum_templates WHERE academic_year_id=?").all(period.id) as {name:string}[]).filter(t=>mismatch(t.name,period.semester)).map(t=>t.name+" terhubung ke periode "+period.semester+". Tinjau data lama; materi dan nilai belum dipindahkan.");
  let items:CurriculumItem[];
  if(s)items=(db.prepare("SELECT a.*, (SELECT count(*) FROM scores sc WHERE sc.assessment_id=a.id AND sc.score IS NOT NULL) score_count,0 subchapter_count,0 material_count FROM assessments a WHERE a.subchapter_id=? AND a.is_active=1 ORDER BY a.display_order,a.id").all(s.id) as CurriculumItem[]).map(x=>({...x,legacy_mismatch:mismatch(c!.template_name,period.semester)}));
  else if(c)items=(db.prepare("SELECT s.*,0 score_count,0 subchapter_count,(SELECT count(*) FROM assessments a WHERE a.subchapter_id=s.id AND a.is_active=1) material_count FROM subchapters s WHERE s.chapter_id=? ORDER BY s.display_order,s.id").all(c.id) as CurriculumItem[]).map(x=>({...x,legacy_mismatch:mismatch(c.template_name,period.semester)}));
  else items=(db.prepare("SELECT c.*,t.name template_name,0 score_count,(SELECT count(*) FROM subchapters s WHERE s.chapter_id=c.id) subchapter_count,(SELECT count(*) FROM assessments a JOIN subchapters s ON s.id=a.subchapter_id WHERE s.chapter_id=c.id AND a.is_active=1) material_count FROM chapters c JOIN curriculum_templates t ON t.id=c.template_id WHERE t.academic_year_id=? ORDER BY c.display_order,c.id").all(period.id) as (CurriculumItem&{template_name:string})[]).map(x=>({...x,legacy_mismatch:mismatch(x.template_name,period.semester)}));
  return {period,chapter:c?{id:c.id,title:c.title}:null,subchapter:s?{id:s.id,title:s.title}:null,items,warnings};
}
export function createChapter(db:DB,body:unknown){
  const x=chapterInput.parse(body);
  return db.transaction(()=>{
    const y=year(db,x.academicYearId);
    if(x.semester&&x.semester!==y.semester)throw new CurriculumError("Semester berbeda dari periode yang dipilih.");
    unique(db,"chapters",y.id,x.title);
    const order=Math.max(-1,...titles(db,"chapters",y.id).map(c=>c.display_order))+1;
    return Number(db.prepare("INSERT INTO chapters(template_id,title,display_order) VALUES(?,?,?)").run(template(db,y.id),x.title,order).lastInsertRowid);
  })();
}
export function createSubchapter(db:DB,body:unknown){
  const x=subchapterInput.parse(body);
  return db.transaction(()=>{chapter(db,x.chapterId);unique(db,"subchapters",x.chapterId,x.title);
    return Number(db.prepare("INSERT INTO subchapters(chapter_id,title,display_order) VALUES(?,?,COALESCE((SELECT MAX(display_order)+1 FROM subchapters WHERE chapter_id=?),0))").run(x.chapterId,x.title,x.chapterId).lastInsertRowid);
  })();
}
export function createMaterial(db:DB,body:unknown){
  const x=materialInput.parse(body);
  return db.transaction(()=>{subchapter(db,x.subchapterId);unique(db,"assessments",x.subchapterId,x.title);
    return Number(db.prepare("INSERT INTO assessments(subchapter_id,title,description,weight,display_order) VALUES(?,?,?,?,COALESCE((SELECT MAX(display_order)+1 FROM assessments WHERE subchapter_id=?),0))").run(x.subchapterId,x.title,x.description,x.weight,x.subchapterId).lastInsertRowid);
  })();
}
function parentOf(db:DB,kind:CurriculumKind,id:number){
  if(kind==="chapters")return chapter(db,id).academic_year_id;
  if(kind==="subchapters")return subchapter(db,id).chapter_id;
  const a=db.prepare("SELECT subchapter_id FROM assessments WHERE id=? AND is_active=1").get(id) as {subchapter_id:number}|undefined;
  if(!a)throw new CurriculumError("Materi tidak ditemukan.",404);return a.subchapter_id;
}
export function editCurriculum(db:DB,body:unknown){
  const x=curriculumEdit.parse(body);
  db.transaction(()=>{
    const parent=parentOf(db,x.kind,x.id);unique(db,x.kind,parent,x.title,x.id);
    if(x.kind==="assessments"){
      const current=db.prepare("SELECT weight,description FROM assessments WHERE id=?").get(x.id) as {weight:number;description:string};
      const count=(db.prepare("SELECT count(*) n FROM scores WHERE assessment_id=? AND score IS NOT NULL").get(x.id) as {n:number}).n;
      if(x.weight!==undefined&&x.weight!==current.weight&&count>0&&x.confirmedScoreCount!==count)throw new CurriculumError("Perubahan bobot memengaruhi "+count+" nilai. Buka kembali form untuk meninjau dan mengonfirmasi jumlah terbaru.",409);
      db.prepare("UPDATE assessments SET title=?,weight=?,description=? WHERE id=?").run(x.title,x.weight??current.weight,x.description??current.description,x.id);
    }else db.prepare("UPDATE "+x.kind+" SET title=? WHERE id=?").run(x.title,x.id);
  })();
}
export function moveCurriculum(db:DB,body:unknown){
  const x=curriculumMove.parse(body);
  db.transaction(()=>{
    const list=titles(db,x.kind,parentOf(db,x.kind,x.id)),index=list.findIndex(i=>i.id===x.id),next=index+(x.direction==="up"?-1:1);
    if(next<0||next>=list.length)return;
    [list[index],list[next]]=[list[next],list[index]];
    const update=db.prepare("UPDATE "+x.kind+" SET display_order=? WHERE id=?");
    list.forEach((row,i)=>update.run(i,row.id));
  })();
}
function sourceChapters(db:DB,period:number){return db.prepare("SELECT c.*,t.name template_name FROM chapters c JOIN curriculum_templates t ON t.id=c.template_id WHERE t.academic_year_id=? AND t.is_active=1 ORDER BY c.display_order,c.id").all(period) as Chapter[]}
export function previewCopy(db:DB,body:unknown):CopyPreview{
  const x=curriculumCopy.parse(body),source=year(db,x.sourceId);year(db,x.targetId);
  if(x.sourceId===x.targetId)throw new CurriculumError("Pilih periode sumber yang berbeda.");
  const chapters=sourceChapters(db,x.sourceId),seen=new Set(titles(db,"chapters",x.targetId).map(c=>normalize(c.title))),conflicts:string[]=[];
  let subs=0,materials=0;
  for(const c of chapters){
    if(seen.has(normalize(c.title)))conflicts.push(c.title);seen.add(normalize(c.title));
    const rows=titles(db,"subchapters",c.id);subs+=rows.length;
    for(const s of rows)materials+=titles(db,"assessments",s.id).length;
  }
  return {chapters:chapters.length,subchapters:subs,materials,conflicts:[...new Set(conflicts)],legacyCount:chapters.filter(c=>mismatch(c.template_name,source.semester)).length};
}
export function copyPeriod(db:DB,body:unknown){
  const x=curriculumCopy.parse(body);
  return db.transaction(()=>{
    const preview=previewCopy(db,x);
    if(preview.conflicts.length)throw new CurriculumError("Nama Bab bertabrakan: "+preview.conflicts.join(", "),409);
    if(!preview.chapters)throw new CurriculumError("Periode sumber belum memiliki struktur aktif.");
    const target=template(db,x.targetId),start=Math.max(-1,...titles(db,"chapters",x.targetId).map(c=>c.display_order))+1;
    sourceChapters(db,x.sourceId).forEach((c,i)=>{
      const id=Number(db.prepare("INSERT INTO chapters(template_id,title,display_order) VALUES(?,?,?)").run(target,c.title,start+i).lastInsertRowid);
      for(const s of titles(db,"subchapters",c.id)){
        const subId=Number(db.prepare("INSERT INTO subchapters(chapter_id,title,display_order) VALUES(?,?,?)").run(id,s.title,s.display_order).lastInsertRowid);
        const materials=db.prepare("SELECT title,description,weight,display_order FROM assessments WHERE subchapter_id=? AND is_active=1 ORDER BY display_order,id").all(s.id) as {title:string;description:string;weight:number;display_order:number}[];
        for(const a of materials)db.prepare("INSERT INTO assessments(subchapter_id,title,description,weight,display_order) VALUES(?,?,?,?,?)").run(subId,a.title,a.description,a.weight,a.display_order);
      }
    });
    return preview;
  })();
}
