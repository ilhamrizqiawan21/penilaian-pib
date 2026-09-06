# Perbaikan Penilaian — 6 September 2026

- Pilihan kelas dan materi diringkas setelah materi terpilih, dengan tombol Ubah pilihan.
- Layout mengikuti lebar area kerja: tabel lengkap di atas 860 px, tabel dengan tindakan dua baris pada 601–860 px, kartu pada 600 px atau kurang.
- Kolom tindakan memiliki alokasi lebar sendiri. Nama siswa dapat membungkus; status dan nilai disusun vertikal.
- Nama siswa 16 px, status 12 px, keterangan 13 px, input 16 px, nilai 20 px.
- Sorotan mengikuti fokus input atau tombol pada siswa.
- Simpan dan Enter memindahkan fokus setelah draft berhasil ditulis ke perangkat, sebelum pengiriman selesai. Kegagalan tetap ditampilkan pada draft terkait.
- Simpan draft valid melewati input tidak valid dan konflik; ringkasan menyebut draft yang tersisa.
- Jumlah belum dinilai dihitung dari nilai server yang kosong. Perubahan belum dikirim ditampilkan terpisah dari persentase tersimpan.
- Draft kosong menampilkan peringatan pengosongan nilai. Tombol pengosongan tetap memakai konfirmasi.

Rumus tetap 90 dikurangi jumlah kesalahan. Kriteria satu kesalahan per materi memerlukan pedoman sekolah; tidak dibuat secara otomatis.

Verifikasi: TypeScript dan 39 tes lulus. Browser CUA tidak terhubung saat pengerjaan; pemeriksaan visual dengan kelas besar, nama panjang, dan perpindahan ukuran masih diperlukan.
