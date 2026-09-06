import {summarizeRecap,recapStatus} from "@/lib/recap-data";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { reportRows, reportScope } from "@/lib/report-query";
import { averageStats, groupAverageRows, type ReportRow } from "@/lib/report-groups";

const green = "FF176B57";
const softGreen = "FFEAF5F1";
const stripe = "FFF7FAF8";
const line = "FFDCE3DF";
const muted = "FF657186";

function settings() {
  const rows = db.prepare("SELECT key,value FROM settings").all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((row) => [row.key, row.value])) as Record<string, string>;
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 28;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: green } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: line } } };
  });
}

function mergedBand(sheet: ExcelJS.Worksheet, label: string, columns: number, fill: string, color: string, size = 11) {
  const row = sheet.addRow([label]);
  sheet.mergeCells(row.number, 1, row.number, columns);
  for (let column = 1; column <= columns; column += 1) {
    const cell = sheet.getCell(row.number, column);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    cell.font = { bold: true, size, color: { argb: color } };
    cell.alignment = { vertical: "middle", wrapText: true };
  }
  row.height = size > 11 ? 26 : 22;
  return row;
}

function baseSheet(sheet: ExcelJS.Worksheet, title: string, subtitle: string, columns: number) {
  sheet.mergeCells(1, 1, 1, columns);
  sheet.getCell(1, 1).value = title;
  sheet.getCell(1, 1).font = { bold: true, size: 16, color: { argb: green } };
  sheet.getCell(1, 1).alignment = { vertical: "middle" };
  sheet.getRow(1).height = 28;
  sheet.mergeCells(2, 1, 2, columns);
  sheet.getCell(2, 1).value = subtitle;
  sheet.getCell(2, 1).font = { size: 10, color: { argb: muted } };
  sheet.getCell(2, 1).alignment = { wrapText: true, vertical: "middle" };
  sheet.getRow(2).height = 30;
  sheet.views = [{ state: "frozen", ySplit: 4 }];
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

function finishSheet(sheet: ExcelJS.Worksheet) {
  sheet.eachRow((row, index) => {
    if (index > 4) {
      row.eachCell((cell) => {
        cell.border = { bottom: { style: "hair", color: { argb: line } } };
      });
    }
  });
  sheet.headerFooter.oddFooter = "PIB Penilaian - Halaman &P dari &N | &D";
}

export async function GET(req: Request) {
  const rows = reportRows(req);
  const recap = summarizeRecap(rows);
  const groups = groupAverageRows(rows);
  const info = settings();
  const school = info.schoolName || "PIB Penilaian";
  const subtitle = `${school} | ${reportScope(req)} | Dibuat ${new Date().toLocaleString("id-ID")}`;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PIB Penilaian";
  workbook.created = new Date();

  const averagedRows = groups.flatMap((group) => group.classes.flatMap((classGroup) => classGroup.rows));
  const overall = averageStats(averagedRows);
  const summary = workbook.addWorksheet("Ringkasan", { properties: { tabColor: { argb: green } } });
  baseSheet(summary, "Ringkasan Laporan Penilaian", subtitle, 4);
  summary.addRow([]);
  const summaryHeader = summary.addRow(["Indikator", "Hasil", "Keterangan", ""]);
  styleHeader(summaryHeader);
  [
    ["Data penilaian", rows.filter(row=>row.assessment_id!==null).length, "Data mentah dari subbab/materi"],
    ["Bab/Materi", new Set(rows.filter(r=>r.chapter_id!==null).map(r=>r.chapter_id)).size, "Bab dalam cakupan"],
    ["Siswa", recap.students.length, "Siswa aktif"],
    ["Kelas", recap.classes.length, "Kelas aktif"],
    ["Sudah dinilai", overall.scored, "Nilai tercatat"],
    ["Belum dinilai", rows.filter(row=>row.assessment_id!==null).length - overall.scored, "Nilai kosong tidak dianggap nol"],
    ["Jumlah nilai", overall.total, "Total dari nilai yang sudah tercatat"],
    ["Rata-rata berbobot", overall.average == null ? "-" : overall.average, "Berbobot; hanya nilai terisi"],
  ].forEach((values, index) => {
    const row = summary.addRow([...values, ""]);
    row.height = 22;
    row.getCell(1).font = { bold: true, color: { argb: "FF17202D" } };
    row.getCell(2).font = { bold: true, color: { argb: green } };
    row.getCell(3).font = { color: { argb: muted } };
    row.alignment = { vertical: "middle" };
    if (index % 2 === 1) row.eachCell((cell) => (cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stripe } }));
  });
  summary.addRow([]);
  const note = summary.addRow(["Catatan", "Nilai kosong tetap berstatus belum dinilai dan tidak dihitung sebagai nol.", "", ""]);
  note.getCell(1).font = { bold: true, color: { argb: green } };
  note.getCell(2).font = { italic: true, color: { argb: muted } };
  note.getCell(2).alignment = { wrapText: true };
  summary.columns = [{ width: 24 }, { width: 20 }, { width: 36 }, { width: 4 }];
  finishSheet(summary);

  const report = workbook.addWorksheet("Laporan per Materi", { properties: { tabColor: { argb: green } } });
  baseSheet(report, "Laporan Nilai per Bab/Materi", subtitle, 5);
  report.addRow(["Rata-rata berbobot dari nilai terisi. Status sebagian berarti hasil belum lengkap.", "", "", "", ""]);
  report.mergeCells(4, 1, 4, 5);
  report.getCell(4, 1).font = { italic: true, color: { argb: muted } };
  report.getCell(4, 1).alignment = { wrapText: true };
  report.getRow(4).height = 22;
  for (const material of groups) {
    mergedBand(report, `BAB/MATERI: ${material.label}`, 5, green, "FFFFFFFF", 12);
    for (const classGroup of material.classes) {
      mergedBand(report, `KELAS: ${classGroup.name}`, 5, softGreen, green, 11);
      styleHeader(report.addRow(["No", "Nama siswa", "JK", "Nilai", "Status"]));
      classGroup.rows.forEach((row, index) => {
        const added = report.addRow([index + 1, row.name, row.gender || "-", row.average ?? "", row.status]);
        added.height = 21;
        added.alignment = { vertical: "middle", wrapText: true };
        if (index % 2 === 1) added.eachCell((cell) => (cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stripe } }));
      });
      const classStats = averageStats(classGroup.rows);
      const totalRow = report.addRow(["", "Ringkasan kelas", "", classStats.total, `Rata-rata: ${classStats.average ?? "-"}`]);
      totalRow.getCell(2).font = { bold: true, color: { argb: green } };
      totalRow.getCell(4).font = { bold: true, color: { argb: green } };
      totalRow.getCell(5).font = { italic: true, color: { argb: muted } };
      totalRow.height = 22;
      report.addRow([]);
    }
  }
  mergedBand(report, "RINGKASAN AKHIR LAPORAN", 5, green, "FFFFFFFF", 12);
  const finalRows = [
    ["Jumlah data penilaian", rows.filter(row=>row.assessment_id!==null).length],
    ["Sudah dinilai", overall.scored],
    ["Belum dinilai", rows.filter(row=>row.assessment_id!==null).length - overall.scored],
    ["Jumlah nilai", overall.total],
    ["Rata-rata berbobot", overall.average ?? "-"],
  ];
  finalRows.forEach(([label, value], index) => {
    const row = report.addRow([label, value, "", "", ""]);
    row.height = 22;
    row.getCell(1).font = { bold: true, color: { argb: "FF17202D" } };
    row.getCell(2).font = { bold: true, color: { argb: green } };
    if (index % 2 === 1) row.eachCell((cell) => (cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stripe } }));
  });
  report.columns = [{ width: 8 }, { width: 30 }, { width: 10 }, { width: 14 }, { width: 20 }];
  finishSheet(report);

  const detail = workbook.addWorksheet("Detail Nilai", { properties: { tabColor: { argb: green } } });
  baseSheet(detail, "Laporan Detail Nilai", subtitle, 14);
  detail.addRow([]);
  styleHeader(detail.addRow(["NIS", "Nama", "JK", "Kelas", "Bab", "Subbab", "Materi", "Bobot", "Nilai", "Kesalahan", "Status", "Tanggal", "Paraf", "Keterangan"]));
  rows.forEach((row, index) => {
    const added = detail.addRow([row.nis ?? "", row.name, row.gender || "-", row.class_name, row.chapter, row.subchapter, row.assessment, row.weight, row.score ?? "", row.mistakes ?? "", row.status, row.assessed_at ?? "", row.initials ?? "", row.note ?? ""]);
    added.height = 22;
    added.alignment = { vertical: "top", wrapText: true };
    if (index % 2 === 1) added.eachCell((cell) => (cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stripe } }));
  });
  detail.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(4, detail.rowCount), column: 14 } };
  detail.columns = [14, 25, 8, 17, 20, 20, 28, 10, 10, 12, 16, 20, 12, 36].map((width) => ({ width }));
  detail.getColumn(8).numFmt = "0.0";
  detail.getColumn(9).numFmt = "0";
  detail.getColumn(10).numFmt = "0";
  finishSheet(detail);
  detail.state = "hidden";

  const student = workbook.addWorksheet("Rekap Siswa", { properties: { tabColor: { argb: "FF5B8C7A" } } });
  baseSheet(student, "Rekap Nilai per Siswa", subtitle, 6);
  student.addRow([]);
  styleHeader(student.addRow(["Nama", "Kelas / periode", "Dinilai / diharapkan", "Total nilai", "Rata-rata berbobot", "Kelengkapan"]));
  recap.students.forEach((item,index)=>{
    const row=student.addRow([item.name,[item.class_name,item.academic_year_name,item.semester].join(" · "),item.assessed+" / "+item.expected,item.total,item.average,recapStatus(item.expected,item.assessed)]);
    if(index%2===1)row.eachCell(cell=>(cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:stripe}}));
  });
  student.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(4, student.rowCount), column: 6 } };
  student.columns = [28, 32, 20, 16, 22, 26].map((width) => ({ width }));
  student.getColumn(4).numFmt = "0";
  student.getColumn(5).numFmt = "0.0";
  finishSheet(student);

  const classes = workbook.addWorksheet("Rekap Kelas", { properties: { tabColor: { argb: "FF5B8C7A" } } });
  baseSheet(classes, "Rekap Nilai per Kelas", subtitle, 5);
  classes.addRow([]);
  styleHeader(classes.addRow(["Kelas / periode", "Jumlah siswa", "Dinilai / diharapkan", "Rata-rata berbobot", "Kelengkapan"]));
  recap.classes.forEach((item,index)=>{
    const row=classes.addRow([[item.class_name,item.academic_year_name,item.semester].join(" · "),item.students,item.assessed+" / "+item.expected,item.average,recapStatus(item.expected,item.assessed)]);
    if(index%2===1)row.eachCell(cell=>(cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:stripe}}));
  });
  classes.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(4, classes.rowCount), column: 5 } };
  classes.columns = [32, 18, 22, 22, 26].map((width) => ({ width }));
  classes.getColumn(4).numFmt = "0.0";
  finishSheet(classes);

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=laporan-pib.xlsx",
      "Cache-Control": "no-store",
    },
  });
}
