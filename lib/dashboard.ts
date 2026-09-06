import type Database from "better-sqlite3";

export type ClassProgress = {
  id: number; name: string; academic_year_id: number; period: string;
  assessed: number; total: number; students: number; materials: number;
};

export function getDashboardClasses(db: Database.Database, academicYearId?: number) {
  // Aggregate students separately so stored scores do not multiply student counts.
  return db.prepare(`
    WITH materials AS (
      SELECT a.id, ct.academic_year_id
      FROM assessments a JOIN subchapters sub ON sub.id=a.subchapter_id
      JOIN chapters ch ON ch.id=sub.chapter_id
      JOIN curriculum_templates ct ON ct.id=ch.template_id
      WHERE a.is_active=1
    ), material_counts AS (
      SELECT academic_year_id, COUNT(*) total FROM materials GROUP BY academic_year_id
    ), student_counts AS (
      SELECT class_id, COUNT(*) total FROM students WHERE is_active=1 GROUP BY class_id
    ), score_counts AS (
      SELECT st.class_id, COUNT(sc.score) total FROM students st
      JOIN classes c ON c.id=st.class_id
      JOIN scores sc ON sc.student_id=st.id
      JOIN materials m ON m.id=sc.assessment_id AND m.academic_year_id=c.academic_year_id
      WHERE st.is_active=1 AND c.is_active=1 GROUP BY st.class_id
    )
    SELECT c.id,c.name,c.academic_year_id,y.name || ' · ' || y.semester period,
      COALESCE(st.total,0) students, COALESCE(sc.total,0) assessed,
      COALESCE(m.total,0) materials, COALESCE(st.total,0)*COALESCE(m.total,0) total
    FROM classes c JOIN academic_years y ON y.id=c.academic_year_id
    LEFT JOIN student_counts st ON st.class_id=c.id
    LEFT JOIN score_counts sc ON sc.class_id=c.id
    LEFT JOIN material_counts m ON m.academic_year_id=c.academic_year_id
    WHERE c.is_active=1 ${academicYearId === undefined ? "" : "AND c.academic_year_id=?"}
    ORDER BY c.name,c.academic_year_id DESC,c.id
  `).all(...(academicYearId === undefined ? [] : [academicYearId])) as ClassProgress[];
}

export function dashboardProgress(total: number, assessed: number) {
  return {
    complete: total > 0 && assessed === total,
    // Reserve 100% for completed work even when only one value is missing.
    percent: total > 0 ? Math.min(assessed < total ? 99 : 100, Math.round(assessed / total * 100)) : 0,
  };
}
