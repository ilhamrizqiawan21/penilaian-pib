import type Database from "better-sqlite3";
import {RecapFilter,sqlFilter} from "./filters";
import type {RecapDetail} from "./recap-data";
export function getRecapRows(database:Database.Database,filter:RecapFilter,studentId?:number):RecapDetail[]{
  const f=sqlFilter(filter);
  return database.prepare(`
    WITH material AS (
      SELECT a.id,a.title,a.weight,a.display_order,ct.academic_year_id,
        sub.id subchapter_id,sub.display_order sub_order,
        ch.id chapter_id,ch.display_order chapter_order
      FROM assessments a JOIN subchapters sub ON sub.id=a.subchapter_id
      JOIN chapters ch ON ch.id=sub.chapter_id JOIN curriculum_templates ct ON ct.id=ch.template_id
      WHERE a.is_active=1
    )
    SELECT s.id student_id,c.id class_id,s.name,s.nis,s.gender,c.name class_name,
      y.name academic_year_name,y.semester,a.id assessment_id,a.chapter_id,a.subchapter_id,
      ch.title chapter,sub.title subchapter,a.title assessment,a.weight,
      sc.score,sc.mistakes,sc.assessed_at,sc.initials,sc.note,
      CASE WHEN a.id IS NULL THEN 'Materi belum tersedia' WHEN sc.score IS NULL THEN 'Belum dinilai' ELSE 'Dinilai' END status
    FROM students s JOIN classes c ON c.id=s.class_id JOIN academic_years y ON y.id=c.academic_year_id
    LEFT JOIN material a ON a.academic_year_id=c.academic_year_id
    LEFT JOIN chapters ch ON ch.id=a.chapter_id LEFT JOIN subchapters sub ON sub.id=a.subchapter_id
    LEFT JOIN scores sc ON sc.student_id=s.id AND sc.assessment_id=a.id
    WHERE s.is_active=1 AND c.is_active=1`+f.where+(studentId?" AND s.id=?":"")+
    " ORDER BY y.name,y.semester,c.name,s.name,a.chapter_order,a.sub_order,a.display_order"
  ).all(...f.args,...(studentId?[studentId]:[])) as RecapDetail[];
}
