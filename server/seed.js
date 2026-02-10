import pg from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const { Client } = pg;

const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

const run = async () => {
    console.log('Connecting to DB via DIRECT_URL...');

    // DIRECT_URL is safer for migrations/seeding due to transaction support
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected.');

        // Clean up
        console.log('Cleaning roles...');
        await client.query("DELETE FROM public.roles WHERE name IN ('Admin', 'Super Admin')");

        // Roles
        console.log('Upserting roles...');
        const allMenus = [
            'dashboard', 'achievement', 'prospect_subscriber', 'coverage', 'omniflow',
            'person_incharge', 'targets', 'coverage_management',
            'product_management', 'promo', 'hot_news', 'user_management', 'application_settings'
        ];

        const superAdminPerms = {};
        allMenus.forEach(m => {
            superAdminPerms[m] = { view: true, create: true, edit: true, delete: true, import: true, export: true };
        });

        const adminPerms = { ...superAdminPerms };

        await client.query(`
            INSERT INTO public.roles (name, description, permissions, data_scope)
            VALUES 
                ('super_admin', 'Super Administrator - Full Access', $1, 'all'),
                ('admin', 'Administrator - Standard Access', $2, 'all')
            ON CONFLICT (name) DO UPDATE 
            SET permissions = EXCLUDED.permissions
        `, [JSON.stringify(superAdminPerms), JSON.stringify(adminPerms)]);

        // Users
        console.log('Upserting users...');
        const users = [
            {
                username: 'superadmin',
                email: 'superadmin@wiznet.com',
                password_hash: hashPassword('p3h03lw4hyud1'),
                full_name: 'Super Administrator',
                role: 'super_admin'
            },
            {
                username: 'admin',
                email: 'admin@wiznet.com',
                password_hash: hashPassword('password123'),
                full_name: 'Administrator',
                role: 'admin'
            }
        ];

        for (const u of users) {
            console.log(`Processing ${u.username}...`);
            const existing = await client.query('SELECT id FROM public.users WHERE username = $1 OR email = $2', [u.username, u.email]);

            if (existing.rows.length > 0) {
                await client.query(`
                    UPDATE public.users 
                    SET password_hash = $1, full_name = $2, role = $3, is_active = true, updated_at = NOW()
                    WHERE id = $4
                `, [u.password_hash, u.full_name, u.role, existing.rows[0].id]);
                console.log(`Updated ${u.username}`);
            } else {
                await client.query(`
                    INSERT INTO public.users (username, email, password_hash, full_name, role, is_active)
                    VALUES ($1, $2, $3, $4, $5, true)
                `, [u.username, u.email, u.password_hash, u.full_name, u.role]);
                console.log(`Inserted ${u.username}`);
            }
        }

        console.log('SEEDING SUCCESS!');
    } catch (e) {
        console.error('SEEDING FAILED:', e);
    } finally {
        await client.end();
        console.log('Disconnected');
    }
};

run();
