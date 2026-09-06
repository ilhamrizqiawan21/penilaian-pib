# Rekap — 6 September 2026

## Perhitungan
- Rekap dan ekspor menggunakan sumber baris yang sama, dengan rata-rata berbobot dari nilai terisi. Nilai nol tetap dihitung; nilai kosong tidak dihitung sebagai nol.
- Ringkasan laporan menggabungkan pembilang dan penyebut asli, bukan merata-ratakan angka rata-rata siswa yang telah dibulatkan. Angka laporan lama dapat berubah saat kelengkapan atau bobot berbeda.
- Excel Rekap Siswa/Kelas memakai agregasi yang sama dengan layar dan identitas ID; siswa bernama sama tidak digabung.
- Siswa aktif tanpa materi tetap muncul saat tidak ada filter materi, dengan expected=0 dan status Materi belum tersedia.
- Filter materi yang tidak cocok tetap menghasilkan hasil kosong, bukan baris siswa yang tidak relevan.
- Progres yang belum lengkap dibatasi 99%; hanya jumlah terisi tepat sama dengan kebutuhan, dan kebutuhan >0, menghasilkan 100%.

## Penggunaan
- Kelengkapan dibedakan menjadi Belum dinilai, Sebagian, Lengkap, dan Materi belum tersedia.
- Periode terlihat bersama kelas/subbab. Filter materi mengikuti periode kelas jika periode belum dipilih.
- Lihat nilai membuka rincian sesuai filter yang diterapkan. Tautan Lengkapi nilai membawa konteks kelas/materi dan memfokuskan siswa di Penilaian.
- Tabel ringkas menjadi default khusus Rekap, tanpa mengubah default menu lain. Tampilan mengikuti lebar area kerja.

## Validasi
- 55 tes lulus, termasuk query lintas periode, nilai nol/kosong, pembobotan, status, validasi rincian siswa, serta pemeriksaan nilai dalam workbook Excel dan pembuatan PDF.
- Chrome headless: fixture 40 siswa, delapan lebar dan pembesaran 100/125/150%, 24 kombinasi tanpa overflow.
- Fixture memverifikasi struktur layout dengan CSS aplikasi; alur interaktif pada sesi pengguna yang login belum diuji end-to-end.
