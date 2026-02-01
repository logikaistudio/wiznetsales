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
    ssl: {
        rejectUnauthorized: false
    }
});

async function setupHotNews() {
    const client = await pool.connect();
    try {
        console.log('Creating hot_news table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS hot_news (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                priority INTEGER DEFAULT 1,
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ hot_news table created successfully!');

        // Insert sample data
        await client.query(`
            INSERT INTO hot_news (title, content, priority, start_date, end_date, is_active, created_by)
            VALUES 
                ('Selamat Datang di WizNetSales!', 'Sistem manajemen penjualan ISP telah aktif. Silakan mulai mengelola data prospect dan target Anda.', 1, NOW(), NOW() + INTERVAL '30 days', true, 'System'),
                ('Target Q1 2026', 'Target penjualan Q1 2026 telah ditetapkan. Pastikan semua tim sales mencapai target masing-masing!', 2, NOW(), NOW() + INTERVAL '90 days', true, 'Admin')
            ON CONFLICT DO NOTHING;
        `);

        console.log('✅ Sample hot news inserted!');

    } catch (err) {
        console.error('Error setting up hot_news table:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

setupHotNews();
