# Audit Phase 2 — Menu, Navigasi, dan Kesiapan Rilis

Tanggal audit: 2 September 2026  
Ruang lingkup: source code aplikasi, route UI/API, database SQLite, PWA/offline, laporan, test, dan dokumentasi.

## Ringkasan eksekutif

Fondasi aplikasi sudah dapat dijalankan dan build produksi berhasil, tetapi belum siap disebut rilis stabil. Phase 2 perlu memusatkan pekerjaan pada konsistensi navigasi, proteksi akses, kelengkapan CRUD, filter laporan, dan pengurangan risiko data.

Temuan paling kritis:

1. Middleware belum melindungi semua halaman internal. `/assessment`, `/recap`, `/reports`, `/students`, dan `/master-data/curriculum` tidak termasuk matcher, sehingga dapat dibuka tanpa login.
2. Middleware hanya memeriksa keberadaan cookie, bukan keabsahan session. API juga berisiko menerima cookie palsu.
3. Menu Materi masih ditampilkan di halaman Master Data, padahal desain yang disepakati memisahkannya ke sidebar dan halaman sendiri.
4. Halaman Materi masih placeholder; CRUD materi yang menjadi menu utama belum tersedia.
5. Impor siswa belum mempunyai handler `onChange`/proses pembacaan file. Halaman siswa juga belum menyediakan edit dan hapus yang lengkap.
6. Rekap dan laporan belum memakai kontrak filter secara nyata. Endpoint Excel/PDF saat ini belum menerima filter query, dan UI laporan belum menyediakan filter maupun restore.
7. Strategi sinkronisasi offline belum tersambung penuh ke UI. Draft IndexedDB belum dikirim melalui operation queue `/api/sync` dan belum menerapkan resolusi konflik berbasis `updated_at`.
8. `npm run perf:check` gagal dengan ukuran aset static 30,85 MB; skrip saat ini menghitung seluruh `.next/static`, termasuk kemungkinan source map, sehingga perlu dibenahi sekaligus ditetapkan baseline yang benar.

## Hasil verifikasi otomatis

- `npm test`: lulus, 3 file test dan 5 test.
- `npx tsc --noEmit`: lulus.
- Build produksi sebelumnya lulus dan menghasilkan 31 route.
- `npm run perf:check`: gagal; hasil 30,85 MB melebihi batas 5 MB.
- `npm audit --omit=dev`: belum dapat diverifikasi karena registry npm tidak dapat diakses dari lingkungan audit (`EAI_AGAIN`).

## Temuan berdasarkan area

### A. Shell aplikasi dan navigasi

- Layout global merender sidebar pada semua halaman, lalu menyembunyikannya berdasarkan daftar path. Pola ini rapuh karena setiap route publik/internal baru harus ditambahkan manual.
- Sidebar sudah memiliki enam tujuan utama: Beranda, Master Data, Materi, Penilaian, Kelola Siswa, dan Laporan. Namun akses dan tampilan belum dipisahkan melalui layout route yang jelas.
- Halaman sebelum login perlu memakai shell publik tersendiri; halaman internal perlu memakai shell terproteksi dengan sidebar.
- Belum terlihat state aktif, menu mobile yang teruji, tombol logout, dan informasi pengguna yang konsisten.

### B. Autentikasi dan otorisasi

- `middleware.ts` hanya memeriksa `pib_session` ada atau tidak. Validasi signature, expiry, dan keberadaan user dilakukan di sebagian server code, bukan sebagai satu guard yang konsisten.
- `readSession()` dapat melempar exception saat panjang signature cookie tidak sama karena `timingSafeEqual` mensyaratkan buffer dengan panjang sama. JSON payload juga belum dibungkus penanganan error.
- Belum ada alur ubah password dan pengujian autentikasi end-to-end.
- Secret memiliki fallback development. Untuk rilis, startup harus menolak secret default dan cookie harus memiliki konfigurasi produksi yang eksplisit.

### C. Master Data dan Materi

- Master Data sudah mengikuti susunan vertikal tahun ajaran, kelas, identitas sekolah, dan guru PIB.
- Card “Materi PIB” masih berada di bagian bawah Master Data dan harus dihapus dari halaman tersebut.
- `/master-data/curriculum` masih berupa placeholder, walaupun route API template/bab/subbab/assessment telah tersedia.
- API generik master data hanya mendukung perubahan `name`/`title`; atribut seperti relasi kelas, NIS, jenis kelamin, bobot, dan status belum memiliki form edit yang memadai.
- Penghapusan parent dengan relasi perlu diuji lagi agar tidak menimbulkan orphan atau penghapusan berantai yang tidak diinginkan.
- Audit log perubahan master data belum diterapkan secara konsisten.

### D. Kelola Siswa

- Halaman terpisah siswa sudah ada dan memiliki input tambah serta daftar siswa.
- Input “Impor Excel” belum melakukan parsing, validasi kolom, preview, atau commit transaksi.
- CRUD siswa belum lengkap untuk edit, nonaktifkan, dan konfirmasi tindakan.
- Validasi duplikasi NIS/NISN dan laporan baris gagal impor perlu ditampilkan dengan jelas.

### E. Penilaian dan Rekap

- Domain scoring dasar dan unit test rumus nilai sudah tersedia.
- Grid penilaian belum sepenuhnya mengekspos tanggal, penilai, paraf, dan catatan yang didukung API.
- Input memakai field uncontrolled pada beberapa bagian, sehingga perubahan materi atau pemuatan ulang data dapat menampilkan nilai lama.
- Rekap UI masih minimal: belum ada filter terpusat dan hasil subbab/progres belum ditampilkan lengkap walaupun API telah menyiapkan data terkait.
- Draft nilai tidak sepenuhnya terintegrasi dengan operation queue sinkronisasi.

