import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkPolygonData() {
    const client = await pool.connect();
    try {
        console.log('🔍 Checking coverage_sites table...\n');

        // Check total rows
        const totalResult = await client.query('SELECT COUNT(*) FROM coverage_sites');
        console.log(`📊 Total rows: ${totalResult.rows[0].count}`);

        // Check rows with polygon_data
        const polygonResult = await client.query('SELECT COUNT(*) FROM coverage_sites WHERE polygon_data IS NOT NULL');
        console.log(`🗺️  Rows with polygon_data: ${polygonResult.rows[0].count}`);

        // Show sample data
        const sampleResult = await client.query('SELECT id, site_id, ampli_lat, ampli_long, polygon_data FROM coverage_sites ORDER BY id DESC LIMIT 5');

        console.log('\n📋 Latest 5 rows:');
        sampleResult.rows.forEach(row => {
            const hasPolygon = row.polygon_data ? '✅ HAS POLYGON' : '❌ NO POLYGON';
            console.log(`  ID: ${row.id} | Site: ${row.site_id} | ${hasPolygon}`);
            if (row.polygon_data) {
                const coords = JSON.parse(row.polygon_data);
                console.log(`     → Polygon points: ${coords.length}`);
            }
        });

        console.log('\n💡 Recommendation:');
        if (polygonResult.rows[0].count === '0') {
            console.log('   ⚠️  No polygon data found. Please:');
            console.log('   1. Delete all existing coverage data');
            console.log('   2. Restart the server (npm run dev:all)');
            console.log('   3. Import your KMZ file again');
        } else {
            console.log('   ✅ Polygon data exists! Check browser console for rendering errors.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkPolygonData();
