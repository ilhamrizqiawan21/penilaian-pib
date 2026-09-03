# TODO Frontend & UI/UX

Status hanya boleh dicentang setelah browser test.

## Fondasi

- [x] Design token, layout desktop, dan mobile navigation dasar.
- [x] Provider toast untuk keberhasilan aksi.
- [x] `ConfirmDialog` aksesibel untuk aksi destruktif.
- [x] `PageHeader`, `Alert`, `EmptyState`, `LoadingState`, dan `Breadcrumb`.
- [ ] Terapkan toast pada seluruh mutasi berhasil; error/validasi tetap inline.
- [ ] Ganti modal lama dengan `ConfirmDialog` dan kembalikan fokus ke pemicu.

## Layout & responsivitas

- [ ] Pastikan seluruh subroute Materi menandai menu Materi sebagai aktif.
- [x] Komponen breadcrumb tersedia untuk alur bertingkat.
- [ ] Uji 1280 px, 768 px, dan 360 px pada semua halaman utama.
- [ ] Pastikan tabel panjang nyaman di layar kecil dan tidak tertutup mobile navigation.

## Refactor halaman

- [ ] Seragamkan Master Data, Kelas, Akun, Setup, Penilaian, Rekap, Laporan, dan Materi ke komponen UI bersama.
- [ ] Tambahkan label eksplisit pada semua form lama yang masih memakai placeholder.
- [ ] Tambahkan loading, empty, error, dan retry di setiap halaman yang mengambil data.
- [ ] Terapkan breadcrumb nama aktual untuk Bab dan Subbab.
- [ ] Pindahkan tombol template impor Siswa menjadi komponen React eksplisit dalam form impor.

## Validasi

- [ ] Uji keyboard untuk toast, dialog, breadcrumb, sidebar, dan mobile navigation.
- [ ] Uji batal/konfirmasi pada hapus/nonaktifkan/restore.
- [ ] Jalankan browser smoke test, typecheck, build, dan performance check.
