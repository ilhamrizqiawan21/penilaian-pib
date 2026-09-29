# Setoran (pengganti Tes per Individu)

Halaman `/individual-assessment` kini berjudul **Setoran**. Alurnya dirancang untuk
satu pertemuan ketika beberapa siswa maju bergantian dengan materi berbeda sesuai
progres masing-masing.

## Alur

1. Pilih kelas sekali (diingat di perangkat).
2. Pilih siswa dengan satu klik di daftar kiri, atau tekan `/`, ketik nama, Enter.
   Setiap siswa menampilkan posisi materi berikutnya (`11/21`). Siswa yang dinilai
   hari ini tampil paling atas.
3. Seluruh materi kelas tampil dalam satu daftar per subbab; kursor langsung berada
   di materi berikutnya. Materi sebelum posisi terjauh yang belum dinilai ditandai
   **Terlewat**.
4. Ketik jumlah kesalahan lalu Enter: nilai langsung dikirim dan kursor pindah ke
   materi berikutnya. Tombol **90** menyimpan 0 kesalahan seketika.

Draft tetap disimpan di perangkat sebelum dikirim, sehingga input tidak hilang saat
jaringan putus (status *Menunggu koneksi*) atau terjadi konflik versi.

## Implementasi

- `GET /api/class-progress?classId=` (`lib/class-progress.ts`) mengembalikan materi
  periode kelas sesuai urutan kurikulum, siswa aktif, dan seluruh baris nilai dalam
  satu permintaan. Baris nilai yang dikosongkan ikut dikirim karena `updated_at`-nya
  dipakai untuk deteksi konflik sinkronisasi.
- `studentPosition` menentukan materi berikutnya dan materi terlewat.
- Penyimpanan tetap memakai `/api/sync` melalui `submitScore`.
- API `individual-sessions` lama dihapus; tabelnya dibiarkan agar data lama aman.
- Tes per Materi memakai endpoint yang sama untuk satu pemilih materi berkelompok
  (menggantikan dropdown Bab → Subbab → Materi). Tautan lama dengan `chapterId`/`subId`
  tetap berfungsi karena materi divalidasi dari `assessmentId`.

## Verifikasi 2026-09-29

- `npm test`: 71 tes lulus, termasuk `lib/class-progress.test.ts`.
- `npx tsc --noEmit` dan `next build` lulus.
- Uji browser (Chrome + playwright-core, salinan database, port terpisah): 22
  pemeriksaan lulus, meliputi pintasan `/`, Enter simpan & lanjut, tombol 90, urutan
  "Dinilai hari ini", ganti siswa satu klik, input tidak valid tidak terkirim,
  pemulihan kelas/siswa setelah reload, nilai tersimpan di database, tanpa overflow
  horizontal di 375px, pemilih materi, dan tautan dari Rekap.
