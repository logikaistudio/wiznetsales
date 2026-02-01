# Test Location Auto-Populate Logic

## Cara Test di Browser (localhost:5173):

### 1. Buka halaman Prospect & Customers
- Klik menu "Prospect Subscriber" di sidebar
- Klik tombol "New Prospect"

### 2. Test Flow:
1. **Area (Cluster)** - Harus muncul dropdown dengan pilihan cluster dari Target Management
   - Pilih salah satu cluster (misal: "Cluster Jakarta 1")
   
2. **Kabupaten** - Otomatis populate dengan kota-kota di cluster tersebut
   - Pilih salah satu kota (misal: "Jakarta Pusat")
   
3. **Kecamatan** - Akan fetch dari API Indonesia dan populate dropdown
   - Pilih kecamatan
   
4. **Kelurahan** - Akan fetch dari API dan populate dropdown
   - Pilih kelurahan

## Debug Checklist:

### Jika Area masih text input (bukan dropdown):
1. Buka Browser DevTools (F12)
2. Cek Console untuk error
3. Cek Network tab - pastikan `/api/targets` berhasil fetch data
4. Hard refresh browser: `Ctrl + Shift + R` (Windows) atau `Cmd + Shift + R` (Mac)

### Jika Kabupaten tidak populate:
- Pastikan Area sudah dipilih terlebih dahulu
- Cek apakah cluster yang dipilih punya data cities

### Jika Kecamatan/Kelurahan tidak populate:
- Cek Network tab untuk request ke `emsifa.com/api-wilayah-indonesia`
- Pastikan koneksi internet aktif (API eksternal)
- Jika API gagal, akan fallback ke text input biasa

## Expected Behavior:
- Area: Dropdown (dari database Target Clusters)
- Kabupaten: Dropdown (dari cities di cluster yang dipilih)
- Kecamatan: Dropdown (dari API Indonesia) atau Text Input (fallback)
- Kelurahan: Dropdown (dari API Indonesia) atau Text Input (fallback)
