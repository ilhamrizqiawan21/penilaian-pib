# Audit Frontend PIB Penilaian

Tanggal: 3 September 2026  
Scope: UI App Router, navigasi, alur data frontend, PWA/offline, kualitas, dan kesiapan dilanjutkan.

## Ringkasan

Frontend sudah memiliki fondasi yang cukup untuk dilanjutkan: layout publik/aplikasi terpisah, sidebar desktop dan mobile, komponen UI bersama, state loading/error/empty pada halaman utama, impor siswa dengan preview, filter rekap, ekspor terfilter, serta draft nilai offline.

Status verifikasi saat audit:

- `npm test`: lulus, 7 file dan 17 test.
- `npm run typecheck`: lulus.
- `npm run build`: lulus; 36 page/route berhasil dibuat.
- `npm run perf:check`: lulus; aset browser 1,78 MB, source map tidak dihitung.
- Browser test manual/otomatis: belum tersedia.

## Temuan utama

### F1 — Belum ada bukti browser untuk alur kritis (P0)

Belum ada test browser di repository. Karena itu login, redirect tanpa session, navigasi mobile, tambah/edit/nonaktifkan siswa, impor, input nilai, draft offline, filter rekap, ekspor, dan restore belum terbukti dari perspektif pengguna.

### F2 — State dan akses data belum konsisten (P1)

`app/master-data/curriculum/*` dan sebagian `app/recap/page.tsx` memakai `fetch` langsung, tanpa wrapper `api`, pembatalan request, dan penanganan status HTTP yang konsisten. Beberapa form curriculum juga memakai label tanpa `htmlFor`, dan error load dapat tampil sebagai data kosong.

### F3 — Preview impor belum cukup informatif (P1)

Preview hanya menampilkan 20 baris dan validasi frontend baru memeriksa class, nama, serta class ID. Duplikasi NIS, gender invalid, kolom kurang, koma dalam CSV, dan daftar detail baris gagal belum ditampilkan dengan jelas.

### F4 — UX nilai belum lengkap untuk metadata (P1)

API mendukung tanggal, penilai, paraf, dan catatan, tetapi UI assessment saat ini hanya mengedit jumlah kesalahan. Pengguna belum dapat memasukkan atau meninjau metadata nilai dari alur utama.

### F5 — Risiko backend yang berdampak ke frontend (P0)

Endpoint backup masih mengekspor seluruh kolom tabel `users`, termasuk `password_hash`. Restore dan backup sudah memiliki konfirmasi/snapshot, tetapi operasi sensitif belum dibatasi berdasarkan role secara eksplisit. Ini perlu dibereskan sebelum UI rilis ke pengguna.

### F6 — Kualitas kode frontend perlu dirapikan (P2)

Beberapa halaman sangat padat dalam satu file/baris panjang, memakai tipe `any`, inline style, dan fungsi fetch berulang. Ini memperbesar risiko regresi dan menyulitkan penambahan fitur.

## Rekomendasi urutan kerja

1. Tambahkan browser smoke test untuk auth dan alur penilaian.
2. Rapikan kontrak data frontend dan state loading/error.
3. Lengkapi impor siswa dan metadata penilaian.
4. Kerjakan hardening backup/restore sebelum acceptance test.
5. Pecah komponen besar dan lakukan audit aksesibilitas/responsif.

## Kesimpulan

Proyek dapat dilanjutkan pada pekerjaan frontend. Build dan performance saat ini sehat, namun status “siap rilis” belum dapat diberikan karena belum ada pembuktian browser dan masih ada risiko backup sensitif.
