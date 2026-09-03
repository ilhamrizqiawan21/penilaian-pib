import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { db } from "@/lib/db";
import { reportRows } from "@/lib/report-query";
import { averageStats, groupAverageRows, type AveragedRow, type ReportRow } from "@/lib/report-groups";

const green = [23, 107, 87] as const;
const softGreen = [234, 245, 241] as const;
const stripe = [247, 250, 248] as const;
const ink = [23, 32, 45] as const;
const muted = [101, 113, 134] as const;
const border = [220, 227, 223] as const;

function settings() {
  const rows = db.prepare("SELECT key,value FROM settings").all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((row) => [row.key, row.value])) as Record<string, string>;
}

function lookup<T>(query: string, id: number) {
  return id > 0 ? (db.prepare(query).get(id) as T | undefined) : undefined;
}

function filterLabel(req: Request) {
  const params = new URL(req.url).searchParams;
  const year = lookup<{ name: string; semester: string }>("SELECT name,semester FROM academic_years WHERE id=?", Number(params.get("academicYearId")));
  const schoolClass = lookup<{ name: string }>("SELECT name FROM classes WHERE id=?", Number(params.get("classId")));
  const material = lookup<{ chapter: string; subchapter: string; title: string }>(
    "SELECT ch.title chapter,sub.title subchapter,a.title FROM assessments a JOIN subchapters sub ON sub.id=a.subchapter_id JOIN chapters ch ON ch.id=sub.chapter_id WHERE a.id=?",
    Number(params.get("assessmentId")),
  );
  return [
    year ? `Tahun ajaran: ${year.name} · ${year.semester}` : "Semua tahun ajaran",
    schoolClass ? `Kelas: ${schoolClass.name}` : "Semua kelas",
    material ? `Bab/Materi: ${material.chapter}` : "Semua Bab/Materi",
  ].join(" | ");
}

export async function GET(req: Request) {
  const rows = reportRows(req) as ReportRow[];
  const groups = groupAverageRows(rows);
  const averagedRows = groups.flatMap((group) => group.classes.flatMap((classGroup) => classGroup.rows));
  const overall = averageStats(averagedRows);
  const info = settings();
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const pageWidth = 210;
  const left = 16;
  const right = 194;
  let page = 1;
  let y = 16;

  const footer = () => {
    doc.setDrawColor(...border);
    doc.line(left, 285, right, 285);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text("PIB Penilaian", left, 291);
    doc.text(`Halaman ${page}`, right, 291, { align: "right" });
  };

  const header = () => {
    doc.setFillColor(...green);
    doc.rect(0, 0, pageWidth, 8, "F");
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("Laporan Penilaian Praktik Ibadah", left, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text(info.schoolName || "PIB Penilaian", left, 27);
    doc.text(`Dibuat ${new Date().toLocaleString("id-ID")}`, right, 27, { align: "right" });
    doc.setDrawColor(...border);
    doc.line(left, 31, right, 31);
    doc.setFontSize(8);
    const filters = doc.splitTextToSize(filterLabel(req), right - left);
    doc.text(filters, left, 37);
    y = 39 + filters.length * 4 + 4;
  };

  const pageHeader = (material: string, className: string) => {
    if (y + 34 > 278) {
      footer();
      doc.addPage();
      page += 1;
      header();
    }
    doc.setFillColor(...green);
    doc.rect(left, y - 4, right - left, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`BAB/MATERI: ${material}`, left + 3, y + 1);
    y += 12;
    doc.setFillColor(...softGreen);
    doc.rect(left, y - 5, right - left, 7, "F");
    doc.setFontSize(8.5);
    doc.setTextColor(...green);
    doc.text(`KELAS: ${className}`, left + 3, y);
    y += 9;
    columnHeader();
  };

  const columnHeader = () => {
    doc.setFillColor(...green);
    doc.rect(left, y - 5, right - left, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(255, 255, 255);
    doc.text("NO", left + 2, y);
    doc.text("NAMA SISWA", left + 13, y);
    doc.text("JK", left + 82, y);
    doc.text("NILAI", left + 105, y);
    doc.text("STATUS", right - 2, y, { align: "right" });
    y += 8;
  };

  const classSummary = (classRows: AveragedRow[], materialLabel: string, className: string) => {
    const result = averageStats(classRows);
    if (y + 12 > 278) {
      footer();
      doc.addPage();
      page += 1;
      header();
      pageHeader(materialLabel, className);
    }
    doc.setFillColor(...softGreen);
    doc.rect(left, y - 4, right - left, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...green);
    doc.text(`Jumlah nilai: ${result.total}`, left + 3, y + 1);
    doc.text(`Rata-rata: ${result.average ?? "-"}`, left + 58, y + 1);
    doc.setFont("helvetica", "normal");
    doc.text(`Dinilai: ${result.scored}/${classRows.length}`, right - 3, y + 1, { align: "right" });
    y += 12;
  };

  header();
  for (const material of groups) {
    for (const classGroup of material.classes) {
      pageHeader(material.label, classGroup.name);
      classGroup.rows.forEach((row, index) => {
        const studentLines = doc.splitTextToSize(`${row.name}${row.nis ? ` (${row.nis})` : ""}`, 65);
        const statusLines = doc.splitTextToSize(String(row.status ?? "-"), 55);
        const lines = Math.max(studentLines.length, statusLines.length, 1);
        const height = lines * 4 + 5;
        if (y + height > 278) {
          footer();
          doc.addPage();
          page += 1;
          header();
          pageHeader(material.label, classGroup.name);
        }
        if (index % 2 === 0) {
          doc.setFillColor(...stripe);
          doc.rect(left, y - 5, right - left, height, "F");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);
        doc.setTextColor(...ink);
        doc.text(String(index + 1), left + 3, y);
        doc.text(studentLines, left + 13, y);
        doc.text(String(row.gender || "-"), left + 83, y);
        doc.text(row.average == null ? "-" : String(row.average), left + 117, y, { align: "right" });
        doc.text(statusLines, right - 2, y, { align: "right" });
        y += height;
      });
      classSummary(classGroup.rows, material.label, classGroup.name);
    }
  }

  if (!groups.length) {
    doc.setTextColor(...muted);
    doc.setFontSize(10);
    doc.text("Tidak ada data untuk filter yang dipilih.", left, y + 8);
  } else {
    if (y + 35 > 278) {
      footer();
      doc.addPage();
      page += 1;
      header();
    }
    doc.setFillColor(...green);
    doc.rect(left, y - 4, right - left, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("RINGKASAN AKHIR LAPORAN", left + 3, y + 1);
    y += 12;
    doc.setFontSize(8.5);
    doc.setTextColor(...ink);
    doc.text(`Jumlah data: ${rows.length}`, left + 3, y);
    doc.text(`Sudah dinilai: ${overall.scored}`, left + 70, y);
    doc.text(`Belum dinilai: ${averagedRows.length - overall.scored}`, left + 125, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...green);
    doc.text(`Jumlah nilai: ${overall.total}`, left + 3, y);
    doc.text(`Rata-rata nilai: ${overall.average ?? "-"}`, left + 70, y);
  }
  footer();

  return new NextResponse(doc.output("arraybuffer"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=laporan-pib.pdf",
      "Cache-Control": "no-store",
    },
  });
}
