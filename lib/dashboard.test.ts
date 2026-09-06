import Database from "better-sqlite3";
import {expect,it} from "vitest";
import {runMigrations} from "./migrations";
import {dashboardProgress,getDashboardClasses} from "./dashboard";

it("counts active students and period-matched materials, retaining zero and excluding cleared scores",()=>{
  const db=new Database(":memory:");
  try{
    runMigrations(db);
    for(const id of [1,2]){
      db.prepare("INSERT INTO academic_years(id,name,semester) VALUES(?,?,?)").run(id,"Year "+id,"Ganjil");
      db.prepare("INSERT INTO classes(id,academic_year_id,name) VALUES(?,?,?)").run(id,id,"Kelas A");
      db.prepare("INSERT INTO students(id,class_id,name) VALUES(?,?,?)").run(id,id,"Student "+id);
      db.prepare("INSERT INTO curriculum_templates(id,academic_year_id,name) VALUES(?,?,?)").run(id,id,"Template");
      db.prepare("INSERT INTO chapters(id,template_id,title) VALUES(?,?,?)").run(id,id,"Chapter");
      db.prepare("INSERT INTO subchapters(id,chapter_id,title) VALUES(?,?,?)").run(id,id,"Sub");
      db.prepare("INSERT INTO assessments(id,subchapter_id,title) VALUES(?,?,?)").run(id,id,"Material");
    }
    db.exec(`
      INSERT INTO assessments(id,subchapter_id,title,is_active) VALUES(3,1,'Inactive',0),(4,1,'Second',1);
      INSERT INTO students(id,class_id,name,is_active) VALUES(3,1,'Inactive',0);
      INSERT INTO scores(student_id,assessment_id,score) VALUES(1,1,0),(1,2,90),(1,3,90),(1,4,NULL),(2,2,NULL),(3,1,90);
      INSERT INTO classes(id,academic_year_id,name,is_active) VALUES(3,1,'Empty',1),(4,1,'Inactive',0);
      INSERT INTO academic_years(id,name,semester) VALUES(3,'No materials','Ganjil');
      INSERT INTO classes(id,academic_year_id,name) VALUES(5,3,'Unprepared');
      INSERT INTO students(class_id,name) VALUES(5,'New');
    `);
    const rows=getDashboardClasses(db);
    expect(rows).toHaveLength(4);
    expect(rows.find(c=>c.id===1)).toMatchObject({students:1,materials:2,assessed:1,total:2});
    expect(rows.find(c=>c.id===2)).toMatchObject({students:1,materials:1,assessed:0,total:1});
    expect(rows.find(c=>c.id===3)).toMatchObject({students:0,total:0});
    expect(rows.find(c=>c.id===5)).toMatchObject({students:1,materials:0,total:0});
    expect(getDashboardClasses(db,2).map(c=>c.id)).toEqual([2]);
    expect(getDashboardClasses(db,999)).toEqual([]);
  }finally{db.close()}
});

it("reserves 100 percent and completion for fully assessed work",()=>{
  expect(dashboardProgress(1000,999)).toEqual({percent:99,complete:false});
  expect(dashboardProgress(1000,1000)).toEqual({percent:100,complete:true});
  expect(dashboardProgress(0,0)).toEqual({percent:0,complete:false});
});
