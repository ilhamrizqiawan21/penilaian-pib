# TODO Backend Fase 1 — Stabilitas & Keamanan Lokal

Target: satu guru pada satu komputer lokal. Status hanya boleh dicentang setelah ada test atau bukti acceptance.

## Konfigurasi dan autentikasi

- [x] Pusatkan `DATABASE_URL` dan `SESSION_SECRET` pada `lib/env.ts`.
- [x] Tolak secret production yang default atau kurang dari 32 karakter; session tetap 30 hari, cookie `httpOnly` dan `SameSite=Lax`.
- [x] Tambahkan pembatasan lima percobaan login per email selama lima menit.
- [ ] Tambahkan test environment production dan rate-limit login.

## Integritas API dan data

- [x] Middleware menolak request tulis dengan origin lintas situs.
- [x] Tambahkan guard server-side pada score, sync, backup, restore, impor, dan ubah password.
- [x] Batasi body JSON pada endpoint yang telah dihardening dan validasi relasi score/sync.
- [ ] Terapkan helper guard serta audit log yang sama pada seluruh endpoint master data dan settings.
- [ ] Tambahkan integration test tanpa session, payload terlalu besar, ID relasi tidak ada, dan audit log.

## SQLite dan migrasi

- [x] Ganti schema saat import dengan migration runner berversi dan transaksional.
- [x] Aktifkan WAL/foreign key dari satu modul database dan tambahkan indeks query utama.
- [x] Buat snapshot SQLite sebelum migrasi dan restore; abaikan database/WAL/SHM runtime dari Git.
- [ ] Uji upgrade database versi 1, rollback migration gagal, dan benchmark dataset besar.

## Backup dan pemulihan

- [x] Ubah backup menjadi format data-only v2 dengan metadata aplikasi dan schema.
- [x] Tidak ekspor atau pulihkan tabel akun/password; akun lokal tetap digunakan.
- [x] Restore tervalidasi, atomik, memeriksa foreign key, membuat snapshot, dan mencatat hasilnya.
- [ ] Uji backup kosong/berisi, restore invalid tanpa perubahan data, dan ketersediaan snapshot.

## Kriteria selesai

- [ ] `npm test`, typecheck, build, API smoke test, dan performance check lulus.
- [ ] Dokumentasi operasional menjelaskan lokasi snapshot dan prosedur pemulihan manual.
