import {db} from "@/lib/db";
import {recapFilter} from "@/lib/filters";
import {getRecapRows} from "@/lib/recap-rows";
export function reportRows(req:Request){
  return getRecapRows(db,recapFilter.parse(Object.fromEntries(new URL(req.url).searchParams)));
}
export function reportScope(req:Request){
  const f=recapFilter.parse(Object.fromEntries(new URL(req.url).searchParams));
  const c=f.classId?db.prepare("SELECT c.name,y.name year,y.semester FROM classes c JOIN academic_years y ON y.id=c.academic_year_id WHERE c.id=?").get(f.classId) as {name:string;year:string;semester:string}|undefined:undefined;
  const y=f.academicYearId?db.prepare("SELECT name,semester FROM academic_years WHERE id=?").get(f.academicYearId) as {name:string;semester:string}|undefined:undefined;
  const a=f.assessmentId?db.prepare("SELECT title FROM assessments WHERE id=?").get(f.assessmentId) as {title:string}|undefined:undefined;
  return [
    y?y.name+" · "+y.semester:c?c.year+" · "+c.semester:"Semua periode",
    c?"Kelas: "+c.name:"Semua kelas",
    f.student?"Nama: "+f.student:"",
    f.chapter?"Bab: "+f.chapter:"",
    f.subchapter?"Subbab: "+f.subchapter:"",
    f.assessmentId?"Materi: "+(a?.title??"#"+f.assessmentId):"Semua materi dalam cakupan"
  ].filter(Boolean).join(" | ");
}
