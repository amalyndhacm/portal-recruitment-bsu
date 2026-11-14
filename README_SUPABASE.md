# Portal Recruitment — Supabase

Aplikasi ini memakai Supabase untuk **database PostgreSQL, Auth, Storage, dan Edge Functions**. Tampilan dan fitur portal dipertahankan. Agar beragam bentuk data pada semua modul tetap kompatibel, data modul disimpan di satu tabel fisik `public.portal_records` dengan `table_name` dan `payload` JSONB. Anda tidak perlu membuat puluhan tabel satu per satu.

## Persiapan Supabase

1. Buat project di Supabase.
2. Buka **SQL Editor**, tempel seluruh isi [`supabase/schema.sql`](supabase/schema.sql), lalu jalankan. SQL tersebut membuat tabel data, index, trigger profil Auth, policies RLS, bucket Storage, serta fungsi RPC untuk verifikasi PRK dan riwayat chatbot.
3. Buka **Project Settings → API** dan salin Project URL serta `anon` / publishable key. Jangan memakai `service_role` key pada frontend.
4. Salin `.env.example` menjadi `.env`, lalu isi:

   ```env
   VITE_SUPABASE_URL=https://project-anda.supabase.co
   VITE_SUPABASE_ANON_KEY=isi-anon-atau-publishable-key
   ```

   Nilai `VITE_` akan masuk ke build browser, jadi hanya boleh berisi URL dan public/anon key. RLS pada SQL adalah lapisan proteksi data.
5. Di **Authentication → URL Configuration**, isi Site URL sesuai alamat aplikasi dan tambahkan redirect URLs untuk alamat lokal serta produksi.
6. Jalankan `npm install`, kemudian `npm run dev`. Untuk memastikan build dan tipe TypeScript: `npm run build` dan `npm run typecheck`.

Supabase Auth mengirim email reset password melalui pengaturan email Supabase. Akun staf di portal memakai NIP sebagai identitas dan aplikasi mengubahnya menjadi `NIP@portal.internal`. Karena alamat tersebut bukan alamat email yang dapat menerima konfirmasi, matikan **Confirm email** pada Authentication → Providers → Email untuk alur pendaftaran staf ini, atau buat akun staf melalui dashboard Auth. Kandidat dapat memakai email sungguhan; bila konfirmasi email diaktifkan, mereka perlu menyelesaikan konfirmasi dari emailnya.

## Mengaktifkan akses staf

Pendaftaran staf otomatis membuat profil dengan role `unknown` dan tidak diberi akses ke data operasional. Setelah akun dibuat dan profil muncul, administrator perlu menetapkan role melalui SQL Editor. Ganti alamat email dengan email internal akun staf yang didaftarkan:

```sql
update public.portal_records
set payload = payload || jsonb_build_object('role', 'recruitment'),
    updated_at = now()
where table_name = 'profiles'
  and lower(payload->>'email') = lower('NIPANDA@portal.internal');
```

Nilai role yang didukung antara lain `recruitment`, `training`, `hr`, `comben`, `admin`, `super_admin`, dan `atasan`. Minta staf keluar lalu masuk kembali setelah role diubah. Jangan memberikan role melalui `user_metadata` dari browser; akses staf divalidasi dari profil yang tersimpan di database.

## Penyimpanan berkas dan notifikasi wawancara

SQL membuat tiga bucket: `home-gallery` dan `job-flyers` bisa dibaca publik (untuk media yang memang tampil pada portal), sementara `prk-documents` bersifat privat. Upload dan penghapusan bucket dibatasi bagi staf aktif. Data lampiran yang sudah tersimpan pada project/database lama tidak otomatis dipindah.

Untuk mempertahankan pengiriman email/WhatsApp jadwal wawancara, deploy Edge Function dari root proyek dengan Supabase CLI:

```bash
supabase login
supabase link --project-ref PROJECT_REF
supabase functions deploy send-interview-notification
```

Tambahkan secret hanya bila menggunakan layanan tersebut:

```bash
supabase secrets set RESEND_API_KEY=... RESEND_FROM='Recruitment <hr@contoh.id>' FONNTE_TOKEN=...
```

`SUPABASE_SERVICE_ROLE_KEY` tidak perlu Anda atur sebagai secret manual; runtime Edge Function menyediakannya. Function memeriksa sesi dan role staf sebelum mengirim pesan. Jika secret provider tidak diisi, status notifikasi akan menandai layanan terkait sebagai dilewati/gagal konfigurasi—fitur lain tetap berjalan.

## Catatan data & keamanan

- ZIP ini menyiapkan **struktur aplikasi**, bukan menyalin record dari database PostgreSQL/Supabase lama. Buat backup dan rencanakan impor data lama secara terpisah bila dibutuhkan.
- RLS membatasi data HR/rekrutmen untuk staf ber-role; akun kandidat hanya dapat membaca data lamarannya sendiri. Pengajuan lamaran publik, lowongan aktif, galeri terbit, dan verifikasi QR PRK memakai akses publik yang dibatasi.
- Jangan pernah menaruh `service_role key`, password database, atau credential provider di `.env` frontend, ZIP publik, maupun browser.
- Arsip sengaja tidak menyertakan `.env`, `node_modules`, server PostgreSQL lama, skrip ekspor/impor yang tak terpakai, maupun file konfigurasi editor. Jalankan `npm install` setelah ekstraksi.
- Berkas media perusahaan yang dipakai oleh halaman publik tetap disertakan.
