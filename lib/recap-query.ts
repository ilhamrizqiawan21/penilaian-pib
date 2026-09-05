import type Database from "better-sqlite3";
import {RecapFilter,sqlFilter} from "./filters";
export function getRecap(database:Database.Database,filter:RecapFilter){
  const f=sqlFilter(filter);
  const from=" FROM students s JOIN classes c ON c.id=s.class_id CROSS JOIN assessments a JOIN subchapters sub ON sub.id=a.subchapter_id JOIN chapters ch ON ch.id=sub.chapter_id JOIN curriculum_templates ct ON ct.id=ch.template_id AND ct.academic_year_id=c.academic_year_id LEFT JOIN scores sc ON sc.student_id=s.id AND sc.assessment_id=a.id WHERE s.is_active=1 AND c.is_active=1 AND a.is_active=1"+f.where;
  const average="ROUND(SUM(sc.score*a.weight)/NULLIF(SUM(CASE WHEN sc.score IS NOT NULL THEN a.weight ELSE 0 END),0),1)";
  const students=database.prepare("SELECT s.id,s.name,s.nis,c.name class_name,COUNT(sc.score) assessed,COUNT(a.id) expected,COALESCE(SUM(sc.score),0) total,"+average+" average"+from+" GROUP BY s.id ORDER BY c.name,s.name").all(...f.args);
  const classes=database.prepare("SELECT c.id,c.name class_name,COUNT(DISTINCT s.id) students,COUNT(sc.score) assessed,COUNT(a.id) expected,"+average+" average"+from+" GROUP BY c.id ORDER BY c.name").all(...f.args);
  const subchapters=database.prepare("SELECT sub.id,ch.title chapter,sub.title subchapter,COUNT(a.id) expected,COUNT(sc.score) assessed"+from+" GROUP BY sub.id ORDER BY ch.display_order,sub.display_order").all(...f.args);
  return {students,classes,subchapters};
}
