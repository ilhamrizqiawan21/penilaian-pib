# PIB Penilaian

Aplikasi lokal untuk Penilaian Praktik Ibadah. Stack: Next.js, TypeScript, SQLite langsung melalui better-sqlite3, React, ExcelJS, dan jsPDF.

## Menjalankan paling mudah

Gunakan Node.js 24.x dan npm 11.x (setup lokal diverifikasi dengan Node.js 24.18.0 dan npm 11.16.0), lalu jalankan satu perintah dari folder project:

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

## Penggunaan otomatis dan smartphone

Pada komputer yang sudah disiapkan, `pib-penilaian.service` menjalankan aplikasi otomatis saat komputer boot. Tidak perlu menjalankan `./mulai-pib.sh` setiap kali akan memakai aplikasi.

- Komputer ini: buka `http://localhost:3000`.
- Smartphone pada Wi-Fi yang sama: buka `http://pib.local:3000`.
- Jika nama lokal tidak ditemukan oleh smartphone, gunakan `http://192.168.100.245:3000`. Alamat IP dapat berubah saat berganti jaringan.
- Smartphone dengan Tailscale aktif: buka `https://pib-server.tail633bdc.ts.net`. Alamat ini tetap sama ketika berpindah Wi-Fi atau memakai data seluler.

Komputer harus menyala dan tersambung ke Wi-Fi yang sama. Status layanan dapat diperiksa dengan:

```bash
systemctl --user status pib-penilaian.service
```

Sesudah memperbarui kode, bangun dan muat ulang layanan dengan:

```bash
npm run build
systemctl --user restart pib-penilaian.service
```

Data aplikasi tersimpan di `pib.sqlite`, sedangkan konfigurasi lokal tersimpan di `.env.local` dan tidak masuk Git.

## Menjalankan manual untuk development

```bash
# Jika menggunakan nvm:
nvm install
nvm use

# Pasang versi dependency yang dikunci di package-lock.json:
npm ci

# Buat konfigurasi lokal jika belum ada:
node -e 'const fs=require("node:fs"),crypto=require("node:crypto"); if(!fs.existsSync(".env.local")&&!fs.existsSync(".env")) fs.writeFileSync(".env.local", `DATABASE_URL="file:./pib.sqlite"\nSESSION_SECRET="${crypto.randomBytes(32).toString("hex")}"\n`, {mode:0o600})'

# Hanya untuk database baru yang belum berisi data:
npm run db:setup
npm run dev
```

Jika database `pib.sqlite` sudah tersedia, lewati `npm run db:setup` dan gunakan akun yang sudah ada. Jangan hapus database untuk memasang ulang dependency.

Versi dependency dikunci sesuai instalasi lokal; gunakan `npm ci` untuk instalasi ulang yang konsisten. Jika berpindah versi Node.js, jalankan kembali `npm ci` agar modul native SQLite sesuai dengan runtime.

Login demo setelah database awal dibuat: `guru@pib.local` / `pib12345`.

Nilai dihitung sebagai `90 - jumlah kesalahan`; nilai kosong berbeda dari nol.

## Verifikasi

Jalankan npm test, npx tsc --noEmit, npm run build, dan npm run perf:check.
Versi awal: 0.1.0. Unduh backup JSON sebelum melakukan update.

Panduan login tersedia di docs/panduan-login.md.
