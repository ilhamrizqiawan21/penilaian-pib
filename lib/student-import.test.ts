import {expect,it} from "vitest";
import {parseStudentCsv,importRowError} from "./student-import";
it("reads quoted names, leading zero NIS and CRLF without shifting columns",()=>{
 const rows=parseStudentCsv('classId,nis,name,gender\r\n1,001,"Putri, A.",P\r\n');
 expect(rows).toEqual([{classId:1,nis:"001",name:"Putri, A.",gender:"P"}]);expect(importRowError(rows[0],[1])).toBe("");
});
it("rejects the wrong template and unknown class",()=>{
 expect(()=>parseStudentCsv("name,gender\nPutri,P")).toThrow();
 expect(importRowError({classId:5,name:"Putri",nis:"",gender:"P"},[1])).toBe("Kelas tidak ditemukan");
});
