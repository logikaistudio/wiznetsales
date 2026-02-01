import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const migrate = async () => {
    try {
        const client = await pool.connect();
        console.log('Adding columns to person_in_charge...');
        await client.query(`
      ALTER TABLE person_in_charge 
      ADD COLUMN IF NOT EXISTS area VARCHAR(100), 
      ADD COLUMN IF NOT EXISTS position VARCHAR(100);
    `);
        console.log('Columns added.');
        client.release();
        pool.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

migrate();
