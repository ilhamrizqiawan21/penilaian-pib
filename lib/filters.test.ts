import { describe, expect, it } from "vitest";
import { filterQuery, sqlFilter } from "./filters";

describe("kontrak filter laporan", () => {
  it("menghasilkan query kosong untuk dataset tanpa filter", () => {
    expect(filterQuery({})).toEqual(new URLSearchParams());
    expect(sqlFilter({}).args).toEqual([]);
  });
  it("memetakan seluruh filter ke parameter SQL", () => {
    const result = sqlFilter({ academicYearId: 1, classId: 2, student: "Ani", chapter: "Bab 1", subchapter: "Sub 1", assessmentId: 3 });
    expect(result.args).toEqual([1, 2, "%Ani%", "Bab 1", "Sub 1", 3]);
    expect(result.where).toContain("c.academic_year_id=?");
    expect(result.where).toContain("a.id=?");
  });
  it("mempertahankan teks panjang dan nilai nol", () => {
    const text = "Siswa ".padEnd(500, "x");
    expect(sqlFilter({ student: text }).args).toEqual([`%${text}%`]);
    expect(filterQuery({ classId: 0 as never })).toEqual(new URLSearchParams({ classId: "0" }));
  });
});
