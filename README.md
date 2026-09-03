# PIB Penilaian

Aplikasi lokal untuk Penilaian Praktik Ibadah. Stack: Next.js, TypeScript, SQLite langsung melalui better-sqlite3, React, ExcelJS, dan jsPDF.

## Menjalankan

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

Login demo: `guru@pib.local` / `pib12345`.

Nilai dihitung sebagai `90 - jumlah kesalahan`; nilai kosong berbeda dari nol.

## Verifikasi

Jalankan npm test, npx tsc --noEmit, npm run build, dan npm run perf:check.
Versi awal: 0.1.0. Unduh backup JSON sebelum melakukan update.

Panduan login tersedia di docs/panduan-login.md.
