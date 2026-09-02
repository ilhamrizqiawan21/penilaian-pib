# TODO Penyelesaian PIB — Penilaian Praktik Ibadah

Dokumen ini menjadi daftar kerja untuk menyelesaikan aplikasi dari MVP saat ini menjadi aplikasi yang siap diuji dan dipakai guru. Status awal berdasarkan pemeriksaan kode pada 2 September 2026.

Legenda: `[x]` selesai, `[~]` sebagian, `[ ]` belum dikerjakan.

## 1. Fondasi data

- [~] Simpan data lokal menggunakan SQLite.
- [x] Buat entitas **tahun ajaran** dan semester, termasuk pilihan tahun ajaran aktif.
- [x] Buat entitas **kelas** yang terhubung ke tahun ajaran (tingkat, nama kelas, wali kelas opsional).
- [x] Hubungkan siswa ke kelas melalui ID, bukan teks nama kelas.
- [x] Tambahkan NISN, jenis kelamin, dan status aktif siswa.
- [~] Sediakan edit, nonaktifkan, dan hapus data siswa dengan perlindungan data nilai terkait. Edit/nonaktifkan sudah tersedia; API menolak hapus permanen bila siswa memiliki nilai.
- [~] Sediakan edit, urutkan, nonaktifkan, dan hapus bab, subbab, serta materi. Edit/nonaktifkan sudah tersedia; API menolak hapus permanen bila materi memiliki nilai. Kontrol urutan di UI masih perlu ditambahkan.
- [x] Tambahkan deskripsi dan bobot materi (nilai awal bobot: 1).
- [~] Siapkan halaman pengaturan sekolah, guru/penilai, rentang nilai, dan predikat. Identitas sekolah/guru dan rentang nilai sudah tersedia; predikat masih belum dibuat.
- [x] Definisikan migrasi database agar perubahan skema aman untuk data yang sudah ada.

## 2. Penilaian inti

- [x] Input nilai per siswa untuk satu materi.
- [x] Hitung nilai dengan pola `90 - jumlah kesalahan`.
- [x] Simpan perubahan nilai ke database.
- [~] Tampilkan nilai yang belum diisi sebagai tanda strip.
- [ ] Putuskan dan dokumentasikan apakah semua materi memakai rumus `90 - kesalahan`, atau sediakan mode input nilai langsung 0–100.
- [ ] Tambahkan validasi rentang nilai sesuai pengaturan.
- [ ] Tambahkan kolom keterangan/note pada tabel penilaian.
- [ ] Tambahkan paraf/inisial penilai.
- [ ] Tambahkan tanggal penilaian dan nama penilai yang dapat diubah.
- [ ] Tampilkan indikator jumlah siswa sudah/belum dinilai untuk materi aktif.
- [ ] Tampilkan indikator materi belum lengkap per kelas dan subbab.
- [ ] Tambahkan konfirmasi atau mekanisme aman untuk mengosongkan/menghapus nilai.
- [ ] Pastikan nilai kosong tetap berbeda dari nilai `0` di seluruh UI dan laporan.

## 3. Rekap dan filter

- [~] Tampilkan rata-rata untuk materi yang sedang dipilih.
- [ ] Buat halaman rekap per siswa: nilai tiap materi, total, rata-rata, dan status kelengkapan.
- [ ] Buat halaman rekap per kelas: rata-rata siswa, rata-rata materi, dan jumlah nilai belum diisi.
- [ ] Hitung rata-rata berbobot bila bobot materi diaktifkan.
- [ ] Hitung status selesai subbab ketika semua siswa pada seluruh materinya telah dinilai.
- [ ] Tambahkan filter tahun ajaran, semester, kelas, bab, subbab, materi, dan siswa.
- [ ] Tambahkan pencarian siswa.
- [ ] Tambahkan tampilan keadaan kosong yang jelas saat belum ada kelas, siswa, atau materi.

## 4. Laporan dan ekspor

