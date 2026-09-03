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
