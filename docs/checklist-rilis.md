# Checklist Rilis PIB 0.1.0

## Fungsional
- [ ] Login guru dan route terlindungi.
- [ ] Master data dan duplikasi template berjalan.
- [ ] Nilai 0, nilai 90, dan nilai kosong tampil berbeda.
- [ ] Rekap, rata-rata berbobot, offline sync, laporan, backup, dan restore berjalan.

## Kualitas
- [x] Unit test domain lulus.
- [x] TypeScript check lulus.
- [x] Production build lulus.
- [x] Performance check client assets tersedia.
- [ ] Uji browser desktop, tablet, dan ponsel nyata.
- [ ] Uji backup/restore pada database kosong dan berisi.
- [ ] Uji laporan dengan banyak data dan teks panjang.
- [ ] Review keyboard, focus, kontras, dan pesan error.

## Operasional
- Backup JSON sebelum update.
- Simpan backup di lokasi terpisah.
- Jalankan npm install lalu npm run db:setup pada instalasi baru.
- Naikkan versi cache service worker saat asset berubah.
