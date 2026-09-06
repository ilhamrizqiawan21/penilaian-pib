# Pengelolaan Materi — 6 September 2026

## Periode dan data lama
- Satu ID periode menentukan tahun dan semester. API bab tidak lagi memfilter berdasarkan nama template.
- Permintaan lama yang mengirim semester berbeda dari periode ditolak.
- Semua Bab periode ditampilkan; nama template Materi Ganjil/Genap yang tidak sesuai semester diberi penanda. Tidak ada perpindahan data otomatis.
- URL periode dipertahankan pada navigasi dan breadcrumb. Tautan langsung menurunkan periode dari induknya; ketidakcocokan induk atau periode ditolak.

## Fitur
- Form tambah/edit dibuka dari daftar. Nama, deskripsi maksimal 500 karakter, dan bobot 0,1–100 memakai validasi bersama.
- Edit bobot yang memiliki nilai membutuhkan konfirmasi jumlah nilai terdampak. Server memeriksa ulang jumlah di dalam transaksi.
- Urutan naik/turun disimpan transaksional; Bab dapat diurutkan lintas template dalam satu periode tanpa mengubah ID.
- Salin periode menggunakan pratinjau, menyertakan struktur dari template aktif dan materi aktif beserta deskripsi/bobot/urutan. Nilai siswa tidak disalin.
- Nama Bab yang berbenturan pada tujuan atau berulang pada sumber menghentikan penyalinan. Semua penulisan dibatalkan jika terjadi kegagalan.
- Penambahan penghapusan tidak termasuk perubahan ini.

## Validasi
- 65 tes lulus, termasuk validasi periode/induk, perubahan bobot dan dampak Rekap, urutan, benturan nama, salinan aktif tanpa nilai, dan rollback kegagalan di tengah salinan.
- Fixture 40 item di Chrome headless lolos 24 kombinasi lebar 320–1100 px dan pembesaran 100/125/150%.
- Pemeriksaan fixture tidak menggantikan pengujian navigasi/form pada sesi pengguna yang login; alur tersebut belum diverifikasi end-to-end.
