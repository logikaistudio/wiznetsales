# Cara Debugging Error Saat Menambah Prospect

## Langkah-Langkah Debugging

Dengan perbaikan error handling yang sudah dilakukan, sekarang Anda bisa melihat pesan error yang detail. Ikuti langkah berikut:

### 1. Buka Browser Console

1. Buka aplikasi di browser (http://localhost:5173)
2. Tekan **F12** untuk membuka Developer Tools
3. Klik tab **Console**

### 2. Coba Tambah Prospect

1. Klik tombol **"Add New"** di halaman Prospect
2. Isi form dengan data:
   - **Full Name**: Nama test
   - **Phone**: 08123456789
   - **Email**: test@example.com
   - **Address**: Alamat test
   - **Cluster/Area**: Pilih salah satu cluster (jika ada)
   - **Kabupaten/City**: Pilih salah satu kota (jika ada)
   - **Latitude**: -6.1751
   - **Longitude**: 106.8650
3. Klik **"Save Data"**

### 3. Lihat Pesan Error

Jika ada error, Anda akan melihat:

#### A. Alert Dialog
Akan muncul alert dengan pesan error yang spesifik, misalnya:
- `Failed to save data: column "xxx" does not exist`
- `Failed to save data: null value in column "xxx" violates not-null constraint`
- `Failed to save data: [detail error lainnya]`

#### B. Browser Console
Di console browser, Anda akan melihat:
```
Save error: Error: [detail error]
    at handleSave (Prospect.jsx:...)
    ...
```

#### C. Server Console
Di terminal tempat server berjalan, Anda akan melihat:
```
[POST /api/customers] Error: [detail error]
[POST /api/customers] Stack: [stack trace]
[POST /api/customers] Request body: { ... }
```

### 4. Analisis Error

Berdasarkan pesan error, Anda bisa mengetahui:

1. **Column does not exist**
   - Berarti ada field yang dikirim frontend tapi tidak ada di database
   - Solusi: Tambahkan kolom di database atau hapus field dari frontend

2. **Null value violates not-null constraint**
   - Berarti ada field required yang tidak diisi
   - Solusi: Pastikan field tersebut diisi atau ubah constraint di database

3. **Foreign key constraint**
   - Berarti ada referensi ke data yang tidak ada
   - Solusi: Pastikan data referensi (product, sales, dll) sudah ada

## Kemungkinan Masalah & Solusi

### Masalah 1: Cluster/Area Dropdown Kosong

**Penyebab**: Belum ada data cluster di database

**Solusi**:
1. Buka halaman **Master Data > Targets**
2. Klik **"+ New Cluster"**
3. Isi data cluster:
   - **Cluster Name**: Nama cluster (misal: "Jakarta")
   - **Select Province**: Pilih provinsi
   - **Select Cities**: Pilih kota-kota
   - **Isi Homepass, Percentage, Target** untuk setiap kota
4. Klik **Save**
5. Kembali ke halaman Prospect dan refresh

### Masalah 2: Error "Cannot read property 'cities' of undefined"

**Penyebab**: Frontend mencoba mengakses cities dari cluster yang tidak ada

**Solusi**: Sudah diperbaiki dengan error handling yang lebih baik. Jika masih terjadi, pastikan:
1. Ada data cluster di database
2. Refresh halaman Prospect
3. Pilih cluster dari dropdown

### Masalah 3: Error "Failed to save data: ..."

**Penyebab**: Berbagai kemungkinan (lihat pesan error detail)

**Solusi**:
1. Baca pesan error di alert
2. Lihat detail di browser console
3. Lihat stack trace di server console
4. Sesuaikan data atau perbaiki database schema

## Test Scripts

Untuk memastikan backend berfungsi, jalankan test scripts:

```bash
# Test semua endpoint
node server/test-all-endpoints.js

# Test targets API
node server/test-targets-api.js

# Test prospect dengan cluster
node server/test-prospect-cluster.js
```

Semua test harus berhasil (exit code 0).

## Catatan Penting

1. **Error handling sudah diperbaiki** - Pesan error sekarang lebih informatif
2. **Logging sudah ditambahkan** - Server console menampilkan detail error
3. **Backend sudah ditest** - Semua endpoint berfungsi dengan baik
4. **Frontend sudah diperbaiki** - Response status dicek dengan benar

Jika masih ada error setelah mengikuti langkah di atas, silakan:
1. Screenshot pesan error di alert
2. Screenshot browser console
3. Copy log dari server console
4. Berikan informasi tersebut untuk analisis lebih lanjut
