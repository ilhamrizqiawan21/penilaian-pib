# Panduan Login PIB

## Akun awal

Pada setup awal, aplikasi membuat satu akun guru demo:

- Email: guru@pib.local
- Password: pib12345

Akun tersebut dibuat oleh perintah npm run db:setup. Script setup bersifat idempotent sehingga tidak membuat akun duplikat jika dijalankan kembali.

## Menjalankan aplikasi

1. Pasang dependency dengan `npm install`.
2. Jalankan `npm run db:setup` untuk membuat schema SQLite dan data demo.
3. Jalankan npm run dev.
4. Buka http://localhost:3000/login.
5. Masukkan email dan password akun awal.

## Session

Setelah login berhasil, aplikasi menyimpan session pada cookie httpOnly bernama pib_session. Session berlaku selama 30 hari dan digunakan untuk melindungi halaman serta API internal.

Logout dilakukan melalui POST /api/auth/logout.

## Keamanan

Akun demo hanya untuk instalasi awal. Sebelum aplikasi dipakai dengan data nyata:

- ganti password demo;
- ubah SESSION_SECRET pada file .env;
- jangan membagikan file .env;
- lakukan backup database secara berkala;
- simpan backup di lokasi terpisah.

Saat ini fitur ubah password belum tersedia di UI. Password awal sebaiknya diganti melalui tahap autentikasi lanjutan sebelum deployment produksi.
