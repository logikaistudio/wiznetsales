/**
 * Complete Database Setup Script
 * ===============================
 * Creates ALL tables needed by the application with the CORRECT schema.
 * Safe to run multiple times — uses IF NOT EXISTS and ON CONFLICT.
 * 
 * Tables created (15 total):
 *  1. target_clusters — Cluster definitions for targets
 *  2. target_cities   — Cities within each cluster
 *  3. products        — Product catalog
 *  4. promos          — Promotions
 *  5. hot_news        — Hot news/announcements
 *  6. customers       — Customer/prospect data
 *  7. person_in_charge — Sales & support personnel
 *  8. coverage_sites  — Coverage network nodes
 *  9. tickets         — Helpdesk tickets
 * 10. ticket_activities — Ticket activity log
 * 11. users           — System users
 * 12. roles           — Role definitions
 * 13. system_settings — Key-value settings
 * 14. clusters        — Master cluster list (for role assignment)
 * 15. provinces       — Master province list (for role assignment)
 */
import db from './db.js';

async function setupAllTables() {
    console.log('Setting up all database tables...\n');

    try {
        // ==========================================
        // 1. TARGET_CLUSTERS
        // ==========================================
        console.log('1. target_clusters');
        await db.query(`
            CREATE TABLE IF NOT EXISTS target_clusters (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                total_target INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await safeAddColumn('target_clusters', 'total_target', 'INTEGER DEFAULT 0');

        // ==========================================
        // 2. TARGET_CITIES
        // ==========================================
        console.log('2. target_cities');
        await db.query(`
            CREATE TABLE IF NOT EXISTS target_cities (
                id SERIAL PRIMARY KEY,
                cluster_id INTEGER REFERENCES target_clusters(id) ON DELETE CASCADE,
                city_name VARCHAR(100),
                province VARCHAR(100),
                homepass INTEGER DEFAULT 0,
                percentage DECIMAL(5,2) DEFAULT 0,
                target INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await safeAddColumn('target_cities', 'target', 'INTEGER DEFAULT 0');
        await safeAddColumn('target_cities', 'homepass', 'INTEGER DEFAULT 0');
        await safeAddColumn('target_cities', 'percentage', 'DECIMAL(5,2) DEFAULT 0');

        // ==========================================
        // 3. PRODUCTS
        // ==========================================
        console.log('3. products');
        await db.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                category VARCHAR(100),
                service_type VARCHAR(50),
                price DECIMAL(12,2),
                cogs DECIMAL(12,2),
                bandwidth VARCHAR(50),
                release_date DATE,
                status VARCHAR(50) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await safeAddColumn('products', 'category', "VARCHAR(100)");
        await safeAddColumn('products', 'service_type', "VARCHAR(50)");
        await safeAddColumn('products', 'price', "DECIMAL(12,2) DEFAULT 0");
        await safeAddColumn('products', 'cogs', "DECIMAL(12,2) DEFAULT 0");
        await safeAddColumn('products', 'bandwidth', "VARCHAR(50)");
        await safeAddColumn('products', 'release_date', "DATE");
        await safeAddColumn('products', 'status', "VARCHAR(50) DEFAULT 'Active'");

        // ==========================================
        // 4. PROMOS
        // ==========================================
        console.log('4. promos');
        await db.query(`
            CREATE TABLE IF NOT EXISTS promos (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                valid_from DATE,
                valid_to DATE,
                price DECIMAL(12,2),
                cogs DECIMAL(12,2),
                description TEXT,
                status VARCHAR(50) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await safeAddColumn('promos', 'valid_from', "DATE");
        await safeAddColumn('promos', 'valid_to', "DATE");
        await safeAddColumn('promos', 'price', "DECIMAL(12,2) DEFAULT 0");
        await safeAddColumn('promos', 'cogs', "DECIMAL(12,2) DEFAULT 0");
        await safeAddColumn('promos', 'description', "TEXT");
        await safeAddColumn('promos', 'status', "VARCHAR(50) DEFAULT 'Active'");

        // ==========================================
        // 5. HOT_NEWS
        // ==========================================
        console.log('5. hot_news');
        await db.query(`
            CREATE TABLE IF NOT EXISTS hot_news (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255),
                content TEXT,
                priority INTEGER DEFAULT 1,
                start_date TIMESTAMP DEFAULT NOW(),
                end_date TIMESTAMP DEFAULT (NOW() + interval '30 days'),
                is_active BOOLEAN DEFAULT true,
                created_by VARCHAR(100) DEFAULT 'Admin',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await safeAddColumn('hot_news', 'priority', "INTEGER DEFAULT 1");
        await safeAddColumn('hot_news', 'start_date', "TIMESTAMP DEFAULT NOW()");
        await safeAddColumn('hot_news', 'end_date', "TIMESTAMP DEFAULT (NOW() + interval '30 days')");
        await safeAddColumn('hot_news', 'is_active', "BOOLEAN DEFAULT true");
        await safeAddColumn('hot_news', 'created_by', "VARCHAR(100) DEFAULT 'Admin'");
        await safeAddColumn('hot_news', 'updated_at', "TIMESTAMP DEFAULT NOW()");

        // ==========================================
        // 6. CUSTOMERS
        // ==========================================
        console.log('6. customers');
        await db.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                customer_id VARCHAR(100) UNIQUE,
                type VARCHAR(50),
                name VARCHAR(255),
                address TEXT,
                area VARCHAR(100),
                kabupaten VARCHAR(100),
                kecamatan VARCHAR(100),
                kelurahan VARCHAR(100),
                latitude DECIMAL(10,8),
                longitude DECIMAL(11,8),
                phone VARCHAR(50),
                email VARCHAR(255),
                product_id INTEGER,
                product_name VARCHAR(255),
                rfs_date DATE,
                files JSONB DEFAULT '[]',
                sales_id INTEGER,
                sales_name VARCHAR(100),
                status VARCHAR(50) DEFAULT 'Prospect',
                prospect_date DATE DEFAULT NOW(),
                is_active BOOLEAN DEFAULT true,
                fat VARCHAR(100),
                homepass_id VARCHAR(100),
                site_id VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        // Add all columns that might be missing from older schema
        const customerCols = [
            ['customer_id', "VARCHAR(100)"],
            ['type', "VARCHAR(50)"],
            ['area', "VARCHAR(100)"],
            ['kabupaten', "VARCHAR(100)"],
            ['kecamatan', "VARCHAR(100)"],
            ['kelurahan', "VARCHAR(100)"],
            ['product_id', "INTEGER"],
            ['product_name', "VARCHAR(255)"],
            ['rfs_date', "DATE"],
            ['files', "JSONB DEFAULT '[]'"],
            ['sales_id', "INTEGER"],
            ['sales_name', "VARCHAR(100)"],
            ['status', "VARCHAR(50) DEFAULT 'Prospect'"],
            ['prospect_date', "DATE DEFAULT NOW()"],
            ['is_active', "BOOLEAN DEFAULT true"],
            ['fat', "VARCHAR(100)"],
            ['homepass_id', "VARCHAR(100)"],
            ['site_id', "VARCHAR(100)"],
        ];
        for (const [col, def] of customerCols) {
            await safeAddColumn('customers', col, def);
        }

        // ==========================================
        // 7. PERSON_IN_CHARGE
        // ==========================================
        console.log('7. person_in_charge');
        await db.query(`
            CREATE TABLE IF NOT EXISTS person_in_charge (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                role VARCHAR(100),
                employee_id VARCHAR(50),
                email VARCHAR(255),
                phone VARCHAR(50),
                area VARCHAR(100),
                position VARCHAR(100),
                status VARCHAR(50) DEFAULT 'Active',
                active_date DATE,
                inactive_date DATE,
                profile_image TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // ==========================================
        // 8. COVERAGE_SITES
        // ==========================================
        console.log('8. coverage_sites');
        await db.query(`
            CREATE TABLE IF NOT EXISTS coverage_sites (
                id SERIAL PRIMARY KEY,
                network_type VARCHAR(50),
                site_id VARCHAR(100),
                homepass_id VARCHAR(100),
                ampli_lat DECIMAL(10,8),
                ampli_long DECIMAL(11,8),
                area_lat DECIMAL(10,8),
                area_long DECIMAL(11,8),
                locality VARCHAR(255),
                province VARCHAR(100),
                cluster VARCHAR(100),
                status VARCHAR(50) DEFAULT 'active',
                polygon_data JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await safeAddColumn('coverage_sites', 'homepass_id', "VARCHAR(100)");
        await safeAddColumn('coverage_sites', 'province', "VARCHAR(100)");
        await safeAddColumn('coverage_sites', 'cluster', "VARCHAR(100)");
        await safeAddColumn('coverage_sites', 'polygon_data', "JSONB");
        await safeAddColumn('coverage_sites', 'updated_at', "TIMESTAMP DEFAULT NOW()");

        // ==========================================
        // 9. TICKETS
        // ==========================================
        console.log('9. tickets');
        await db.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id SERIAL PRIMARY KEY,
                ticket_number VARCHAR(50) UNIQUE,
                customer_id INTEGER,
                customer_name VARCHAR(255),
                category VARCHAR(100),
                description TEXT,
                assigned_to INTEGER,
                assigned_name VARCHAR(255),
                source VARCHAR(100) DEFAULT 'WhatsApp',
                priority VARCHAR(50) DEFAULT 'Medium',
                status VARCHAR(50) DEFAULT 'Open',
                solved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // ==========================================
        // 10. TICKET_ACTIVITIES
        // ==========================================
        console.log('10. ticket_activities');
        await db.query(`
            CREATE TABLE IF NOT EXISTS ticket_activities (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                activity_type VARCHAR(50) DEFAULT 'note',
                content TEXT,
                created_by VARCHAR(100) DEFAULT 'System',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // ==========================================
        // 11. USERS
        // ==========================================
        console.log('11. users');
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255),
                role VARCHAR(100) DEFAULT 'user',
                cluster VARCHAR(100),
                province VARCHAR(100),
                is_active BOOLEAN DEFAULT true,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await safeAddColumn('users', 'cluster', "VARCHAR(100)");
        await safeAddColumn('users', 'province', "VARCHAR(100)");

        // Default admin user
        const crypto = await import('crypto');
        const defaultPasswordHash = crypto.default.createHash('sha256').update('password123').digest('hex');
        await db.query(`
            INSERT INTO users (username, email, password_hash, full_name, role, is_active) VALUES
            ('admin', 'admin@netsales.com', $1, 'Administrator', 'Admin', true)
            ON CONFLICT (username) DO NOTHING
        `, [defaultPasswordHash]);

        // ==========================================
        // 12. ROLES
        // ==========================================
        console.log('12. roles');
        await db.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                permissions JSONB DEFAULT '[]',
                allowed_clusters JSONB DEFAULT '[]',
                allowed_provinces JSONB DEFAULT '[]',
                data_scope VARCHAR(50) DEFAULT 'all',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await safeAddColumn('roles', 'allowed_clusters', "JSONB DEFAULT '[]'");
        await safeAddColumn('roles', 'allowed_provinces', "JSONB DEFAULT '[]'");
        await safeAddColumn('roles', 'data_scope', "VARCHAR(50) DEFAULT 'all'");
        await safeAddColumn('roles', 'is_active', "BOOLEAN DEFAULT true");

        // Default roles
        await db.query(`
            INSERT INTO roles (name, description, permissions, data_scope) VALUES
            ('Admin', 'Full system access', '["all"]', 'all'),
            ('Sales', 'Sales and prospect management', '["prospects", "customers", "coverage"]', 'cluster'),
            ('Manager', 'View reports and manage team', '["reports", "prospects", "customers"]', 'province')
            ON CONFLICT (name) DO NOTHING
        `);

        // ==========================================
        // 13. SYSTEM_SETTINGS
        // ==========================================
        console.log('13. system_settings');
        await db.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(100) PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // ==========================================
        // 14. CLUSTERS (master data)
        // ==========================================
        console.log('14. clusters');
        await db.query(`
            CREATE TABLE IF NOT EXISTS clusters (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                province VARCHAR(100),
                description TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // ==========================================
        // 15. PROVINCES (master data)
        // ==========================================
        console.log('15. provinces');
        await db.query(`
            CREATE TABLE IF NOT EXISTS provinces (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                code VARCHAR(10),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Insert sample provinces
        await db.query(`
            INSERT INTO provinces (name, code) VALUES
            ('DKI Jakarta', 'JKT'),
            ('Jawa Barat', 'JBR'),
            ('Jawa Tengah', 'JTG'),
            ('Jawa Timur', 'JTM'),
            ('Banten', 'BTN'),
            ('Bali', 'BAL'),
            ('Sumatera Utara', 'SUT'),
            ('Sumatera Barat', 'SUB'),
            ('Sumatera Selatan', 'SUS'),
            ('Sulawesi Selatan', 'SLS'),
            ('Kalimantan Timur', 'KLT'),
            ('Kalimantan Barat', 'KLB'),
            ('Yogyakarta', 'YOG'),
            ('Riau', 'RIA'),
            ('Lampung', 'LMP')
            ON CONFLICT (name) DO NOTHING
        `);

        // ==========================================
        // VERIFY
        // ==========================================
        const tables = await db.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' ORDER BY table_name
        `);
        console.log('\nDatabase tables:');
        tables.rows.forEach(t => console.log(`  - ${t.table_name}`));

        console.log('\nDatabase setup complete!');

    } catch (error) {
        console.error('Setup error:', error);
    } finally {
        process.exit(0);
    }
}

async function safeAddColumn(table, column, definition) {
    try {
        await db.query(`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='${table}' AND column_name='${column}'
                ) THEN
                    ALTER TABLE ${table} ADD COLUMN ${column} ${definition};
                END IF;
            END $$;
        `);
    } catch (err) {
        console.error(`  Warning: Could not add ${table}.${column}: ${err.message}`);
    }
}

setupAllTables();
