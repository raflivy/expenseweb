# Panduan Instalasi dan Konfigurasi

## ⚠️ PENTING: Cara Menjalankan Aplikasi

**Gunakan `npm run dev`, BUKAN Live Server!**

Aplikasi ini adalah **Full-Stack Application** dengan:

- Frontend: HTML + Tailwind CSS + Alpine.js
- Backend: Node.js + Express + PostgreSQL

Live Server hanya untuk static HTML. Aplikasi ini butuh Node.js server untuk:

- API endpoints (`/api/*`)
- Database connection
- Session management
- Authentication

## Prasyarat

1. **Node.js** (versi 16 atau lebih baru)
2. **PostgreSQL** database
3. **Git** (opsional)

## Instalasi

### 1. Clone atau Download Project

```bash
# Jika menggunakan Git
git clone <repository-url>
cd expendphp

# Atau download dan extract file ZIP
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi Database

1. Buat database PostgreSQL baru:

```sql
CREATE DATABASE expense_tracker;
```

2. Copy file environment:

```bash
cp .env.example .env
```

3. Edit file `.env` dan sesuaikan dengan konfigurasi database Anda:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/expense_tracker?schema=public"
SESSION_SECRET="your-super-secret-session-key"
ADMIN_PASSWORD_HASH="$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
PORT=3000
```

### 4. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema ke database
npx prisma db push

# Seed database dengan data default
node prisma/seed.js
```

### 5. Jalankan Aplikasi

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Aplikasi akan berjalan di `http://localhost:3000`

## Konfigurasi Lanjutan

### Mengubah Password Default

Password default adalah `admin123`. Untuk mengubah password:

1. Generate hash password baru:

```bash
node -e "console.log(require('bcryptjs').hashSync('password-baru-anda', 10))"
```

2. Update `ADMIN_PASSWORD_HASH` di file `.env` dengan hash yang dihasilkan.

### Database Management

```bash
# Lihat database dengan Prisma Studio
npm run db:studio

# Reset database
npx prisma db push --force-reset

# Migrate database (untuk production)
npm run db:migrate
```

### Backup Database

```bash
# Backup
pg_dump -U username -d expense_tracker > backup.sql

# Restore
psql -U username -d expense_tracker < backup.sql
```

## Deployment

### Docker (Opsional)

1. Buat file `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "start"]
```

2. Build dan run:

```bash
docker build -t expense-tracker .
docker run -p 3000:3000 expense-tracker
```

### Heroku

1. Install Heroku CLI
2. Login dan create app:

```bash
heroku login
heroku create expense-tracker-app
```

3. Add PostgreSQL addon:

```bash
heroku addons:create heroku-postgresql:hobby-dev
```

4. Set environment variables:

```bash
heroku config:set SESSION_SECRET="your-secret"
heroku config:set ADMIN_PASSWORD_HASH="your-hash"
```

5. Deploy:

```bash
git push heroku main
```

## Troubleshooting

### Error: Cannot connect to database

- Pastikan PostgreSQL berjalan
- Periksa DATABASE_URL di file .env
- Pastikan database sudah dibuat

### Error: Permission denied

- Periksa user permission untuk database
- Pastikan user memiliki akses CREATE/DROP untuk migration

### Error: Module not found

- Jalankan `npm install` ulang
- Periksa versi Node.js (minimal 16)

### Error: Prisma client not generated

- Jalankan `npx prisma generate`
- Restart aplikasi setelah generate

## Fitur Aplikasi

### Home Dashboard

- Chart pengeluaran bulanan
- Progress bar budget dengan indikator warna
- Daftar pengeluaran terbaru

### Tambah Pengeluaran

- Form lengkap dengan kategori dan sumber dana
- Validasi input
- Edit dan hapus pengeluaran

### Laporan

- Filter berdasarkan tanggal
- Summary harian, mingguan, bulanan
- Management kategori dan sumber dana
- Ganti password
- Logout

### Fitur Mobile

- Responsive design
- Touch gestures
- PWA support (dapat diinstall di mobile)
- Bottom navigation

## Tips Penggunaan

1. **Set Budget Bulanan**: Klik tombol setting di header untuk mengatur budget
2. **Kategori Custom**: Tambah kategori sesuai kebutuhan di menu laporan
3. **Backup Berkala**: Export data secara berkala untuk backup
4. **Mobile Install**: Buka di browser mobile dan pilih "Add to Home Screen"

## Support

Jika menemui masalah, periksa:

1. Log aplikasi di console browser
2. Log server di terminal
3. Status database connection
4. File .env configuration
