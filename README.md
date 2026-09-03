# PIB Penilaian

Aplikasi lokal untuk Penilaian Praktik Ibadah. Stack: Next.js, TypeScript, SQLite langsung melalui better-sqlite3, React, ExcelJS, dan jsPDF.

## Menjalankan paling mudah

Pastikan Node.js 20 atau lebih baru terpasang, lalu jalankan satu perintah dari folder project:

```bash
./mulai-pib.sh
```

Launcher akan otomatis memasang dependency jika diperlukan, membuat konfigurasi dan secret lokal, menyiapkan database pertama kali, menjalankan build production bila belum tersedia atau sudah kedaluwarsa, menyalakan server, dan membuka browser. Untuk menghentikan server, tekan `Ctrl+C` pada terminal launcher.

Port default adalah `3000`. Jika port tersebut sedang dipakai, gunakan port lain:

```bash
PIB_PORT=3001 ./mulai-pib.sh
```

Untuk menjalankan tanpa membuka browser, misalnya pada komputer server:

```bash
PIB_NO_BROWSER=1 ./mulai-pib.sh
```

Data aplikasi tersimpan di `pib.sqlite`, sedangkan konfigurasi lokal tersimpan di `.env.local` dan tidak masuk Git.

## Menjalankan manual untuk development

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

Login demo setelah database awal dibuat: `guru@pib.local` / `pib12345`.

Nilai dihitung sebagai `90 - jumlah kesalahan`; nilai kosong berbeda dari nol.

## Verifikasi

Jalankan npm test, npx tsc --noEmit, npm run build, dan npm run perf:check.
Versi awal: 0.1.0. Unduh backup JSON sebelum melakukan update.

Panduan login tersedia di docs/panduan-login.md.