### F. Laporan, ekspor, backup, dan restore

- UI laporan sudah menyediakan tautan dasar PDF, Excel, dan backup.
- Filter periode/kelas/siswa/bab/subbab/materi belum tersedia sebagai alur laporan yang bisa dipakai guru.
- Endpoint Excel/PDF belum menerima parameter filter bersama. Implementasi Excel juga belum membuktikan seluruh sheet dan kolom yang dijanjikan, sedangkan PDF masih berupa rekap dasar dan belum memuat seluruh identitas, materi, paraf, serta keterangan.
- Restore memvalidasi nama tabel secara umum, tetapi belum melakukan validasi schema per tabel, transaksi penggantian data secara atomik, pemeriksaan foreign key menyeluruh, dan pembersihan data lama sesuai definisi restore.
- Backup/restore memerlukan pesan error yang aman dan konfirmasi yang lebih jelas karena berdampak pada seluruh data.

### G. Database dan perubahan schema

- Implementasi aktual memakai SQLite langsung melalui `better-sqlite3`, bukan Prisma/PostgreSQL seperti rancangan awal. Dokumentasi sudah sebagian disesuaikan, tetapi klaim “semua perubahan schema melalui Prisma Migrate” masih tidak konsisten dan harus dihapus atau diganti dengan strategi migrasi SQLite yang nyata.
- Schema dibuat melalui inisialisasi database saat module dimuat. Belum ada sistem versi migrasi yang dapat dijalankan berurutan pada database kosong maupun database lama.
- Beberapa tabel master belum memiliki `updated_at`, sehingga strategi konflik last-write-wins belum dapat diterapkan secara konsisten.

### H. PWA dan offline

- Manifest, service worker, indikator koneksi, dan draft IndexedDB sudah tersedia.
- Service worker saat ini berisiko mencache semua request GET, termasuk response API/auth yang seharusnya tidak masuk cache umum. Belum ada pembersihan cache versi lama.
- Operation queue belum menjadi jalur utama penyimpanan dan pengiriman perubahan dari UI.
- Belum ada UI retry, detail kegagalan sinkronisasi, konflik, atau aksi pengguna untuk menyelesaikan konflik.
- Master data perlu dikunci ketika masih ada operasi offline yang belum tersinkronisasi.

### I. Testing dan kualitas

- Test domain masih kecil: 5 test untuk scoring, recap, dan progress.
- Belum ada API/integration test untuk auth, master data, score, laporan, backup, restore, dan sync.
- Belum ada test migrasi, impor siswa, ekspor dengan filter, PDF multi-halaman, aksesibilitas, dan browser responsive.
- Script `lint` menggunakan `next lint`; perlu dikonfirmasi kompatibilitasnya dengan Next.js 15 atau diganti ke pemeriksaan ESLint yang eksplisit.
- Audit dependency belum selesai karena akses registry gagal.

## Prioritas pengerjaan Phase 2

### P0 — wajib sebelum fitur dianggap aman

- Pisahkan `PublicLayout` dan `AppLayout`; sidebar hanya ada setelah login.
- Lindungi semua route internal dan semua API dengan guard session terpusat yang memvalidasi signature, expiry, dan user.
- Perbaiki parser cookie malformed dan tambahkan logout.
- Hapus card Materi dari Master Data dan implementasikan halaman Materi sebagai menu mandiri.
- Jadikan filter sebagai kontrak bersama yang benar-benar dipakai UI, rekap, Excel, dan PDF.

### P1 — wajib sebelum rilis pengguna

- Selesaikan CRUD/impor siswa dengan preview, validasi, dan hasil per baris.
- Lengkapi grid penilaian dan sinkronisasi draft melalui operation queue.
- Lengkapi PDF/Excel sesuai spesifikasi dan uji data kosong, besar, filter, serta teks panjang.
- Buat migrasi SQLite berversi dan restore atomik dengan validasi schema.
- Tambahkan API test, migration test, dan browser smoke test.

### P2 — penyempurnaan kualitas

- Perbaiki cache PWA agar hanya menyimpan asset/app shell yang aman.
- Tambahkan state aktif sidebar, menu mobile, toast, loading skeleton, dan error boundary.
- Tetapkan baseline performa yang mengabaikan source map, ukur JS yang benar-benar dikirim ke browser, dan optimalkan dependency berat.
- Tambahkan audit log untuk seluruh perubahan master data dan penyelesaian konflik.

## Kriteria selesai Phase 2

- Tanpa login, seluruh halaman internal mengarahkan ke login dan seluruh API menolak request tidak sah.
- Master Data hanya berisi periode, kelas, identitas sekolah, dan guru PIB; Materi, Penilaian, Kelola Siswa, dan Laporan berdiri sebagai menu/sidebar terpisah.
- Guru dapat membuat, mengubah, menonaktifkan, mengimpor, dan memvalidasi data siswa.
- Satu filter menghasilkan dataset yang sama pada rekap, Excel, dan PDF.
- Nilai kosong tetap NULL, draft offline dapat diretry, dan status sinkronisasi dapat dipahami pengguna.
- Restore tervalidasi serta atomik; test dan build produksi lulus.
- Performa memiliki ukuran baseline yang dapat direproduksi dan tidak melewati batas yang disepakati.

## Status audit

Audit ini adalah baseline Phase 2. Belum ada implementasi perbaikan pada audit ini; checklist tindakan telah ditambahkan ke `docs/todo.md` untuk dikerjakan bertahap dan diverifikasi satu per satu.
