# Aturan Penilaian Inti

## Keputusan versi saat ini

Semua materi PIB memakai satu metode input yang sama: guru memasukkan **jumlah kesalahan**, lalu aplikasi menghitung nilai secara otomatis.

```text
nilai = 90 − jumlah kesalahan
```

Contoh: `0` kesalahan menghasilkan nilai `90`; `3` kesalahan menghasilkan nilai `87`.

## Batas dan arti nilai

- Jumlah kesalahan yang dapat dimasukkan adalah bilangan bulat `0` sampai `90`.
- Nilai yang dihasilkan berada pada rentang `0` sampai `90`.
- Nilai kosong berarti **Belum dinilai**, bukan nilai `0`.
- Nilai `0` hanya tercatat saat guru memasukkan `90` kesalahan.

## Alasan keputusan

Metode ini selaras dengan penggunaan aplikasi saat ini untuk hafalan/praktik dengan nilai sempurna 90 dan pengurangan satu poin per kesalahan. Satu metode yang konsisten mempercepat input di kelas dan menghindari tercampurnya dua skala nilai pada rekap yang sama.

## Perubahan di masa depan

Mode input nilai langsung `0–100` dapat dipertimbangkan sebagai fitur lanjutan. Jika ditambahkan, mode tersebut harus dipilih per materi dan dicantumkan di laporan agar nilai dari dua metode tidak disalahartikan.
