export type RecapStatus="Materi belum tersedia"|"Belum dinilai"|"Sebagian"|"Lengkap";
export function recapStatus(expected:number,assessed:number):RecapStatus{
  return expected===0?"Materi belum tersedia":assessed===0?"Belum dinilai":assessed===expected?"Lengkap":"Sebagian";
}
export function recapPercent(expected:number,assessed:number){
  return expected===0?0:assessed===expected?100:Math.min(99,Math.round(assessed/expected*100));
}
export type RecapDetail={
  student_id:number;class_id:number;name:string;nis:string|null;gender:string|null;
  class_name:string;academic_year_name:string;semester:string;
  assessment_id:number|null;chapter_id:number|null;subchapter_id:number|null;
  chapter:string|null;subchapter:string|null;assessment:string|null;weight:number|null;
  score:number|null;mistakes:number|null;assessed_at:string|null;initials:string|null;note:string|null;status:string;
};
export function scoreStats(rows:RecapDetail[]){
  const materials=rows.filter(r=>r.assessment_id!==null);
  const scored=materials.filter(r=>r.score!==null);
  const weight=scored.reduce((n,r)=>n+(r.weight??1),0);
  return {expected:materials.length,assessed:scored.length,total:scored.reduce((n,r)=>n+(r.score??0),0),
    average:weight?Math.round(scored.reduce((n,r)=>n+(r.score??0)*(r.weight??1),0)/weight*10)/10:null};
}
export function summarizeRecap(rows:RecapDetail[]){
  function group(key:(r:RecapDetail)=>number|null){
    const groups=new Map<number,RecapDetail[]>();
    for(const row of rows){const id=key(row);if(id!==null){const items=groups.get(id)??[];items.push(row);groups.set(id,items);}}
    return [...groups.entries()];
  }
  const students=group(r=>r.student_id).map(([id,items])=>{
    const r=items[0];return {id,name:r.name,nis:r.nis,class_id:r.class_id,class_name:r.class_name,academic_year_name:r.academic_year_name,semester:r.semester,...scoreStats(items)};
  });
  const classes=group(r=>r.class_id).map(([id,items])=>{
    const r=items[0];return {id,class_name:r.class_name,academic_year_name:r.academic_year_name,semester:r.semester,students:new Set(items.map(x=>x.student_id)).size,...scoreStats(items)};
  });
  const subchapters=group(r=>r.subchapter_id).map(([id,items])=>{
    const r=items[0];return {id,chapter:r.chapter??"",subchapter:r.subchapter??"",academic_year_name:r.academic_year_name,semester:r.semester,...scoreStats(items)};
  });
  return {students,classes,subchapters};
}
export type RecapData=ReturnType<typeof summarizeRecap>;
