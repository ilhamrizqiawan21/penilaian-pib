import Database from 'better-sqlite3';
import {expect,it} from 'vitest';
import {runMigrations} from './migrations';
import {getRecap} from './recap-query';
it('counts only material from each student academic period, including cleared and zero scores',()=>{
 const db=new Database(':memory:');
 try{
  runMigrations(db);
  for(const id of [1,2]){
   db.prepare('INSERT INTO academic_years(id,name,semester) VALUES(?,?,?)').run(id,'Year '+id,'Ganjil');
   db.prepare('INSERT INTO classes(id,academic_year_id,name) VALUES(?,?,?)').run(id,id,'Class '+id);
   db.prepare('INSERT INTO students(id,class_id,name) VALUES(?,?,?)').run(id,id,'Student '+id);
   db.prepare('INSERT INTO curriculum_templates(id,academic_year_id,name) VALUES(?,?,?)').run(id,id,'Template');
   db.prepare('INSERT INTO chapters(id,template_id,title) VALUES(?,?,?)').run(id,id,'Chapter');
   db.prepare('INSERT INTO subchapters(id,chapter_id,title) VALUES(?,?,?)').run(id,id,'Sub');
   db.prepare('INSERT INTO assessments(id,subchapter_id,title) VALUES(?,?,?)').run(id,id,'Material');
  }
  db.exec('INSERT INTO scores(student_id,assessment_id,score,mistakes) VALUES(1,1,0,90),(2,2,NULL,NULL)');
  expect(getRecap(db,{}).students).toEqual([
   expect.objectContaining({id:1,expected:1,assessed:1,average:0}),
   expect.objectContaining({id:2,expected:1,assessed:0,average:null}),
  ]);
  expect(getRecap(db,{classId:1,assessmentId:2}).students).toEqual([]);
 }finally{db.close()}
});
