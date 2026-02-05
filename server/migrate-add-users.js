
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
        console.log('Creating users table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(100),
                role VARCHAR(50) DEFAULT 'user', -- admin, manager, sales, user
                is_active BOOLEAN DEFAULT true,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create default admin user if not exists
        // Password: 'password123' (SHA256 hash for demo purposes: ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f)
        const defaultPass = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f';

        await client.query(`
            INSERT INTO users (username, email, password_hash, full_name, role)
            VALUES ('admin', 'admin@wiznet.com', $1, 'Administrator', 'admin')
            ON CONFLICT (username) DO NOTHING;
        `, [defaultPass]);

        console.log('Migration completed: users table created.');
        client.release();
        pool.end();
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
};

migrate();
