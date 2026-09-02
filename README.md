# PIB — Penilaian Praktik Ibadah

Aplikasi lokal untuk mencatat nilai hafalan/praktik dengan nilai sempurna 90 dan pengurangan satu poin per kesalahan.

## Menjalankan aplikasi

```bash
npm install
npm run dev
```

Kemudian buka `http://localhost:3000`.

Data tersimpan dalam berkas `pib.sqlite` di folder proyek. Gunakan menu **Laporan & Backup** untuk mengunduh backup JSON sebelum memindahkan atau memperbarui aplikasi.

## Impor siswa

Siapkan file `.xlsx` dengan header di baris pertama:

```text
NIS | Nama | Kelas
```

Kolom NIS bersifat opsional.

## Input cepat

Di halaman **Nilai**, ketik jumlah kesalahan untuk siswa lalu tekan `Enter`. Aplikasi menyimpan nilai `90 − kesalahan` dan memindahkan fokus ke siswa berikutnya.
