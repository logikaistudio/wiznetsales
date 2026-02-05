
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
        console.log('Adding "fat" column to customers table...');

        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='customers' AND column_name='fat') THEN
                    ALTER TABLE customers ADD COLUMN fat VARCHAR(100);
                END IF;
            END $$;
        `);

        console.log('Migration completed: "fat" column added.');
        client.release();
        pool.end();
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
};

migrate();
