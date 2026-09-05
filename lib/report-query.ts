import { db } from "@/lib/db";
import { recapFilter, sqlFilter } from "@/lib/filters";
export function reportRows(req: Request) {
  const filter = recapFilter.parse(Object.fromEntries(new URL(req.url).searchParams));
  const f = sqlFilter(filter);
  return db.prepare(
    "SELECT s.id student_id,c.id class_id,s.nis,s.name,s.gender,c.name class_name,y.name academic_year_name,y.semester,ch.title chapter,sub.title subchapter,a.title assessment,a.weight,sc.score,sc.mistakes,sc.assessed_at,sc.initials,sc.note,CASE WHEN sc.score IS NULL THEN 'Belum dinilai' ELSE 'Dinilai' END status FROM students s JOIN classes c ON c.id=s.class_id JOIN academic_years y ON y.id=c.academic_year_id CROSS JOIN assessments a JOIN subchapters sub ON sub.id=a.subchapter_id JOIN chapters ch ON ch.id=sub.chapter_id JOIN curriculum_templates ct ON ct.id=ch.template_id AND ct.academic_year_id=c.academic_year_id LEFT JOIN scores sc ON sc.student_id=s.id AND sc.assessment_id=a.id WHERE s.is_active=1 AND c.is_active=1 AND a.is_active=1" + f.where + " ORDER BY c.name,s.name,ch.display_order,sub.display_order,a.display_order",
  ).all(...f.args) as Record<string, unknown>[];
}
