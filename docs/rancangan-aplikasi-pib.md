# Rancangan Aplikasi Penilaian Praktik Ibadah (PIB)

## Tujuan

Membuat aplikasi lokal berbasis web/PWA untuk membantu guru mencatat dan merekap Penilaian Praktik Ibadah. Format penilaian mengikuti pola buku fisik: materi praktik, nilai, paraf, dan keterangan per siswa, tetapi bab, subbab, materi, kelas, dan siswa dapat diinput sendiri.

## Rekomendasi bentuk aplikasi

Mulai sebagai **web app responsif yang dapat dipasang sebagai PWA**.

- Dipakai dari laptop untuk pengaturan data dan mencetak laporan.
- Dipakai dari ponsel/tablet saat praktik berlangsung.
- Setelah aplikasi inti selesai, PWA menyimpan data kerja sementara saat offline dan menyinkronkan kembali ketika internet tersedia.
- Untuk penggunaan satu guru di satu perangkat, aplikasi dapat berjalan lokal. Untuk beberapa guru/perangkat, gunakan server/database bersama di jaringan sekolah atau cloud.

## Alur penggunaan

1. Admin/guru membuat tahun ajaran dan kelas.
2. Guru memasukkan daftar siswa secara manual atau melalui impor Excel.
3. Guru membuat struktur penilaian: bab, subbab, lalu materi/indikator praktik.
4. Saat penilaian, guru memilih kelas dan materi, lalu memasukkan nilai tiap siswa. Paraf dan keterangan bersifat opsional.
5. Sistem menghitung total, rata-rata, dan status kelengkapan penilaian otomatis.
6. Guru melihat rekap lalu mengekspor hasil sebagai Excel atau PDF.

## Fitur versi pertama (MVP)

### 1. Master data

- Tahun ajaran dan semester.
- Kelas.
- Data siswa: NIS/NISN, nama, jenis kelamin, dan status aktif.
- Pengaturan rentang nilai dan predikat bila diperlukan.

### 2. Struktur materi PIB

- Bab, misalnya: Salat, Wudu, Doa, Jenazah.
- Subbab, misalnya: Salat Jenazah.
- Materi/indikator yang dinilai, misalnya: Niat Salat Jenazah, Bacaan Takbir Pertama, Tata Cara Wudu.
- Urutan tampilan materi.
- Bobot materi opsional.

### 3. Input penilaian

- Tampilan tabel/grid seperti buku nilai.
- Input nilai per siswa untuk setiap materi.
- Kolom paraf dan keterangan.
- Tanggal penilaian dan nama penilai.
- Penyimpanan otomatis setelah nilai diubah.
- Penanda siswa atau materi yang belum dinilai.

### 4. Rekap dan progres

- Total nilai siswa.
- Rata-rata nilai siswa.
- Rata-rata per materi dan per kelas.
- Status subbab selesai jika seluruh siswa pada materi di dalamnya telah dinilai.
- Filter berdasarkan tahun ajaran, kelas, bab, subbab, materi, dan siswa.

### 5. Laporan

- Ekspor Excel (`.xlsx`) untuk pengolahan lebih lanjut.
- Ekspor PDF ukuran A4 untuk cetak dan arsip.
- Pilihan laporan: per kelas, per siswa, per bab/subbab, atau keseluruhan periode.
- Format PDF menampilkan identitas sekolah/guru, kelas, daftar materi, nilai, total, rata-rata, paraf, dan keterangan.

## Aturan perhitungan nilai

- **Total siswa** = jumlah seluruh nilai materi yang telah terisi.
- **Rata-rata siswa** = total nilai dibagi jumlah materi yang telah terisi.
- Jika bobot dipakai: rata-rata = jumlah `(nilai × bobot)` dibagi total bobot materi yang sudah terisi.
- Nilai kosong **bukan nol**. Nilai tersebut ditampilkan sebagai *Belum dinilai*, sehingga guru tidak keliru menganggap siswa memperoleh nol.
- Nilai nol hanya dicatat apabila guru memang memasukkan angka `0`.

## Skema database yang disarankan

### `users`

