# CRUD Produk — Next.js + MySQL (Aiven) + Vercel

Aplikasi CRUD sederhana (Create, Read, Update, Delete) untuk data produk dan stok,
dibangun dengan Next.js App Router dan database MySQL, siap deploy ke Vercel
dengan database di Aiven.

## Struktur Project

```
app/
  api/products/route.js         -> GET (list), POST (create)
  api/products/[id]/route.js    -> GET (detail), PUT (update), DELETE
  page.js                       -> Halaman utama (tabel + form)
  layout.js
  globals.css
lib/
  db.js                         -> Koneksi pool MySQL (support SSL Aiven)
schema.sql                     -> Skema tabel `products` dan `stocks`
.env.local.example              -> Contoh environment variables
```

## 1. Buat Database di Aiven

1. Login ke https://aiven.io lalu buat service baru → pilih **MySQL** → plan **Free**.
2. Pilih region terdekat, tunggu status menjadi "Running".
3. Buka tab **Overview**, catat: `Host`, `Port`, `User` (biasanya `avnadmin`), `Password`, `Database name` (default `defaultdb`).
4. Download **CA Certificate** (`ca.pem`) dari halaman yang sama.
5. Aplikasi membuat tabel `products` dan `stocks` secara otomatis saat API
   pertama kali dipanggil. Pastikan `DB_NAME` menunjuk ke database yang benar
   dan user database memiliki izin membuat tabel. Alternatifnya, buat manual
   lewat Aiven Console (query editor) atau CLI MySQL:
   ```bash
   mysql --host=<HOST> --port=<PORT> --user=<USER> --password=<PASSWORD> \
     --database=<DBNAME> --ssl-mode=REQUIRED < schema.sql
   ```

Skema membuat satu baris stok untuk setiap produk. Jika tabel `stocks`
sudah dibuat sebelumnya tanpa batas unik `product_id`, tambahkan indeks ini
(pastikan tidak ada beberapa baris stok untuk produk yang sama terlebih dahulu):

```sql
ALTER TABLE stocks ADD UNIQUE KEY uq_stocks_product_id (product_id);
```

## 2. Setup Project Secara Lokal

```bash
npm install
cp .env.local.example .env.local
```

Isi `.env.local` dengan kredensial Aiven kamu:

```
DB_HOST=your-service.aivencloud.com
DB_PORT=xxxxx
DB_USER=avnadmin
DB_PASSWORD=xxxxx
DB_NAME=defaultdb
DB_CA_CERT=<base64 dari ca.pem>
```

Generate nilai `DB_CA_CERT` dari file `ca.pem` yang tadi didownload:

```bash
base64 -i ca.pem | tr -d '\n'
```

Copy hasilnya (satu baris panjang) ke `.env.local`.

Jalankan secara lokal:

```bash
npm run dev
```

Buka http://localhost:3000 — kamu akan melihat form tambah produk (termasuk stok)
dan tabel daftar produk beserta jumlah stoknya.

## 3. Push ke GitHub

```bash
git init
git add .
git commit -m "Initial commit: CRUD produk Next.js + MySQL"
git branch -M main
git remote add origin https://github.com/username/nama-repo.git
git push -u origin main
```

Pastikan `.env.local` **tidak** ikut ter-commit (sudah otomatis diabaikan lewat `.gitignore`).

## 4. Deploy ke Vercel

1. Login ke https://vercel.com dengan akun GitHub.
2. Klik **Add New → Project**, pilih repo yang baru saja di-push.
3. Di bagian **Environment Variables**, tambahkan variabel yang sama persis seperti di `.env.local`:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
   - `DB_CA_CERT`
4. Klik **Deploy**.
5. Setelah selesai, buka URL yang diberikan Vercel (`https://nama-project.vercel.app`) — aplikasi CRUD sudah bisa dipakai.

## Fitur

- **Create**: tambah produk baru lewat form (nama, deskripsi, harga, stok)
- **Read**: daftar semua produk otomatis dimuat saat halaman dibuka
- **Update**: klik "Edit" pada baris produk untuk mengubah data produk dan stok
- **Delete**: klik "Hapus" untuk menghapus produk (dengan konfirmasi)
- **Stok**: jumlah stok disimpan di tabel `stocks` dan otomatis mulai dari 0

## Catatan

- Free tier Aiven MySQL bisa nonaktif otomatis setelah periode idle tertentu — kamu akan mendapat notifikasi email sebelum itu terjadi.
- Kalau ingin menambah kolom atau tabel baru, cukup ubah `schema.sql` dan sesuaikan query di `app/api/products/`.
- Untuk validasi input yang lebih ketat atau autentikasi (login admin), beri tahu saya — bisa ditambahkan.
