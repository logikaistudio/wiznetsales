# Coverage Management - Changelog

## 🎯 Perubahan yang Dilakukan (2026-02-05)

### 1. **Struktur Data Disederhanakan**
Coverage data telah disederhanakan dari **19 field** menjadi hanya **5 field esensial**:

#### Field Baru (Simplified):
1. **network_type** (VARCHAR 50) - Jenis jaringan (FTTH/HFC)
2. **site_id** (VARCHAR 100) - ID Site
3. **ampli_lat** (DECIMAL) - Latitude Amplifier
4. **ampli_long** (DECIMAL) - Longitude Amplifier
5. **locality** (VARCHAR 200) - Lokasi/Daerah

#### Field yang Dihapus:
- ampli, cluster_id, city_town, kecamatan, kelurahan
- fibernode, fibernode_desc
- area_lat, area_long
- location, street_name, street_block, street_no
- rtrw, dwelling

### 2. **Fitur Delete All**
Ditambahkan tombol **"Delete All"** (merah) di header Coverage Management yang memungkinkan penghapusan semua data coverage sekaligus dengan konfirmasi ganda untuk keamanan.

### 3. **Import XLSX Format Baru**
Format import XLSX sekarang hanya memerlukan 5 kolom:

| Network | Site ID | Ampli Lat | Ampli Long | Locality |
|---------|---------|-----------|------------|----------|
| FTTH    | SITE-001| -6.2088   | 106.8456   | Jakarta Pusat |
| HFC     | SITE-002| -6.1751   | 106.8650   | Jakarta Timur |

**File contoh**: `sample-coverage-import.xlsx`

### 4. **Database Migration**
Database di NeonDB telah diupdate dengan struktur baru:

```sql
CREATE TABLE coverage_sites (
  id SERIAL PRIMARY KEY,
  network_type VARCHAR(50) DEFAULT 'HFC',
  site_id VARCHAR(100) NOT NULL,
  ampli_lat DECIMAL(10, 8),
  ampli_long DECIMAL(11, 8),
  locality VARCHAR(200),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `idx_coverage_site_id` pada site_id
- `idx_coverage_locality` pada locality
- `idx_coverage_network` pada network_type

### 5. **File yang Dimodifikasi**

#### Frontend:
- ✅ `src/pages/master-data/CoverageManagement.jsx`
  - Update APP_FIELDS ke 5 field
  - Tambah handleDeleteAll function
  - Update table columns
  - Update import preview

#### Backend:
- ✅ `server/index.js`
  - Update GET /api/coverage
  - Update POST /api/coverage
  - Update PUT /api/coverage/:id
  - Update POST /api/coverage/bulk
  - Search query disederhanakan

#### Database:
- ✅ `server/setup-db.js` - Update schema definition
- ✅ `migrate-coverage.js` - Migration script (sudah dijalankan)

### 6. **Testing**
✅ Semua perubahan telah ditest dan berfungsi dengan baik:
- Modal Add Site menampilkan 5 field
- Table menampilkan kolom yang benar
- Delete All button terlihat dan berfungsi
- Database schema berhasil dimigrate
- Tidak ada error di console

### 7. **Cara Menggunakan**

#### Import Data Baru:
1. Buka Coverage Management
2. Klik "Import XLS"
3. Pilih file XLSX dengan 5 kolom (Network, Site ID, Ampli Lat, Ampli Long, Locality)
4. Map kolom sesuai field
5. Preview dan konfirmasi import

#### Delete All Data:
1. Buka Coverage Management
2. Klik tombol "Delete All" (merah)
3. Konfirmasi 2x untuk keamanan
4. Data akan dihapus semua

### 8. **Catatan Penting**
⚠️ **BREAKING CHANGE**: Data coverage lama telah dihapus saat migration. Pastikan untuk backup data jika diperlukan sebelum migration.

✅ **Menu lain tidak terpengaruh**: Perubahan hanya pada Coverage Management, menu lain (Products, Person Incharge, Targets, dll) tetap berfungsi normal.

---

## 📝 Migration Log

**Tanggal**: 2026-02-05  
**Status**: ✅ Berhasil  
**Database**: NeonDB (PostgreSQL)  
**Data Lama**: Dihapus (TRUNCATE)  
**Data Baru**: 0 records (siap untuk import baru)