- [x] Ekspor Excel nilai detail.
- [x] Buat PDF rekap dasar.
- [ ] Tambahkan pilihan cakupan laporan: per kelas, per siswa, per bab/subbab, atau seluruh periode.
- [ ] Terapkan filter aktif pada hasil ekspor Excel dan PDF.
- [ ] Lengkapi Excel dengan total, rata-rata, status belum dinilai, bobot, paraf, dan keterangan.
- [ ] Rancang PDF A4 yang memuat identitas sekolah/guru, tahun ajaran, kelas, daftar materi, nilai, total, rata-rata, paraf, dan keterangan.
- [ ] Uji PDF untuk banyak siswa/materi: pemenggalan halaman, judul berulang, dan teks panjang.
- [ ] Minta contoh buku fisik bila PDF perlu menyerupai format buku tersebut.

## 5. PWA, backup, dan ketahanan data

- [x] Sediakan manifest PWA dan service worker cache dasar.
- [x] Sediakan backup dan restore JSON.
- [ ] Tambahkan ikon aplikasi PWA berbagai ukuran.
- [ ] Uji instalasi PWA di Android, iOS, dan desktop.
- [ ] Buat strategi cache versi baru agar pengguna memperoleh pembaruan aplikasi dengan aman.
- [ ] Simpan perubahan nilai saat offline di IndexedDB.
- [ ] Buat antrean sinkronisasi saat koneksi kembali tersedia.
- [ ] Tampilkan status online/offline dan status sinkronisasi kepada pengguna.
- [ ] Validasi isi backup sebelum menghapus data yang sedang ada.
- [ ] Buat backup otomatis atau pengingat backup sebelum pembaruan aplikasi.
- [ ] Uji restore pada database kosong dan database yang telah berisi data.

## 6. Pengguna dan penyebaran

- [ ] Tetapkan ruang lingkup: satu guru di satu perangkat atau banyak guru/perangkat.
- [ ] Untuk banyak pengguna, tambahkan autentikasi dan peran admin/guru.
- [ ] Untuk banyak perangkat, pindahkan database ke PostgreSQL/server bersama dan buat sinkronisasi data.
- [ ] Tentukan cara pemasangan: komputer lokal, jaringan sekolah, atau cloud.
- [ ] Dokumentasikan instalasi, pembaruan, lokasi database, dan prosedur backup untuk operator sekolah.

## 7. Kualitas dan rilis

- [ ] Tambahkan pengujian unit untuk rumus nilai, nilai kosong, pembobotan, dan progres subbab.
- [ ] Tambahkan pengujian API untuk siswa, materi, nilai, impor, backup, dan restore.
- [ ] Uji impor Excel: NIS kosong, NIS ganda, header salah, baris kosong, dan karakter khusus.
- [ ] Uji akses dari ponsel/tablet, terutama tabel input nilai.
- [ ] Tambahkan pesan kesalahan dan notifikasi sukses yang konsisten.
- [ ] Tinjau aksesibilitas: label input, navigasi keyboard, kontras, dan fokus.
- [ ] Tinjau keamanan input dan validasi seluruh API.
- [ ] Buat data contoh untuk demonstrasi dan uji penerimaan bersama guru.
- [ ] Lakukan uji coba dengan data penilaian nyata dan catat penyesuaian yang diperlukan.
- [ ] Buat commit Git awal sebelum pengembangan lanjutan.
- [ ] Siapkan checklist rilis dan nomor versi aplikasi.

## Urutan pengerjaan yang disarankan

1. Selesaikan model data tahun ajaran, kelas, siswa, dan materi; sertakan migrasi serta operasi edit/hapus aman.
2. Lengkapi input penilaian dengan keterangan, paraf, tanggal, indikator kelengkapan, serta aturan nilai yang disepakati.
3. Bangun rekap dan filter karena menjadi dasar laporan yang benar.
4. Perluas ekspor Excel dan PDF berdasarkan rekap/filter tersebut.
5. Uji backup/restore dan penggunaan nyata; lanjutkan PWA offline setelah alur inti stabil.
6. Tambahkan autentikasi dan server bersama hanya jika aplikasi akan digunakan oleh lebih dari satu guru/perangkat.

## Keputusan yang perlu dikonfirmasi sebelum tahap lanjutan

- Apakah rumus nilai tetap selalu `90 - jumlah kesalahan`, atau perlu skala/bobot yang dapat dikonfigurasi?
- Apakah PDF perlu sama persis dengan buku fisik? Jika ya, siapkan contoh halaman buku yang dipakai.
- Apakah aplikasi dipakai oleh satu guru pada satu perangkat atau beberapa guru/perangkat?
- Apakah impor siswa dari Excel harus mempertahankan format tertentu dari sekolah?
