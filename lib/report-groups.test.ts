import { describe, expect, it } from "vitest";
import { averageStats, groupAverageRows } from "./report-groups";

describe("report groups", () => {
  it("menggabungkan beberapa subbab/materi menjadi rata-rata per siswa dalam Bab", () => {
    const groups = groupAverageRows([
      { nis: "1", name: "Ani", gender: "P", class_name: "VIII-A", chapter: "Sholat", subchapter: "A", assessment: "Materi A", score: 90 },
      { nis: "1", name: "Ani", gender: "P", class_name: "VIII-A", chapter: "Sholat", subchapter: "B", assessment: "Materi B", score: 80 },
      { nis: "2", name: "Budi", gender: "L", class_name: "VIII-A", chapter: "Sholat", subchapter: "A", assessment: "Materi A", score: 70 },
      { nis: "2", name: "Budi", gender: "L", class_name: "VIII-A", chapter: "Sholat", subchapter: "B", assessment: "Materi B", score: null },
    ]);

    const rows = groups[0].classes[0].rows;
    expect(rows).toEqual([
      expect.objectContaining({ name: "Ani", average: 85, assessed: 2, totalItems: 2, status: "Dinilai" }),
      expect.objectContaining({ name: "Budi", average: 70, assessed: 1, totalItems: 2, status: "Sebagian dinilai" }),
    ]);
    expect(averageStats(rows)).toEqual({ scored: 2, total: 155, average: 77.5 });
  });

  it("menandai siswa tanpa nilai sebagai belum dinilai", () => {
    const groups = groupAverageRows([{ name: "Cici", gender: "P", class_name: "VIII-A", chapter: "Wudhu", score: null }]);
    expect(groups[0].classes[0].rows[0]).toMatchObject({ average: null, status: "Belum dinilai" });
    expect(averageStats(groups[0].classes[0].rows)).toEqual({ scored: 0, total: 0, average: null });
  });
});

it("keeps same-name students separate and uses material weights",()=>{
 const groups=groupAverageRows([
  {student_id:1,name:"Ani",class_name:"VII A",chapter:"Bab",score:90,weight:1},
  {student_id:1,name:"Ani",class_name:"VII A",chapter:"Bab",score:60,weight:2},
  {student_id:2,name:"Ani",class_name:"VII A",chapter:"Bab",score:80,weight:1},
 ]);
 expect(groups[0].classes[0].rows.map(r=>r.average)).toEqual([70,80]);
});
it("separates identically named classes across periods",()=>{
 const groups=groupAverageRows([1,2].map(id=>({student_id:id,name:"Ani",class_name:"VII A",academic_year_name:"2026/2027",semester:id===1?"Ganjil":"Genap",chapter:"Bab",score:90})));
 expect(groups[0].classes).toHaveLength(2);
});
