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

async function cleanCoverageData() {
    const client = await pool.connect();
    try {
        console.log('🧹 Cleaning old coverage data...\n');

        // Check current count
        const beforeResult = await client.query('SELECT COUNT(*) FROM coverage_sites');
        console.log(`📊 Current rows: ${beforeResult.rows[0].count}`);

        // Delete all
        await client.query('DELETE FROM coverage_sites');

        console.log('✅ All coverage data deleted!');
        console.log('\n📝 Next steps:');
        console.log('   1. Make sure server is restarted (npm run dev:all)');
        console.log('   2. Go to Coverage Management page');
        console.log('   3. Click "Import KMZ" button');
        console.log('   4. Select your KMZ file');
        console.log('   5. Polygon borders will appear on the map! 🗺️');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanCoverageData();
