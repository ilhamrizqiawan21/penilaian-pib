export type ReportRow = Record<string, any>;

export type AveragedRow = {
  nis: string;
  name: string;
  gender: string;
  className: string;
  chapter: string;
  average: number | null;
  weightedTotal: number;
  scoredWeight: number;
  rawTotal: number;
  assessed: number;
  totalItems: number;
  status: "Dinilai" | "Sebagian dinilai" | "Belum dinilai" | "Materi belum tersedia";
};

export type ClassGroup = { name: string; rows: AveragedRow[] };
export type ChapterGroup = { label: string; classes: ClassGroup[] };

function rounded(value: number) {
  return Math.round(value * 10) / 10;
}

export function groupAverageRows(rows: ReportRow[]): ChapterGroup[] {
  const chapters = new Map<string, Map<string, Map<string, ReportRow[]>>>();
  for (const row of rows) {
    const chapter = String(row.chapter ?? "Materi belum tersedia");
    const className = [row.class_name,row.academic_year_name,row.semester].filter(Boolean).join(" · ");
    const studentKey = String(row.student_id ?? row.nis ?? row.name);
    const classes = chapters.get(chapter) ?? new Map<string, Map<string, ReportRow[]>>();
    const students = classes.get(className) ?? new Map<string, ReportRow[]>();
    const studentRows = students.get(studentKey) ?? [];
    studentRows.push(row);
    students.set(studentKey, studentRows);
    classes.set(className, students);
    chapters.set(chapter, classes);
  }

  return Array.from(chapters, ([label, classes]) => ({
    label,
    classes: Array.from(classes, ([name, students]) => ({
      name,
      rows: Array.from(students.values(), (studentRows) => {
        const first = studentRows[0];
        const available = studentRows.filter(row=>row.assessment_id!==null);
        const scored = available.filter((row) => row.score != null);
        const total = scored.reduce((sum, row) => sum + Number(row.score) * Number(row.weight ?? 1), 0);
        const weight = scored.reduce((sum, row) => sum + Number(row.weight ?? 1), 0);
        const status: AveragedRow["status"] = available.length === 0 ? "Materi belum tersedia" : scored.length === 0 ? "Belum dinilai" : scored.length === available.length ? "Dinilai" : "Sebagian dinilai";
        return {
          nis: String(first.nis ?? ""),
          name: String(first.name),
          gender: String(first.gender || "-"),
          className: String(first.class_name),
          chapter: label,
          average: weight ? rounded(total / weight) : null,
          weightedTotal: total, scoredWeight: weight, rawTotal: scored.reduce((n,row)=>n+Number(row.score),0),
          assessed: scored.length,
          totalItems: available.length,
          status,
        };
      }).sort((a, b) => a.name.localeCompare(b.name, "id")),
    })).sort((a, b) => a.name.localeCompare(b.name, "id")),
  })).sort((a, b) => a.label.localeCompare(b.label, "id"));
}

export function averageStats(rows: AveragedRow[]) {
  const scored = rows.filter((row) => row.average != null);
  const total = scored.reduce((sum,row)=>sum+row.rawTotal,0);
  const weight=scored.reduce((sum,row)=>sum+row.scoredWeight,0);
  return {scored:scored.reduce((sum,row)=>sum+row.assessed,0),total:rounded(total),average:weight?rounded(scored.reduce((sum,row)=>sum+row.weightedTotal,0)/weight):null};
}