Menyimpan akun pengguna.

- `id`
- `name`
- `email`
- `password_hash`
- `role` — `admin` atau `guru`
- `created_at`, `updated_at`

Untuk penggunaan pribadi lokal, tabel ini dapat disederhanakan atau bahkan ditambahkan belakangan.

### `academic_years`

- `id`
- `name` — contoh: `2026/2027`
- `semester`
- `is_active`

### `classes`

- `id`
- `academic_year_id`
- `name` — contoh: `VII A`
- `grade_level`
- `homeroom_teacher_id` (opsional)

Satu tahun ajaran dapat memiliki banyak kelas.

### `students`

- `id`
- `class_id`
- `nis`
- `nisn` (opsional)
- `name`
- `gender`
- `is_active`

Satu kelas memiliki banyak siswa.

### `chapters`

- `id`
- `title`
- `display_order`
- `created_by`

### `subchapters`

- `id`
- `chapter_id`
- `title`
- `display_order`

Satu bab memiliki banyak subbab.

### `assessments`

Mewakili satu materi atau indikator praktik yang dinilai.

- `id`
- `subchapter_id`
- `title`
- `description` (opsional)
- `weight` (opsional, nilai awal `1`)
- `display_order`
- `is_active`

### `scores`

Menyimpan nilai per siswa untuk tiap materi.

- `id`
- `student_id`
- `assessment_id`
- `score` (nullable; kosong berarti belum dinilai)
- `assessed_at`
- `assessor_id`
- `initials` — paraf/inisial penilai (opsional)
- `note` — keterangan (opsional)
- `created_at`, `updated_at`

Kombinasi `student_id` dan `assessment_id` harus unik agar satu siswa tidak memiliki dua nilai aktif untuk materi yang sama.

## Relasi data

```text
Tahun Ajaran → Kelas → Siswa

Bab → Subbab → Materi/Indikator → Nilai ← Siswa
                              ↑
                           Penilai
```

## Stack teknologi yang diajukan

- **Frontend dan aplikasi web:** Next.js + TypeScript.
- **Tampilan:** Tailwind CSS + shadcn/ui.
- **Database:** PostgreSQL.
- **ORM dan migrasi database:** Prisma.
- **PWA/offline:** Serwist atau Workbox untuk cache aplikasi; IndexedDB untuk antrean perubahan saat perangkat offline.
- **Ekspor Excel:** ExcelJS.
- **Ekspor PDF:** `@react-pdf/renderer` atau Puppeteer, tergantung format cetak yang dipilih.
- **Autentikasi dan penyimpanan awal:** Supabase Auth + PostgreSQL, atau server lokal sekolah.

## Rencana pengerjaan

### Tahap 1 — Fondasi

- Membuat proyek aplikasi dan database.
- Halaman tahun ajaran, kelas, serta siswa.
- Halaman input bab, subbab, dan materi.

### Tahap 2 — Penilaian inti

- Tampilan grid input nilai.
- Total, rata-rata, dan status belum dinilai.
- Paraf, keterangan, dan riwayat tanggal penilaian.

### Tahap 3 — Rekap dan laporan

- Halaman rekap per siswa dan kelas.
- Filter data.
- Ekspor Excel dan PDF.

### Tahap 4 — PWA dan penyempurnaan

- Instalasi aplikasi di ponsel.
- Penggunaan offline dan sinkronisasi.
- Backup/restore data.
- Uji coba dengan data penilaian nyata dan penyesuaian format PDF seperti buku fisik.

## Keputusan awal yang perlu ditetapkan sebelum pembangunan

1. Aplikasi hanya untuk satu guru, atau akan dipakai beberapa guru?
2. Apakah nilai memakai skala 0–100 dan apakah setiap materi memiliki bobot berbeda?
3. Apakah format PDF harus sama persis seperti buku fisik, atau cukup rapi dengan struktur data yang sama?
4. Apakah siswa akan selalu diinput satu per satu, atau perlu impor dari Excel sejak versi pertama?
5. Apakah aplikasi akan dipakai hanya pada jaringan/laptop sekolah atau juga dari luar sekolah?
