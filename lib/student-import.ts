export type ImportRow={classId:number;nis:string;name:string;gender:string};
export function parseStudentCsv(text:string):ImportRow[]{
  const rows:string[][]=[];let row:string[]=[],value="",quoted=false;
  const source=text.replace(/^\uFEFF/,"");
  for(let i=0;i<source.length;i++){
    const ch=source[i];
    if(ch==='"'){if(quoted&&source[i+1]==='"'){value+='"';i++}else quoted=!quoted}
    else if(ch===","&&!quoted){row.push(value);value=""}
    else if((ch==="\n"||ch==="\r")&&!quoted){if(ch==="\r"&&source[i+1]==="\n")i++;row.push(value);if(row.some(x=>x.trim()))rows.push(row);row=[];value=""}
    else value+=ch;
  }
  if(quoted)throw Error("Tanda kutip CSV tidak ditutup.");
  row.push(value);if(row.some(x=>x.trim()))rows.push(row);
  if(rows[0]?.[0]?.trim().toLowerCase()!=="classid")throw Error("Gunakan header dari template PIB: classId, nis, name, gender.");
  return rows.slice(1).map(([classId,nis="",name="",gender=""])=>({classId:Number(classId),nis:nis.trim(),name:name.trim(),gender:gender.trim()}));
}
export function importRowError(row:ImportRow,classIds:number[]){
  if(!classIds.includes(row.classId))return "Kelas tidak ditemukan";
  if(row.name.trim().length<2||row.name.length>120)return "Nama harus 2–120 karakter";
  if(row.nis.length>30)return "NIS maksimal 30 karakter";
  if(!["","L","P"].includes(row.gender))return "Gender harus L atau P";
  return "";
}
