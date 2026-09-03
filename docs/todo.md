# TODO PIB - Rencana Implementasi Baru

Legenda: [x] selesai, [~] sebagian, [ ] belum.

## Fondasi
- [x] Next.js + TypeScript dasar.
- [x] SQLite lokal langsung melalui better-sqlite3 sebagai database utama.
- [x] Schema SQLite dan domain scoring.
- [x] Dependency terpasang, unit test, database setup, dan build berhasil.
- [x] Validasi environment, schema startup, struktur domain, dan seed idempotent.
- [x] Tetapkan design system modern, responsive breakpoint, akses keyboard, empty/loading/error state.
- [x] Ukur bundle dan performa halaman utama pada desktop serta ponsel.

## Autentikasi
- [x] Setup akun guru pertama.
- [x] Login/logout cookie httpOnly dan proteksi route/API.
- [ ] Session expiry, ubah password, dan test auth.

## Master data
- [x] API create/list tahun ajaran, semester, kelas, siswa, template, bab, subbab, assessment.
- [x] UI create/list tahun ajaran, semester, kelas, siswa.
- [x] UI create/list template, bab, subbab, assessment.
- [x] Duplikasi template ke periode baru.
- [x] Validasi duplikasi, relasi, nonaktifkan, dan penghapusan aman.
- [x] UI keadaan kosong dan konfirmasi aksi destruktif.

## Penilaian dan rekap
- [x] Domain scoring, validator, total, rata-rata, bobot, progress.
- [x] API upsert unik siswa-materi; pengosongan menjadi NULL.
- [x] Grid responsif, autosave, tanggal, penilai, paraf, catatan, audit.
- [x] Rekap siswa, kelas, materi, subbab, dan status selesai.
- [x] Kontrak filter bersama untuk UI, API, Excel, dan PDF.

## Laporan dan backup
- [x] Excel detail, rekap siswa, dan rekap kelas.
- [x] Excel mengikuti dataset aktif dan memuat bobot, total, rata-rata, status, tanggal, paraf, catatan.
- [x] PDF A4 dengan rekap siswa, progress, rata-rata, page break, header/footer.
- [x] Cakupan laporan dataset aktif.
- [x] Backup JSON berversi dan validasi sebelum restore.
- [x] Test data kosong, nilai kosong, banyak data, filter, dan teks panjang.

## PWA dan offline bertahap
- [x] Manifest, service worker berversi, indikator koneksi.
- [x] Draft input nilai di IndexedDB dan pemulihan saat server kembali.
- [x] Tampilkan jumlah draft tertunda dan status sinkronisasi kepada pengguna.
- [x] Evaluasi offline penuh setelah online stabil untuk draft input nilai.
- [x] SyncOperation dasar, retry-safe idempotency, dan status sinkronisasi.

## Kualitas dan rilis
- [x] Unit test scoring, recap, bobot, nilai kosong, progress.
- [x] API test auth, master data, nilai, laporan, backup, restore.
- [x] Test migrasi database kosong dan berisi.
- [ ] Uji desktop/tablet/ponsel, aksesibilitas, keamanan input, error message.
- [x] Data demo, acceptance checklist guru, dokumentasi instalasi/update, dan versi.
- [x] Verifikasi dasar UI modern, ringan, stabil, dan nyaman di layar kecil.

## Phase 2 — Audit, perapihan menu, dan hardening
- [x] Pisahkan layout publik dan layout aplikasi; sidebar hanya tampil setelah login.
- [x] Lindungi seluruh route internal dan API dengan validasi session terpusat.
- [x] Tambahkan logout, expiry session, ubah password, dan test autentikasi.
- [x] Hapus card Materi dari Master Data; jadikan Materi halaman CRUD mandiri.
- [x] Lengkapi CRUD dan impor siswa dengan preview, validasi duplikasi, dan hasil impor.
- [x] Lengkapi grid penilaian dengan metadata nilai dan state form yang konsisten.
- [x] Hubungkan draft IndexedDB ke operation queue, retry, konflik, dan indikator error.
- [x] Terapkan filter bersama pada rekap, Excel, dan PDF.
- [x] Lengkapi format Excel/PDF sesuai spesifikasi dan uji kasus ekstrem.
- [x] Buat migrasi SQLite berversi dan restore atomik tervalidasi.
- [x] Batasi cache service worker pada asset yang aman dan bersihkan cache lama.
- [ ] Tambahkan API, migrasi, impor, ekspor, PDF, offline, responsive, dan accessibility test.
- [x] Perbaiki pemeriksaan performa agar mengukur asset browser secara tepat dan tetapkan baseline.
- [ ] Audit dependency dan dokumentasikan hasil final sebelum rilis.
