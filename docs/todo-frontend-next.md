# TODO Frontend — Lanjutan Setelah Audit

Legenda: `[ ]` belum, `[-]` sedang/sebagian, `[x]` selesai dan memiliki bukti.

## P0 — validasi alur utama

- [ ] Siapkan harness browser test dan data fixture terisolasi.
- [ ] Test login berhasil/gagal, logout, redirect route internal, dan penolakan API tanpa session.
- [ ] Test tambah, edit, nonaktifkan, dan impor siswa.
- [ ] Test pilih bab → subbab → materi → input nilai → nilai tersimpan.
- [ ] Test nilai kosong tetap ditampilkan sebagai belum dinilai, bukan nol.
- [ ] Test draft offline, indikator pending, retry saat online, dan konflik sync.
- [ ] Test filter rekap menghasilkan query yang sama untuk rekap, Excel, dan PDF.

## P0 — hardening yang memblokir frontend rilis

- [x] Verifikasi `password_hash` tidak masuk backup operasional (tabel `users` tidak diekspor).
- [x] Tambahkan guard role server-side untuk backup/restore; role `TEACHER` dan `ADMIN` diizinkan.
- [ ] Test backup tidak mengandung credential sensitif dan restore tetap atomik.

## P1 — kelengkapan pengalaman pengguna

- [x] Ganti `fetch` mentah pada recap dengan `api`/helper bersama.
- [x] Tambahkan loading, error, dan retry pada alur data utama recap.
- [x] Migrasikan fetch mentah curriculum dan tambahkan abort request pada halaman daftar Bab.
- [x] Migrasikan fetch mentah pada halaman subbab/materi dan tambahkan abort request.
- [ ] Lengkapi preview impor: validasi header, gender, duplikasi NIS, CSV quoted value, dan detail baris gagal.
- [ ] Tampilkan jumlah total preview dan pagination atau opsi melihat seluruh baris.
- [ ] Tambahkan input/tampilan tanggal penilaian, paraf, catatan, dan penilai sesuai kontrak API.
- [ ] Tambahkan feedback aksi yang konsisten: toast sukses, error inline, disabled state, dan retry.
- [ ] Sediakan empty state yang membedakan “belum ada data” dari “gagal memuat data”.
- [x] Rapikan keluaran Excel/PDF: ringkasan, metadata filter, detail nilai, status, zebra row, dan footer laporan; tervalidasi lewat smoke test download.
- [x] Susun laporan utama per Bab/Materi → kelas → nomor, JK, dan nilai rata-rata lintas penilaian; tambahkan jumlah serta rata-rata nilai di setiap kelas dan akhir laporan.

## P1 — aksesibilitas dan responsif

- [ ] Pastikan seluruh label form memiliki `htmlFor`/`id` yang cocok.
- [ ] Uji keyboard: focus, dialog, toast/status, sidebar, mobile navigation, dan tabel.
- [ ] Uji breakpoint 1280 px, 768 px, dan 360 px untuk semua halaman utama.
- [ ] Pastikan tabel panjang dapat discroll dan aksi tidak terpotong di layar kecil.
- [ ] Periksa kontras, focus ring, heading hierarchy, dan pesan validasi.

## Tahap 4 — penutupan refactor frontend

- [x] Verifikasi halaman siswa sudah memiliki tambah, edit, nonaktifkan, preview impor, dan error inline.
- [x] Verifikasi aksi destruktif siswa memakai `ConfirmDialog`.
- [x] Verifikasi form utama siswa memiliki label eksplisit dan busy state pada mutasi.
- [ ] Pisahkan halaman siswa menjadi komponen kecil dan migrasikan tombol template ke komponen khusus.

## P2 — maintainability

- [ ] Pecah `students`, `assessment`, `recap`, dan `reports` menjadi komponen/feature kecil.
- [ ] Hilangkan `any` yang tidak perlu dan satukan tipe response API frontend.
- [ ] Kurangi inline style dan gunakan token/class CSS yang sudah tersedia.
- [ ] Tambahkan error boundary dan halaman fallback untuk kegagalan runtime.
- [ ] Jalankan lint, test, typecheck, build, performance check, dan browser smoke test pada CI.

## Definition of Done frontend

- [ ] Semua item P0 memiliki test yang dapat dijalankan ulang.
- [ ] Semua halaman utama memiliki loading, empty, error, dan retry state yang teruji.
- [ ] Alur desktop dan mobile lulus acceptance test.
- [ ] `npm run check` dan browser smoke test lulus.
- [ ] Dokumentasi status tidak menandai fitur selesai tanpa bukti.
