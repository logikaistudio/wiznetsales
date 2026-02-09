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

async function addHomepassColumn() {
    const client = await pool.connect();

    try {
        console.log('=== ADDING HOMEPASS_ID COLUMN ===\n');

        // Check if column exists
        const checkResult = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'coverage_sites' AND column_name = 'homepass_id'
        `);

        if (checkResult.rows.length > 0) {
            console.log('✅ Column homepass_id already exists!');
        } else {
            // Add the column
            await client.query(`
                ALTER TABLE coverage_sites 
                ADD COLUMN homepass_id VARCHAR(100)
            `);
            console.log('✅ Column homepass_id added successfully!');
        }

        // Verify
        const verifyResult = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'coverage_sites' AND column_name = 'homepass_id'
        `);
        console.log('Column info:', verifyResult.rows[0]);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

addHomepassColumn();
