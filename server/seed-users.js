
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
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

const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

const seed = async () => {
    try {
        const client = await pool.connect();
        console.log('Seeding specific users...');

        // 1. Leader User
        await client.query(`
            INSERT INTO users (username, email, password_hash, full_name, role)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (username) DO UPDATE 
            SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role;
        `, ['leader', 'leader@wiznet.com', hashPassword('superleader'), 'Super Leader', 'leader']);

        // 2. Sales User
        await client.query(`
            INSERT INTO users (username, email, password_hash, full_name, role)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (username) DO UPDATE 
            SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role;
        `, ['sales', 'sales@wiznet.com', hashPassword('salesjabo'), 'Sales Person', 'sales']);

        console.log('Seeding completed.');
        client.release();
        pool.end();
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seed();
