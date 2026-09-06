# Audit proyek — tahap 1: Beranda

## Cakupan

Peninjauan struktur Next.js, navigasi, autentikasi halaman, kontrak filter halaman tujuan, dan dokumentasi audit sebelumnya. Pemeriksaan serta perubahan rinci tahap ini berfokus pada `/dashboard`; menu lain belum dinyatakan selesai diaudit. Pengujian query menggunakan SQLite in-memory.

## Temuan dan perubahan beranda

| Temuan | Dampak | Perubahan |
| --- | --- | --- |
| Status selesai bergantung pada persentase yang dibulatkan | 999 dari 1.000 nilai dapat terlihat selesai | Selesai ditentukan dari jumlah tepat; persentase belum selesai maksimal 99% |
| Kelas tanpa siswa/materi ditampilkan sebagai 0% dengan nol pekerjaan tersisa | Tidak jelas apa yang harus disiapkan | Status “Belum siap”, petunjuk persiapan, dan tautan ke siswa/materi |
| Sesi terakhir di localStorage tidak dibatasi periode | Tombol lanjut dapat membuka kelas di luar filter beranda | Kelas sesi terakhir harus ada di periode terpilih; ID konteks divalidasi |
| Tombol mulai tanpa query memulihkan sesi lama secara otomatis di halaman penilaian | Sesi lintas periode tetap terbuka meskipun kartu tidak menawarkan lanjut | Kirim classId eksplisit; pilih langsung jika periode hanya memiliki satu kelas |
| Pembacaan sesi dan draft berada dalam satu try/catch | JSON sesi rusak menyembunyikan jumlah draft | Pembacaan dipisahkan; perubahan storage antartab ikut didengarkan |
| Nama kelas identik dari beberapa periode sulit dibedakan | Pengguna sulit memilih kelas yang benar | Tampilkan periode pada daftar “Semua periode” |
| Daftar hanya menampilkan maksimal lima kelas tanpa keterangan | Cakupan ringkasan tidak jelas | Tampilkan jumlah kelas yang ditampilkan dan akses rekap |
| Tidak ada loading/error boundary khusus beranda | Proses perpindahan dan kegagalan data tidak memiliki umpan balik lokal | Tambahkan loading, error dengan retry, dan indikator perpindahan periode |
| Query menghitung materi lewat subquery berkorelasi | Query sulit dirawat dan diuji | Pisahkan agregasi siswa, materi, dan nilai dalam CTE; ekstrak fungsi query |

Aturan perhitungan dipertahankan: siswa dan kelas aktif, materi aktif dari tahun ajaran kelas, nilai nol dihitung, nilai NULL belum dinilai. Aktivitas dan jumlah draft tetap mencakup seluruh periode dengan label eksplisit. Status selesai berlaku pada pasangan siswa–materi yang tersedia; peringatan persiapan tetap muncul jika kelas lain belum siap.

## Verifikasi

- TypeScript: lulus.
- Build produksi: lulus, 35 halaman dihasilkan; first-load JS beranda 111 kB.
- Pemeriksaan ukuran aset browser: lulus (batas 5 MB).
- `git diff --check`: lulus.
- Vitest: 39 tes lulus pada 14 file, termasuk dua tes baru beranda.
- Tes query mencakup lintas periode, nama kelas identik, materi/siswa/kelas nonaktif, kelas kosong, periode tanpa materi, nilai 0, nilai NULL, serta filter periode tanpa hasil.
- Tes progres memverifikasi 999/1.000, 1.000/1.000, dan total nol.
- Browser tidak terhubung pada sesi ini: tata letak 360/768/1280 px, keyboard, perpindahan periode, storage antartab, dan retry belum diverifikasi melalui UI.
- Refactor query belum dibenchmark pada volume data besar; belum ada klaim peningkatan waktu respons.

## Urutan audit menu berikutnya

1. Penilaian: validasi konteks sesi hingga materi aktif, tanggal/paraf/catatan, draft offline, konflik, dan penyimpanan massal.
2. Rekap: konsistensi filter URL, nilai kosong/nol, bobot, dan kesesuaian dengan ekspor.
3. Sekolah & tahun, Kelas, Siswa, Materi: alur persiapan, dependensi periode, validasi dan impor, serta kondisi kosong.
4. Ekspor & backup: format laporan, kelengkapan backup, dan uji restore atomik pada database terisolasi.
5. Akun serta navigasi bersama: sesi, feedback kegagalan, keyboard, dan tampilan ponsel.

Pekerjaan lintas menu yang masih diperlukan: harness browser dengan fixture terisolasi dan pemeriksaan tampilan pada perangkat tujuan. Tautan umum “Kelola siswa”/“Lihat kelas” dari kartu statistik masih membuka daftar umum; dukungan filter tahun perlu dikerjakan bersama menu tujuan.
