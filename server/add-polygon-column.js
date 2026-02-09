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

async function addPolygonColumn() {
    const client = await pool.connect();
    try {
        console.log('Adding polygon_data column to coverage_sites table...');

        await client.query(`
            ALTER TABLE coverage_sites 
            ADD COLUMN IF NOT EXISTS polygon_data JSONB;
        `);

        console.log('✅ Column added successfully!');
        console.log('This column will store polygon/area boundaries from KMZ files.');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

addPolygonColumn();
