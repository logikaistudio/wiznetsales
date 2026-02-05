
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
        console.log('Creating settings and roles tables...');

        await client.query('BEGIN');

        // 1. Settings Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(50) PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Seed default settings if not exist
        await client.query(`
            INSERT INTO system_settings (key, value) VALUES 
            ('app_name', 'Netsales'),
            ('app_description', 'ISP Sales Dashboard'),
            ('app_logo', '') 
            ON CONFLICT (key) DO NOTHING;
        `);

        // 2. Roles Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT true,
                permissions TEXT[], -- Array of permission strings
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Seed default roles
        const roles = [
            { name: 'admin', desc: 'Full System Access', perms: ['all'] },
            { name: 'leader', desc: 'Team Leader', perms: ['view_all', 'edit_all', 'export', 'import'] },
            { name: 'manager', desc: 'Operational Manager', perms: ['view_all', 'approve'] },
            { name: 'sales', desc: 'Sales Representative', perms: ['view_dashboard', 'view_coverage', 'view_prospect', 'create_prospect'] },
            { name: 'user', desc: 'Standard User', perms: ['view_dashboard'] }
        ];

        for (const role of roles) {
            await client.query(`
                INSERT INTO roles (name, description, permissions)
                VALUES ($1, $2, $3)
                ON CONFLICT (name) DO UPDATE 
                SET description = EXCLUDED.description;
            `, [role.name, role.desc, role.perms]);
        }

        await client.query('COMMIT');
        console.log('Migration completed: system_settings and roles tables created.');
        client.release();
        pool.end();
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Migration error:', err);
        process.exit(1);
    }
};

migrate();
