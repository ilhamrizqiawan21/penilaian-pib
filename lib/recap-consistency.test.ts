import {beforeAll,afterAll,expect,it,vi} from "vitest";
import {runMigrations} from "./migrations";
import {getRecap} from "./recap-query";
import {getRecapRows} from "./recap-rows";
import {recapPercent,recapStatus} from "./recap-data";
import {averageStats,groupAverageRows} from "./report-groups";
import ExcelJS from "exceljs";
vi.mock("@/lib/db",async()=>{
  const {default:Database}=await import("better-sqlite3");
  return {db:new Database(":memory:")};
});
import {db} from "./db";
import {GET as excel} from "../app/api/export/route";
import {GET as pdf} from "../app/api/pdf/route";
import {GET as recapAPI} from "../app/api/recap/route";
beforeAll(()=>{
  runMigrations(db);
  db.exec(`
    INSERT INTO academic_years(id,name,semester) VALUES(1,'2026/2027','Ganjil'),(2,'2026/2027','Genap');
    INSERT INTO classes(id,academic_year_id,name) VALUES(1,1,'VIII A'),(2,2,'VIII A');
    INSERT INTO students(id,class_id,name) VALUES(1,1,'Ani'),(2,1,'Ani'),(3,2,'Tanpa materi');
    INSERT INTO curriculum_templates(id,academic_year_id,name) VALUES(1,1,'Template');
    INSERT INTO chapters(id,template_id,title) VALUES(1,1,'Bab A'),(2,1,'Bab B');
    INSERT INTO subchapters(id,chapter_id,title) VALUES(1,1,'Sub A'),(2,2,'Sub B');
    INSERT INTO assessments(id,subchapter_id,title,weight) VALUES(1,1,'A',1),(2,2,'B',3);
    INSERT INTO scores(student_id,assessment_id,score,mistakes) VALUES(1,1,90,0),(1,2,60,30),(2,1,0,90);
  `);
});
afterAll(()=>db.close());
it("preserves students without materials and separates same-name students and periods",()=>{
  const result=getRecap(db,{});
  expect(result.students).toHaveLength(3);
  expect(result.classes).toHaveLength(2);
  expect(result.students.find(s=>s.id===3)).toMatchObject({expected:0,assessed:0,average:null});
  expect(result.students.find(s=>s.id===1)).toMatchObject({expected:2,assessed:2,total:150,average:67.5});
  expect(result.classes.find(c=>c.id===1)).toMatchObject({students:2,expected:4,assessed:3,total:150,average:54});
  expect(getRecap(db,{classId:2,assessmentId:1}).students).toEqual([]);
});
it("uses the same weighted inputs for report summaries and recap",()=>{
  const rows=getRecapRows(db,{classId:1});
  const averaged=groupAverageRows(rows).flatMap(g=>g.classes.flatMap(c=>c.rows));
  expect(averageStats(averaged)).toEqual({scored:3,total:150,average:54});
  expect(getRecap(db,{classId:1}).classes[0].average).toBe(54);
});
it("requires exact completion and distinguishes unavailable curriculum",()=>{
  expect(recapPercent(200,199)).toBe(99);
  expect(recapPercent(200,200)).toBe(100);
  expect(recapPercent(0,0)).toBe(0);
  expect(recapStatus(0,0)).toBe("Materi belum tersedia");
  expect(recapStatus(2,0)).toBe("Belum dinilai");
  expect(recapStatus(2,1)).toBe("Sebagian");
  expect(recapStatus(2,2)).toBe("Lengkap");
});
it("returns scoped student details and rejects invalid student IDs",async()=>{
  const response=await recapAPI(new Request("http://localhost/api/recap?classId=1&studentId=2"));
  const {details}=await response.json();
  expect(details).toHaveLength(2);
  expect(details[0]).toMatchObject({student_id:2,assessment_id:1,score:0});
  expect(details[1]).toMatchObject({assessment_id:2,score:null});
  expect((await recapAPI(new Request("http://localhost/api/recap?studentId=bad"))).status).toBe(400);
});
it("exports exact recap student/class values and valid PDF",async()=>{
  const result=await excel(new Request("http://localhost/api/export"));
  const book=new ExcelJS.Workbook();
  await book.xlsx.load(Buffer.from(await result.arrayBuffer()) as never);
  const students=book.getWorksheet("Rekap Siswa")!;
  expect(students.rowCount).toBe(7);
  const studentValues=[5,6,7].map(i=>students.getRow(i).values);
  expect(studentValues).toContainEqual(expect.arrayContaining(["Ani",67.5,"Lengkap"]));
  expect(studentValues).toContainEqual(expect.arrayContaining(["Tanpa materi","Materi belum tersedia"]));
  const classes=book.getWorksheet("Rekap Kelas")!;
  expect([classes.getRow(5).getCell(4).value,classes.getRow(6).getCell(4).value]).toContain(54);
  const pdfResult=await pdf(new Request("http://localhost/api/pdf"));
  expect(Buffer.from(await pdfResult.arrayBuffer()).subarray(0,4).toString()).toBe("%PDF");
});
