# Laporan Implementasi Backend Fase 1

Tanggal: 3 September 2026  
Target: aplikasi PIB Penilaian single-user pada komputer lokal.

## Ringkasan

Implementasi berfokus pada stabilitas SQLite, keamanan session yang proporsional untuk penggunaan lokal, validasi request pada jalur berisiko, serta pemulihan data yang tidak menimpa akun lokal.

## Pekerjaan yang selesai

### Konfigurasi dan autentikasi

- Memusatkan `DATABASE_URL` dan `SESSION_SECRET` pada `lib/env.ts`.
- Menolak `SESSION_SECRET` production yang default atau kurang dari 32 karakter. Build Next.js tetap dapat berjalan karena validasi production diterapkan saat runtime, bukan ketika artefak dikompilasi.
- Mengubah session server dan edge untuk memakai konfigurasi yang sama.
- Menjaga cookie session sebagai `httpOnly`, `SameSite=Lax`, dan masa aktif 30 hari.
- Menambahkan validasi payload login serta pembatasan lima percobaan gagal per email selama lima menit.
- Menambahkan validasi origin untuk semua request tulis pada middleware.

### Database dan migrasi

- Memindahkan schema ke migration runner berversi dan transaksional di `lib/migrations.ts`.
- Menambahkan migrasi indeks untuk query siswa, score, assessment, dan audit log.
- Memusatkan pembukaan SQLite, aktivasi foreign key, serta mode WAL di `lib/db.ts`.
- Menambahkan snapshot file SQLite sebelum migration dan restore ke `backups/auto/`.
- Menambahkan pola database runtime, WAL, SHM, dan folder snapshot ke `.gitignore`.

### Backup, restore, dan audit

- Mengganti backup menjadi format data-only versi 2 dengan metadata aplikasi, versi schema, dan waktu pembuatan.
- Mengeluarkan tabel `users` dari backup sehingga password hash dan akun lokal tidak terekspos atau tertimpa saat restore.
- Restore memvalidasi versi, tabel, kolom, ukuran payload, dan relasi foreign key.
- Restore dilakukan dalam transaksi, membuat snapshot terlebih dahulu, dan mengembalikan jumlah data yang dipulihkan.
- Menambahkan pencatatan audit untuk backup, restore berhasil/gagal, perubahan password, import siswa, score, dan sync.

### Endpoint berisiko

- Menambahkan helper `lib/api.ts` untuk autentikasi server, pemeriksaan origin, dan batas ukuran JSON.
- Mengamankan endpoint score dan sync dengan autentikasi server, validasi ukuran JSON, dan pemeriksaan siswa/materi yang dirujuk.
- Mengamankan impor siswa dengan autentikasi server, batas payload 2 MB, pemeriksaan kelas, dan audit log.
- Mengamankan backup, restore, login, serta ubah password dengan guard yang relevan.

### Dokumentasi

- Menambahkan `docs/todo-backend.md` sebagai backlog backend yang membedakan pekerjaan selesai dan pekerjaan yang masih perlu dibuktikan.
- Memperbarui `.env.example` untuk mendokumentasikan `DATABASE_URL` dan aturan secret production.

## Verifikasi

- `npx tsc --noEmit`: lulus.
- `npm test`: lulus, 6 file test dan 14 test.
- `npm run build`: lulus.
- `npm run perf:check`: gagal; aset browser sebesar 8.32 MB, melebihi baseline 5 MB.

## Pekerjaan lanjutan

- Menambahkan integration test untuk API tanpa session, origin lintas situs, rate-limit login, payload besar, backup/restore, snapshot, dan audit log.
- Menerapkan helper guard dan audit log yang sama ke seluruh endpoint master data dan settings.
- Menguji migration dari database versi lama dan rollback saat migration gagal.
- Memindahkan atau lazy-load `exceljs` dari bundle awal halaman siswa agar performance check lulus.
- Menambahkan panduan operasional lokasi snapshot dan prosedur pemulihan manual.

## Catatan data lokal

Migration dan build dapat mengubah file SQLite runtime (`pib.sqlite`, `pib.sqlite-wal`, dan `pib.sqlite-shm`). File tersebut tidak dihapus atau direset agar data lokal tetap terjaga.
