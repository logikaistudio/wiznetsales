import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// NeonDB (Source - lama, berisi data lengkap)
const neonPool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_pCbmvUIt62Oj@ep-winter-feather-a1iqqz09-pooler.ap-southeast-1.aws.neon.tech/neondb',
    ssl: { rejectUnauthorized: false },
    max: 5
});

// Supabase (Destination - production)
const supabasePool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5
});

const BATCH_SIZE = 500; // Insert 500 baris sekaligus

async function migrateCoverageSites() {
    console.log('🚀 Memulai migrasi coverage_sites dari NeonDB ke Supabase...\n');

    const neonClient = await neonPool.connect();
    const supabaseClient = await supabasePool.connect();

    try {
        // Ambil ID yang sudah ada di Supabase agar tidak duplikat
        console.log('📋 Mengambil daftar ID yang sudah ada di Supabase...');
        const existingResult = await supabaseClient.query('SELECT id FROM coverage_sites ORDER BY id');
        const existingIds = new Set(existingResult.rows.map(r => r.id));
        console.log(`   ${existingIds.size} data sudah ada di Supabase\n`);

        // Hitung total di NeonDB
        const countResult = await neonClient.query('SELECT COUNT(*) FROM coverage_sites');
        const totalNeon = parseInt(countResult.rows[0].count);
        console.log(`📦 Total data di NeonDB: ${totalNeon.toLocaleString()}`);
        console.log(`📦 Yang perlu dipindahkan: ${(totalNeon - existingIds.size).toLocaleString()}\n`);

        // Ambil semua data dari NeonDB dalam batch
        let offset = 0;
        let totalInserted = 0;
        let totalSkipped = 0;

        while (true) {
            const batchResult = await neonClient.query(
                'SELECT * FROM coverage_sites ORDER BY id LIMIT $1 OFFSET $2',
                [BATCH_SIZE, offset]
            );

            if (batchResult.rows.length === 0) break;

            const rows = batchResult.rows.filter(r => !existingIds.has(r.id));

            if (rows.length > 0) {
                const columns = Object.keys(rows[0]);
                const columnList = columns.join(', ');

                // Build bulk insert
                const values = [];
                const placeholders = rows.map((row, rowIdx) => {
                    const rowPlaceholders = columns.map((col, colIdx) => {
                        values.push(row[col]);
                        return `$${rowIdx * columns.length + colIdx + 1}`;
                    });
                    return `(${rowPlaceholders.join(', ')})`;
                });

                try {
                    await supabaseClient.query(
                        `INSERT INTO coverage_sites (${columnList}) VALUES ${placeholders.join(', ')} ON CONFLICT (id) DO NOTHING`,
                        values
                    );
                    totalInserted += rows.length;
                } catch (err) {
                    // Fallback: insert satu per satu jika bulk gagal
                    for (const row of rows) {
                        try {
                            const vals = columns.map(c => row[c]);
                            const ph = columns.map((_, i) => `$${i + 1}`).join(', ');
                            await supabaseClient.query(
                                `INSERT INTO coverage_sites (${columnList}) VALUES (${ph}) ON CONFLICT (id) DO NOTHING`,
                                vals
                            );
                            totalInserted++;
                        } catch (e) {
                            totalSkipped++;
                        }
                    }
                }
            } else {
                totalSkipped += batchResult.rows.length;
            }

            offset += BATCH_SIZE;
            const progress = Math.min(offset, totalNeon);
            const pct = ((progress / totalNeon) * 100).toFixed(1);
            process.stdout.write(`\r   Progress: ${progress.toLocaleString()}/${totalNeon.toLocaleString()} (${pct}%) | Inserted: ${totalInserted.toLocaleString()} | Skipped: ${totalSkipped.toLocaleString()}`);
        }

        console.log('\n');

        // Reset sequence
        await supabaseClient.query(`
            SELECT setval(pg_get_serial_sequence('coverage_sites', 'id'), COALESCE(MAX(id), 1)) FROM coverage_sites
        `);

        // Verifikasi akhir
        const finalCount = await supabaseClient.query('SELECT COUNT(*) FROM coverage_sites');
        console.log(`✅ Migrasi selesai!`);
        console.log(`   Total di Supabase sekarang: ${parseInt(finalCount.rows[0].count).toLocaleString()}`);
        console.log(`   Berhasil diinsert: ${totalInserted.toLocaleString()}`);
        console.log(`   Dilewati (sudah ada): ${totalSkipped.toLocaleString()}`);

    } finally {
        neonClient.release();
        supabaseClient.release();
        await neonPool.end();
        await supabasePool.end();
    }
}

migrateCoverageSites().catch(e => {
    console.error('\n❌ Error:', e.message);
    process.exit(1);
});
