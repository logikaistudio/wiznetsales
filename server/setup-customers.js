
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

const setup = async () => {
    try {
        const client = await pool.connect();

        console.log('Creating customers table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                customer_id VARCHAR(50) UNIQUE NOT NULL,
                type VARCHAR(50), -- 'Broadband Home' or 'Corporate'
                name VARCHAR(100) NOT NULL,
                address TEXT,
                area VARCHAR(100),
                kabupaten VARCHAR(100),
                kecamatan VARCHAR(100),
                kelurahan VARCHAR(100),
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                phone VARCHAR(50),
                email VARCHAR(100),
                product_id INTEGER,
                product_name VARCHAR(100),
                rfs_date DATE,
                files TEXT, -- JSON string for file paths
                sales_id INTEGER,
                sales_name VARCHAR(100),
                status VARCHAR(50) DEFAULT 'Prospect', -- Prospect, Survey, Installation, Billing, Blockir, Churn
                prospect_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Customers table created.');
        client.release();
        pool.end();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

setup();
