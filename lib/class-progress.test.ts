import Database from "better-sqlite3";
import {describe,expect,it} from "vitest";
import {runMigrations} from "./migrations";
import {getClassProgress,isSameLocalDay,studentPosition} from "./class-progress";

describe("studentPosition",()=>{
  const ids=[1,2,3,4,5,6];
  const scored=(...done:number[])=>(id:number)=>done.includes(id);
  it("starts at the first material for a new student",()=>{
    expect(studentPosition(ids,scored())).toEqual({assessed:0,total:6,lastIndex:-1,nextIndex:0,gaps:[]});
  });
  it("targets the material after the furthest score and reports skipped ones as gaps",()=>{
    expect(studentPosition(ids,scored(1,2,4,5))).toMatchObject({assessed:4,lastIndex:4,nextIndex:5,gaps:[2]});
  });
  it("falls back to the first gap once the end is reached, then -1 when complete",()=>{
    expect(studentPosition(ids,scored(1,3,4,5,6))).toMatchObject({nextIndex:1,gaps:[1]});
    expect(studentPosition(ids,scored(...ids))).toMatchObject({assessed:6,nextIndex:-1,gaps:[]});
  });
  it("handles an empty curriculum",()=>{
    expect(studentPosition([],scored())).toEqual({assessed:0,total:0,lastIndex:-1,nextIndex:-1,gaps:[]});
  });
});

it("compares assessment dates by local day",()=>{
  const now=new Date(2026,8,29,10);
  expect(isSameLocalDay(new Date(2026,8,29,1).toISOString(),now)).toBe(true);
  expect(isSameLocalDay(new Date(2026,8,28,23).toISOString(),now)).toBe(false);
  expect(isSameLocalDay(null,now)).toBe(false);
  expect(isSameLocalDay("bukan tanggal",now)).toBe(false);
});

it("loads period materials in curriculum order with active students and versioned score rows",()=>{
  const db=new Database(":memory:");
  try{
    runMigrations(db);
    db.exec(`
      INSERT INTO academic_years(id,name,semester) VALUES(1,'2026','Ganjil'),(2,'2025','Ganjil');
      INSERT INTO classes(id,academic_year_id,name) VALUES(1,1,'VIII-A'),(2,1,'VIII-B');
      INSERT INTO students(id,class_id,name,is_active) VALUES(1,1,'Budi',1),(2,1,'Ani',1),(3,1,'Keluar',0),(4,2,'Lain',1);
      INSERT INTO curriculum_templates(id,academic_year_id,name) VALUES(1,1,'Ganjil'),(2,2,'Lama');
      INSERT INTO chapters(id,template_id,title,display_order) VALUES(1,1,'Bab 2',2),(2,1,'Bab 1',1),(3,2,'Lama',1);
      INSERT INTO subchapters(id,chapter_id,title,display_order) VALUES(1,1,'Sub 2A',1),(2,2,'Sub 1B',2),(3,2,'Sub 1A',1),(4,3,'Lama',1);
      INSERT INTO assessments(id,subchapter_id,title,display_order,is_active) VALUES(1,1,'M 2A',1,1),(2,2,'M 1B',1,1),(3,3,'M 1A-2',2,1),(4,3,'M 1A-1',1,1),(5,3,'Nonaktif',3,0),(6,4,'Lama',1,1);
      INSERT INTO scores(student_id,assessment_id,mistakes,score,updated_at) VALUES(1,4,2,88,'v1'),(1,3,NULL,NULL,'v2'),(3,4,0,90,'v3'),(4,4,0,90,'v4');
    `);
    const result=getClassProgress(db,1)!;
    expect(result.className).toBe("VIII-A");
    expect(result.materials.map(m=>m.title)).toEqual(["M 1A-1","M 1A-2","M 1B","M 2A"]);
    expect(result.students.map(s=>s.name)).toEqual(["Ani","Budi"]);
    expect(result.scores).toHaveLength(2);
    expect(result.scores).toEqual(expect.arrayContaining([expect.objectContaining({student_id:1,assessment_id:4,score:88,updated_at:"v1"}),expect.objectContaining({student_id:1,assessment_id:3,score:null,updated_at:"v2"})]));
    expect(getClassProgress(db,99)).toBeNull();
  }finally{db.close()}
});
