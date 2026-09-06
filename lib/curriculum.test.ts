import {beforeAll,beforeEach,afterEach,afterAll,expect,it,vi} from "vitest";
import {runMigrations} from "./migrations";
import {createChapter,createSubchapter,createMaterial,curriculumContext,editCurriculum,moveCurriculum,previewCopy,copyPeriod} from "./curriculum";
import {getRecap} from "./recap-query";
vi.mock("@/lib/db",async()=>{const {default:Database}=await import("better-sqlite3");return {db:new Database(":memory:")}});
import {db} from "./db";
import {GET as chaptersGET,POST as chaptersPOST} from "../app/api/chapters/route";
import {GET as contextGET,POST as mutate} from "../app/api/curriculum/route";
beforeAll(()=>runMigrations(db));
beforeEach(()=>{
  db.exec(`BEGIN;
    INSERT INTO academic_years(id,name,semester,is_active) VALUES(1,'2026/2027','Ganjil',1),(2,'2026/2027','Genap',0),(3,'2027/2028','Ganjil',0);
    INSERT INTO curriculum_templates(id,academic_year_id,name) VALUES(1,1,'Materi Ganjil'),(2,1,'Materi Genap');
    INSERT INTO chapters(id,template_id,title,display_order) VALUES(1,1,'Bab A',0),(2,2,'Bab B',0);
    INSERT INTO subchapters(id,chapter_id,title,display_order) VALUES(1,1,'Sub A',0),(2,1,'Sub B',1),(3,2,'Sub C',0);
    INSERT INTO assessments(id,subchapter_id,title,description,weight,display_order,is_active) VALUES(1,1,'Materi A','Pedoman A',1,0,1),(2,1,'Materi B','Pedoman B',2,1,1),(3,2,'Arsip','Tidak disalin',1,0,0);
    INSERT INTO classes(id,academic_year_id,name) VALUES(1,1,'VIII A');
    INSERT INTO students(id,class_id,name) VALUES(1,1,'Siswa A');
    INSERT INTO scores(student_id,assessment_id,score,mistakes) VALUES(1,1,90,0),(1,2,60,30);
  `);
});
afterEach(()=>db.exec("ROLLBACK"));
afterAll(()=>db.close());
it("shows all chapters of a period and flags mismatched legacy template without moving records",()=>{
  const c=curriculumContext(db,{yearId:1});
  expect(c.period.semester).toBe("Ganjil");
  expect(c.items).toHaveLength(2);
  expect(c.items[0]).toMatchObject({subchapter_count:2,material_count:2,legacy_mismatch:false});
  expect(c.items[1].legacy_mismatch).toBe(true);
  expect(c.warnings).toHaveLength(1);
  expect(curriculumContext(db,{yearId:2}).items).toEqual([]);
});
it("derives context from ancestors and rejects incorrect year or parent",()=>{
  expect(curriculumContext(db,{chapterId:1,subchapterId:1}).period.id).toBe(1);
  expect(()=>curriculumContext(db,{yearId:2,chapterId:1})).toThrow("periode");
  expect(()=>curriculumContext(db,{chapterId:2,subchapterId:1})).toThrow("Subbab");
  expect(()=>curriculumContext(db,{chapterId:999})).toThrow("Bab");
});
it("creates canonical period structures and rejects contradictory legacy semester",()=>{
  expect(()=>createChapter(db,{academicYearId:2,semester:"Ganjil",title:"Salah"})).toThrow("Semester");
  const id=createChapter(db,{academicYearId:2,title:"Bab Genap"});
  expect(curriculumContext(db,{chapterId:id}).period.semester).toBe("Genap");
  const sub=createSubchapter(db,{chapterId:id,title:"Sub baru"});
  createMaterial(db,{subchapterId:sub,title:"Materi baru",weight:.1,description:"Pedoman"});
  expect(curriculumContext(db,{chapterId:id,subchapterId:sub}).items[0].weight).toBe(.1);
});
it("validates edits, names, descriptions, and bounds consistently",()=>{
  expect(()=>createChapter(db,{academicYearId:1,title:" bab a "})).toThrow("Nama");
  expect(()=>editCurriculum(db,{kind:"chapters",id:2,title:"Bab A"})).toThrow("Nama");
  for(const weight of [0,.09,101])expect(()=>createMaterial(db,{subchapterId:1,title:"New",weight})).toThrow();
  expect(()=>editCurriculum(db,{kind:"assessments",id:1,title:"AA",description:"x".repeat(501)})).toThrow();
  editCurriculum(db,{kind:"subchapters",id:1,title:"Nama sub baru"});
  editCurriculum(db,{kind:"assessments",id:1,title:"Nama materi baru",description:"Pedoman diperbarui"});
  expect(curriculumContext(db,{chapterId:1,subchapterId:1}).items[0]).toMatchObject({title:"Nama materi baru",description:"Pedoman diperbarui",score_count:1});
});
it("requires explicit current usage count for weight changes and preserves score records",()=>{
  const before=db.prepare("SELECT * FROM scores ORDER BY id").all();
  expect(getRecap(db,{}).students[0].average).toBe(70);
  expect(()=>editCurriculum(db,{kind:"assessments",id:1,title:"Materi A",weight:2})).toThrow("1 nilai");
  expect(()=>editCurriculum(db,{kind:"assessments",id:1,title:"Materi A",weight:2,confirmedScoreCount:0})).toThrow();
  editCurriculum(db,{kind:"assessments",id:1,title:"Materi A",weight:2,confirmedScoreCount:1});
  expect(getRecap(db,{}).students[0].average).toBe(75);
  expect(db.prepare("SELECT * FROM scores ORDER BY id").all()).toEqual(before);
});
it("reorders across templates in one period, plus subchapters and materials, retaining IDs",()=>{
  moveCurriculum(db,{kind:"chapters",id:2,direction:"up"});
  expect(curriculumContext(db,{yearId:1}).items.map(x=>x.id)).toEqual([2,1]);
  moveCurriculum(db,{kind:"subchapters",id:2,direction:"up"});
  expect(curriculumContext(db,{chapterId:1}).items.map(x=>x.id)).toEqual([2,1]);
  moveCurriculum(db,{kind:"assessments",id:2,direction:"up"});
  expect(curriculumContext(db,{chapterId:1,subchapterId:1}).items.map(x=>x.id)).toEqual([2,1]);
});
it("previews and copies active structure, descriptions and weights but never scores",()=>{
  expect(previewCopy(db,{sourceId:1,targetId:2})).toEqual({chapters:2,subchapters:3,materials:2,conflicts:[],legacyCount:1});
  const before=db.prepare("SELECT count(*) n FROM scores").get();
  copyPeriod(db,{sourceId:1,targetId:2});
  const target=curriculumContext(db,{yearId:2});
  expect(target.items.map(x=>x.title)).toEqual(["Bab A","Bab B"]);
  expect(target.warnings).toEqual([]);
  const sub=curriculumContext(db,{chapterId:target.items[0].id}).items[0];
  expect(curriculumContext(db,{chapterId:target.items[0].id,subchapterId:sub.id}).items.map(x=>[x.description,x.weight,x.score_count])).toEqual([["Pedoman A",1,0],["Pedoman B",2,0]]);
  expect(db.prepare("SELECT count(*) n FROM scores").get()).toEqual(before);
});
it("blocks collisions and rechecks after preview without partial writes",()=>{
  previewCopy(db,{sourceId:1,targetId:2});
  createChapter(db,{academicYearId:2,title:"bab b"});
  const before=db.prepare("SELECT count(*) n FROM chapters").get();
  expect(previewCopy(db,{sourceId:1,targetId:2}).conflicts).toEqual(["Bab B"]);
  expect(()=>copyPeriod(db,{sourceId:1,targetId:2})).toThrow("bertabrakan");
  expect(db.prepare("SELECT count(*) n FROM chapters").get()).toEqual(before);
});
it("rolls back all inserted templates and descendants if a later insert fails",()=>{
  db.exec("CREATE TEMP TRIGGER fail_copy BEFORE INSERT ON subchapters WHEN NEW.title='Sub C' BEGIN SELECT RAISE(ABORT,'forced'); END");
  const before=db.prepare("SELECT count(*) n FROM curriculum_templates").get();
  try{expect(()=>copyPeriod(db,{sourceId:1,targetId:2})).toThrow("forced");
    expect(curriculumContext(db,{yearId:2}).items).toEqual([]);
    expect(db.prepare("SELECT count(*) n FROM curriculum_templates").get()).toEqual(before);
  }finally{db.exec("DROP TRIGGER fail_copy")}
});
it("validates API queries, compatibility semester, and mutations",async()=>{
  const result=await chaptersGET(new Request("http://local/api/chapters?academicYearId=1&semester=Ganjil"));
  expect(await result.json()).toHaveLength(2);
  expect((await chaptersGET(new Request("http://local/api/chapters?academicYearId=1&semester=Genap"))).status).toBe(400);
  expect((await chaptersPOST(new Request("http://local/api/chapters",{method:"POST",body:JSON.stringify({academicYearId:1,semester:"Genap",title:"Rejected"})}))).status).toBe(400);
  expect((await contextGET(new Request("http://local/api/curriculum?chapterId=2&subchapterId=1"))).status).toBe(404);
  expect((await contextGET(new Request("http://local/api/curriculum?yearId=abc"))).status).toBe(400);
  expect((await mutate(new Request("http://local/api/curriculum",{method:"POST",body:JSON.stringify({action:"edit",kind:"assessments",id:1,title:"Materi A",weight:2})}))).status).toBe(409);
});
