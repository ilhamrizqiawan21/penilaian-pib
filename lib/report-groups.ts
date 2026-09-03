export type ReportRow = Record<string, any>;

export type AveragedRow = {
  nis: string;
  name: string;
  gender: string;
  className: string;
  chapter: string;
  average: number | null;
  assessed: number;
  totalItems: number;
  status: "Dinilai" | "Sebagian dinilai" | "Belum dinilai";
};

export type ClassGroup = { name: string; rows: AveragedRow[] };
export type ChapterGroup = { label: string; classes: ClassGroup[] };

function rounded(value: number) {
  return Math.round(value * 10) / 10;
}

export function groupAverageRows(rows: ReportRow[]): ChapterGroup[] {
  const chapters = new Map<string, Map<string, Map<string, ReportRow[]>>>();
  for (const row of rows) {
    const chapter = String(row.chapter);
    const className = String(row.class_name);
    const studentKey = String(row.nis ?? row.name);
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
        const scored = studentRows.filter((row) => row.score != null);
        const total = scored.reduce((sum, row) => sum + Number(row.score), 0);
        const status: AveragedRow["status"] = scored.length === 0 ? "Belum dinilai" : scored.length === studentRows.length ? "Dinilai" : "Sebagian dinilai";
        return {
          nis: String(first.nis ?? ""),
          name: String(first.name),
          gender: String(first.gender || "-"),
          className: String(first.class_name),
          chapter: label,
          average: scored.length ? rounded(total / scored.length) : null,
          assessed: scored.length,
          totalItems: studentRows.length,
          status,
        };
      }).sort((a, b) => a.name.localeCompare(b.name, "id")),
    })).sort((a, b) => a.name.localeCompare(b.name, "id")),
  })).sort((a, b) => a.label.localeCompare(b.label, "id"));
}

export function averageStats(rows: AveragedRow[]) {
  const scored = rows.filter((row) => row.average != null);
  const total = scored.reduce((sum, row) => sum + Number(row.average), 0);
  return { scored: scored.length, total: rounded(total), average: scored.length ? rounded(total / scored.length) : null };
}
