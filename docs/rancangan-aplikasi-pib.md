# Rancangan Baru Aplikasi PIB

## Tujuan

Aplikasi web lokal untuk satu guru mencatat Penilaian Praktik Ibadah, melihat rekap, mencetak laporan, dan backup/restore. Kode disiapkan untuk upgrade multi-perangkat, tetapi multi-user dan cloud sync bukan target versi pertama.

## Stack dan deployment

- Next.js App Router, React, TypeScript strict.
- SQLite lokal melalui Prisma; PostgreSQL hanya opsi saat kelak menjadi server bersama.
- Prisma Client/Migrate dan Zod.
- Vitest untuk domain test.
- ExcelJS untuk Excel.
- HTML/CSS server-side dengan Playwright/Chromium untuk PDF A4.

Versi pertama berjalan mandiri tanpa service database terpisah. SQLite menjadi sumber kebenaran, sedangkan IndexedDB dipakai untuk cache dan draft offline.

## Standar visual dan performa

Hasil akhir wajib modern, bersih, konsisten, responsif, dan tidak terlihat seperti CRUD klasik. Gunakan whitespace, hierarki visual, empty state, feedback autosave, akses keyboard, dan tabel nyaman di ponsel. Hindari dependency, animasi, dan request yang tidak perlu. UI harus ringan dan stabil pada komputer sekolah serta ponsel kelas bawah; ukur bundle dan waktu respons pada setiap milestone.

## Arsitektur

Browser/PWA -> UI React -> Route Handlers/Server Actions -> Zod -> domain services -> Prisma repositories -> SQLite

Domain service wajib memuat scoring, rekap, laporan, dan backup. Aturan bisnis tidak boleh hanya berada di UI. Tulisan multi-tabel menggunakan transaksi dan perubahan penting dicatat di audit log.

## Model data

User -> AuditLog
User -> Score <- Student <- Class <- AcademicYear
AcademicYear -> CurriculumTemplate -> Chapter -> Subchapter -> Assessment
Student + Assessment = Score unik

Entitas: User, AcademicYear, Class, Student, CurriculumTemplate, Chapter, Subchapter, Assessment, Score, Setting, AuditLog, dan SyncOperation saat offline penuh diperlukan.

Score.mistakes dan Score.score nullable. Nilai kosong adalah NULL, bukan nol. Parent yang memiliki nilai tidak boleh dihapus permanen; nonaktifkan. Semua perubahan schema melalui Prisma Migrate.

## Aturan nilai

- Input kesalahan integer 0-90.
- nilai = 90 - jumlah_kesalahan, hasil 0-90.
- Nilai 0 berarti 90 kesalahan; NULL berarti belum dinilai.
- Total/rata-rata hanya memakai nilai terisi.
- Rata-rata berbobot = jumlah(nilai x bobot) / jumlah(bobot) materi terisi.
- Subbab selesai bila seluruh siswa aktif dalam scope memiliki nilai untuk seluruh assessment aktif.

## Modul dan laporan

Modul: login satu guru, dashboard, periode/kelas/siswa, template materi, input grid, rekap, laporan, backup/restore, dan draft offline.

Kontrak filter bersama untuk rekap, Excel, dan PDF: tahun ajaran/semester, kelas, siswa, bab, subbab, materi, serta cakupan semua/kelas/siswa/struktur materi.

Excel memiliki Nilai Detail, Rekap Siswa, dan Rekap Kelas, termasuk bobot, nilai, total, rata-rata, status, tanggal, penilai, paraf, dan keterangan. PDF A4 memuat identitas sekolah/guru, parameter, daftar materi, nilai, total, rata-rata, progress, paraf, keterangan, header berulang, footer nomor halaman, dan page break.

## Tahapan

1. Fondasi project, environment, Docker, Prisma, migrasi, seed, dan error handling.
2. Login lokal dan proteksi route.
3. Master data serta duplikasi template ke periode baru.
4. Scoring, input nilai, autosave, audit, dan progress.
5. Rekap dan kontrak filter bersama.
6. Excel, PDF, backup, dan restore.
7. PWA cache, draft offline, lalu evaluasi offline penuh.
8. Testing penerimaan, dokumentasi, dan rilis.

## Kriteria selesai

Guru dapat membuat periode, kelas, siswa, dan materi; mengisi nilai; melihat rekap; mengunduh laporan terfilter; dan memulihkan backup. Build, migrasi, unit test perhitungan, serta uji laporan wajib berhasil.
