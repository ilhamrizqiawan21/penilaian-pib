# PIB Penilaian

Aplikasi lokal untuk Penilaian Praktik Ibadah. Stack: Next.js, TypeScript, SQLite langsung melalui better-sqlite3, React, ExcelJS, dan jsPDF.

## Menjalankan paling mudah

Untuk pemasangan lengkap di Ubuntu/Linux x86_64 beserta autostart saat boot:

```bash
./deploy/install-local.sh
```

Installer memasang Node.js lokal sesuai `.nvmrc`, dependency terkunci, menjalankan
pemeriksaan dan build production, lalu mengaktifkan layanan systemd pengguna.
Database yang sudah ada tetap digunakan.

Gunakan Node.js 24.x dan npm 11.x (setup lokal diverifikasi dengan Node.js 24.18.0 dan npm 11.16.0), lalu jalankan satu perintah dari folder project:

```bash
./mulai-pib.sh
```

Launcher akan otomatis memasang dependency jika diperlukan, membuat konfigurasi lokal, menyiapkan database pertama kali, menjalankan build production bila belum tersedia atau sudah kedaluwarsa, menyalakan server, dan membuka browser. Aplikasi ini tidak memakai login; aksesnya sengaja dibatasi pada laptop lokal. Untuk menghentikan server, tekan `Ctrl+C` pada terminal launcher.

Port aplikasi ditetapkan satu jalur pada `3000`: Lerd, launcher, systemd, dan Next.js memakai port ini. Launcher sengaja tidak menerima override port agar tidak ada dua konfigurasi yang berbeda. Buka aplikasi melalui:

```text
http://localhost:3000
```

Jangan mengganti port kecuali konfigurasi Lerd, launcher, dan service systemd diubah bersama-sama.

Untuk menjalankan tanpa membuka browser, misalnya pada komputer server:

```bash
PIB_NO_BROWSER=1 ./mulai-pib.sh
```

## Penggunaan otomatis dan smartphone

Runtime Node.js lokal dapat disimpan di `.runtime/node-v24.18.0-linux-x64`.
Launcher otomatis menggunakan runtime tersebut. Untuk menjalankan perintah npm di terminal:

```bash
export PATH="$PWD/.runtime/node-v24.18.0-linux-x64/bin:$PATH"
```

Untuk memasang layanan pengguna pada folder `~/Projects/penilaian-pib`:

```bash
mkdir -p ~/.config/systemd/user
cp deploy/pib-penilaian.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now pib-penilaian.service
loginctl enable-linger "$USER"
```

Linger memungkinkan layanan berjalan saat boot tanpa menunggu login.
Alamat jaringan di bawah berasal dari konfigurasi sebelumnya; gunakan IP komputer
saat ini jika nama lokal atau Tailscale belum dikonfigurasi pada komputer ini.

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

Jika database `pib.sqlite` sudah tersedia, lewati `npm run db:setup`. Jangan hapus database untuk memasang ulang dependency.

Versi dependency dikunci sesuai instalasi lokal; gunakan `npm ci` untuk instalasi ulang yang konsisten. Jika berpindah versi Node.js, jalankan kembali `npm ci` agar modul native SQLite sesuai dengan runtime.

Pada pemakaian normal tidak ada halaman login. Data tetap memakai operator lokal internal untuk mencatat histori perubahan.

Nilai dihitung sebagai `90 - jumlah kesalahan`; nilai kosong berbeda dari nol.

## Verifikasi

Jalankan npm test, npx tsc --noEmit, npm run build, dan npm run perf:check.
Versi awal: 0.1.0. Unduh backup JSON sebelum melakukan update.

Panduan akses lokal dan auto-start tersedia di bagian penggunaan otomatis di atas.
