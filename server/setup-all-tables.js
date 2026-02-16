/**
 * Complete Database Setup Script (Updated)
 * ========================================
 * Creates ALL tables needed by the application with the CORRECT schema.
 * Safe to run multiple times — uses IF NOT EXISTS and ON CONFLICT.
 * Enforces ALL required columns existence.
 */
import db from './db.js';
import crypto from 'crypto';

async function setupAllTables() {
    console.log('Starting comprehensive database setup...\n');

    // Helper to add column if missing
    const safeAddColumn = async (table, column, definition) => {
        try {
            await db.query(`
                DO $$ BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='${table}' AND column_name='${column}')
                    THEN ALTER TABLE ${table} ADD COLUMN ${column} ${definition};
                    RAISE NOTICE 'Added column ${column} to ${table}';
                    END IF;
                END $$;
            `);
        } catch (err) {
            console.error(`Failed to add column ${column} to ${table}:`, err.message);
        }
    };

    try {
        // ==========================================
        // 1. TARGET_CLUSTERS
        // ==========================================
        console.log('1. target_clusters');
        await db.query(`CREATE TABLE IF NOT EXISTS target_clusters (id SERIAL PRIMARY KEY)`);
        await safeAddColumn('target_clusters', 'name', 'VARCHAR(100) UNIQUE');
        await safeAddColumn('target_clusters', 'total_target', 'INTEGER DEFAULT 0');
        await safeAddColumn('target_clusters', 'created_at', 'TIMESTAMP DEFAULT NOW()');

        // ==========================================
        // 2. TARGET_CITIES
        // ==========================================
        console.log('2. target_cities');
        await db.query(`CREATE TABLE IF NOT EXISTS target_cities (id SERIAL PRIMARY KEY)`);
        await safeAddColumn('target_cities', 'cluster_id', 'INTEGER REFERENCES target_clusters(id) ON DELETE CASCADE');
        await safeAddColumn('target_cities', 'city_name', 'VARCHAR(100)');
        await safeAddColumn('target_cities', 'province', 'VARCHAR(100)');
        await safeAddColumn('target_cities', 'homepass', 'INTEGER DEFAULT 0');
        await safeAddColumn('target_cities', 'percentage', 'DECIMAL(5,2) DEFAULT 0');
        await safeAddColumn('target_cities', 'target', 'INTEGER DEFAULT 0');
        await safeAddColumn('target_cities', 'created_at', 'TIMESTAMP DEFAULT NOW()');

        // ==========================================
        // 3. PRODUCTS
        // ==========================================
        console.log('3. products');
        await db.query(`CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY)`);
        const productCols = [
            ['name', "VARCHAR(255)"],
            ['category', "VARCHAR(100)"],
            ['service_type', "VARCHAR(50)"],
            ['price', "DECIMAL(12,2) DEFAULT 0"],
            ['cogs', "DECIMAL(12,2) DEFAULT 0"],
            ['bandwidth', "VARCHAR(50)"],
            ['release_date', "DATE"],
            ['status', "VARCHAR(50) DEFAULT 'Active'"],
            ['created_at', "TIMESTAMP DEFAULT NOW()"]
        ];
        for (const [c, d] of productCols) await safeAddColumn('products', c, d);

        // ==========================================
        // 4. PROMOS
        // ==========================================
        console.log('4. promos');
        await db.query(`CREATE TABLE IF NOT EXISTS promos (id SERIAL PRIMARY KEY)`);
        const promoCols = [
            ['name', "VARCHAR(255)"],
            ['valid_from', "DATE"],
            ['valid_to', "DATE"],
            ['price', "DECIMAL(12,2) DEFAULT 0"],
            ['cogs', "DECIMAL(12,2) DEFAULT 0"],
            ['description', "TEXT"],
            ['status', "VARCHAR(50) DEFAULT 'Active'"],
            ['created_at', "TIMESTAMP DEFAULT NOW()"]
        ];
        for (const [c, d] of promoCols) await safeAddColumn('promos', c, d);

        // ==========================================
        // 5. HOT_NEWS
        // ==========================================
        console.log('5. hot_news');
        await db.query(`CREATE TABLE IF NOT EXISTS hot_news (id SERIAL PRIMARY KEY)`);
        const newsCols = [
            ['title', "VARCHAR(255)"],
            ['content', "TEXT"],
            ['priority', "INTEGER DEFAULT 1"],
            ['start_date', "TIMESTAMP DEFAULT NOW()"],
            ['end_date', "TIMESTAMP DEFAULT (NOW() + interval '30 days')"],
            ['is_active', "BOOLEAN DEFAULT true"],
            ['created_by', "VARCHAR(100) DEFAULT 'Admin'"],
            ['created_at', "TIMESTAMP DEFAULT NOW()"],
            ['updated_at', "TIMESTAMP DEFAULT NOW()"]
        ];
        for (const [c, d] of newsCols) await safeAddColumn('hot_news', c, d);

        // ==========================================
        // 6. CUSTOMERS
        // ==========================================
        console.log('6. customers');
        await db.query(`CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY)`);
        const custCols = [
            ['customer_id', "VARCHAR(100) UNIQUE"],
            ['name', "VARCHAR(255)"],
            ['address', "TEXT"],
            ['type', "VARCHAR(50)"],
            ['area', "VARCHAR(100)"],
            ['kabupaten', "VARCHAR(100)"],
            ['kecamatan', "VARCHAR(100)"],
            ['kelurahan', "VARCHAR(100)"],
            ['latitude', "DECIMAL(10,8)"],
            ['longitude', "DECIMAL(11,8)"],
            ['phone', "VARCHAR(50)"],
            ['email', "VARCHAR(255)"],
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
            ['created_at', "TIMESTAMP DEFAULT NOW()"],
            ['updated_at', "TIMESTAMP DEFAULT NOW()"]
        ];
        for (const [c, d] of custCols) await safeAddColumn('customers', c, d);

        // ==========================================
        // 7. PERSON_IN_CHARGE
        // ==========================================
        console.log('7. person_in_charge');
        await db.query(`CREATE TABLE IF NOT EXISTS person_in_charge (id SERIAL PRIMARY KEY)`);
        const picCols = [
            ['name', "VARCHAR(255)"],
            ['role', "VARCHAR(100)"],
            ['employee_id', "VARCHAR(50)"],
            ['email', "VARCHAR(255)"],
            ['phone', "VARCHAR(50)"],
            ['area', "VARCHAR(100)"],
            ['position', "VARCHAR(100)"],
            ['status', "VARCHAR(50) DEFAULT 'Active'"],
            ['active_date', "DATE"],
            ['inactive_date', "DATE"],
            ['profile_image', "TEXT"],
            ['created_at', "TIMESTAMP DEFAULT NOW()"]
        ];
        for (const [c, d] of picCols) await safeAddColumn('person_in_charge', c, d);

        // ==========================================
        // 8. COVERAGE_SITES
        // ==========================================
        console.log('8. coverage_sites');
        await db.query(`CREATE TABLE IF NOT EXISTS coverage_sites (id SERIAL PRIMARY KEY)`);
        const coverageCols = [
            ['network_type', "VARCHAR(50)"],
            ['site_id', "VARCHAR(100)"],
            ['homepass_id', "VARCHAR(100)"],
            ['ampli_lat', "DECIMAL(10,8)"],
            ['ampli_long', "DECIMAL(11,8)"],
            ['area_lat', "DECIMAL(10,8)"],
            ['area_long', "DECIMAL(11,8)"],
            ['locality', "VARCHAR(255)"],
            ['province', "VARCHAR(100)"],
            ['cluster', "VARCHAR(100)"],
            ['status', "VARCHAR(50) DEFAULT 'active'"],
            ['polygon_data', "JSONB"],
            ['created_at', "TIMESTAMP DEFAULT NOW()"],
            ['updated_at', "TIMESTAMP DEFAULT NOW()"]
        ];
        for (const [c, d] of coverageCols) await safeAddColumn('coverage_sites', c, d);

        // ==========================================
        // 9. TICKETS
        // ==========================================
        console.log('9. tickets');
        await db.query(`CREATE TABLE IF NOT EXISTS tickets (id SERIAL PRIMARY KEY)`);
        const ticketCols = [
            ['ticket_number', "VARCHAR(50) UNIQUE"],
            ['customer_id', "INTEGER"],
            ['customer_name', "VARCHAR(255)"],
            ['category', "VARCHAR(100)"],
            ['description', "TEXT"],
            ['assigned_to', "INTEGER"],
            ['assigned_name', "VARCHAR(255)"],
            ['source', "VARCHAR(100) DEFAULT 'WhatsApp'"],
            ['priority', "VARCHAR(50) DEFAULT 'Medium'"],
            ['status', "VARCHAR(50) DEFAULT 'Open'"],
            ['solved_at', "TIMESTAMP"],
            ['updated_at', "TIMESTAMP DEFAULT NOW()"],
            ['created_at', "TIMESTAMP DEFAULT NOW()"]
        ];
        for (const [c, d] of ticketCols) await safeAddColumn('tickets', c, d);

        // ==========================================
        // 10. TICKET_ACTIVITIES
        // ==========================================
        console.log('10. ticket_activities');
        await db.query(`CREATE TABLE IF NOT EXISTS ticket_activities (id SERIAL PRIMARY KEY)`);
        const taCols = [
            ['ticket_id', "INTEGER REFERENCES tickets(id) ON DELETE CASCADE"],
            ['activity_type', "VARCHAR(50) DEFAULT 'note'"],
            ['content', "TEXT"],
            ['created_by', "VARCHAR(100) DEFAULT 'System'"],
            ['created_at', "TIMESTAMP DEFAULT NOW()"]
        ];
        for (const [c, d] of taCols) await safeAddColumn('ticket_activities', c, d);

        // ==========================================
        // 11. USERS
        // ==========================================
        console.log('11. users');
        await db.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY)`);
        const userCols = [
            ['username', "VARCHAR(100) NOT NULL UNIQUE"],
            ['email', "VARCHAR(255) NOT NULL UNIQUE"],
            ['password_hash', "VARCHAR(255) NOT NULL"],
            ['full_name', "VARCHAR(255)"],
            ['role', "VARCHAR(100) DEFAULT 'user'"],
            ['cluster', "VARCHAR(100)"],
            ['province', "VARCHAR(100)"],
            ['is_active', "BOOLEAN DEFAULT true"],
            ['last_login', "TIMESTAMP"],
            ['created_at', "TIMESTAMP DEFAULT NOW()"],
            ['updated_at', "TIMESTAMP DEFAULT NOW()"]
        ];
        for (const [c, d] of userCols) await safeAddColumn('users', c, d);

        // Default admin
        const defaultHash = crypto.createHash('sha256').update('password123').digest('hex');
        try {
            await db.query(`INSERT INTO users (username, email, password_hash, full_name, role, is_active) VALUES ('admin', 'admin@netsales.com', $1, 'Administrator', 'Admin', true) ON CONFLICT (username) DO NOTHING`, [defaultHash]);
        } catch (e) { }

        // ==========================================
        // 12. ROLES
        // ==========================================
        console.log('12. roles');
        await db.query(`CREATE TABLE IF NOT EXISTS roles (id SERIAL PRIMARY KEY)`);
        const roleCols = [
            ['name', "VARCHAR(100) NOT NULL UNIQUE"],
            ['description', "TEXT"],
            ['permissions', "JSONB DEFAULT '[]'"],
            ['allowed_clusters', "JSONB DEFAULT '[]'"],
            ['allowed_provinces', "JSONB DEFAULT '[]'"],
            ['data_scope', "VARCHAR(50) DEFAULT 'all'"],
            ['is_active', "BOOLEAN DEFAULT true"],
            ['created_at', "TIMESTAMP DEFAULT NOW()"],
            ['updated_at', "TIMESTAMP DEFAULT NOW()"]
        ];
        for (const [c, d] of roleCols) await safeAddColumn('roles', c, d);

        // Init default roles
        try {
            await db.query(`INSERT INTO roles (name, description, permissions, data_scope) VALUES ('Admin','Full system access','["all"]','all'),('Sales','Sales and prospect management','["prospects","customers","coverage"]','cluster'),('Manager','View reports and manage team','["reports","prospects","customers"]','province') ON CONFLICT (name) DO NOTHING`);
        } catch (e) { }

        // ==========================================
        // 13. SYSTEM_SETTINGS
        // ==========================================
        console.log('13. system_settings');
        await db.query(`CREATE TABLE IF NOT EXISTS system_settings (key VARCHAR(100) PRIMARY KEY)`);
        await safeAddColumn('system_settings', 'value', 'TEXT');
        await safeAddColumn('system_settings', 'updated_at', 'TIMESTAMP DEFAULT NOW()');

        // ==========================================
        // 14. CLUSTERS (MASTER DATA)
        // ==========================================
        console.log('14. clusters');
        await db.query(`CREATE TABLE IF NOT EXISTS clusters (id SERIAL PRIMARY KEY)`);
        await safeAddColumn('clusters', 'name', 'VARCHAR(100) NOT NULL UNIQUE');
        await safeAddColumn('clusters', 'province', 'VARCHAR(100)');
        await safeAddColumn('clusters', 'description', 'TEXT');
        await safeAddColumn('clusters', 'is_active', 'BOOLEAN DEFAULT true');
        await safeAddColumn('clusters', 'created_at', 'TIMESTAMP DEFAULT NOW()');

        // ==========================================
        // 15. PROVINCES (MASTER DATA)
        // ==========================================
        console.log('15. provinces');
        await db.query(`CREATE TABLE IF NOT EXISTS provinces (id SERIAL PRIMARY KEY)`);
        await safeAddColumn('provinces', 'name', 'VARCHAR(100) NOT NULL UNIQUE');
        await safeAddColumn('provinces', 'code', 'VARCHAR(10)');
        await safeAddColumn('provinces', 'is_active', 'BOOLEAN DEFAULT true');
        await safeAddColumn('provinces', 'created_at', 'TIMESTAMP DEFAULT NOW()');

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
        // 16. PERFORMANCE INDEXES
        // ==========================================
        console.log('16. Applying Indexes');
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_coverage_lat_lng ON coverage_sites (ampli_lat, ampli_long)',
            'CREATE INDEX IF NOT EXISTS idx_coverage_network_type ON coverage_sites (network_type)',
            'CREATE INDEX IF NOT EXISTS idx_coverage_site_id ON coverage_sites (site_id)',
            'CREATE INDEX IF NOT EXISTS idx_customers_status ON customers (status)',
            'CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers (is_active)',
            'CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status)',
            'CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets (customer_id)',
        ];
        for (const idx of indexes) {
            try { await db.query(idx); } catch (e) { }
        }

        console.log('\n✅ All tables setup complete!');
        process.exit(0);
    } catch (err) {
        console.error('Setup failed:', err);
        process.exit(1);
    }
}

setupAllTables();
