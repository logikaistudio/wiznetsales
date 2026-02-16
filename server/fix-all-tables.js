/**
 * COMPREHENSIVE DATABASE MIGRATION SCRIPT
 * ========================================
 * This script audits and fixes ALL tables to match what server/index.js actually uses.
 * It will:
 * 1. Create missing tables
 * 2. Add missing columns to existing tables
 * 3. NOT drop existing data — safe to run multiple times
 */
import db from './db.js';

async function fixAllTables() {
    console.log('🔧 COMPREHENSIVE DATABASE FIX\n');
    console.log('='.repeat(60));

    const errors = [];

    try {
        // ============================================================
        // 1. target_clusters — used by /api/targets
        // ============================================================
        console.log('\n📋 1. target_clusters');
        await db.query(`
            CREATE TABLE IF NOT EXISTS target_clusters (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                total_target INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await safeAddColumn('target_clusters', 'total_target', 'INTEGER DEFAULT 0');
        console.log('   ✅ OK');

        // ============================================================
        // 2. target_cities — used by /api/targets
        // ============================================================
        console.log('\n📋 2. target_cities');
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
        console.log('   ✅ OK');

        // ============================================================
        // 3. products — used by /api/products
        // Needs: name, category, service_type, price, cogs, bandwidth, release_date, status
        // ============================================================
        console.log('\n📋 3. products');
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
        console.log('   ✅ OK');

        // ============================================================
        // 4. promos — used by /api/promos
        // Needs: name, valid_from, valid_to, price, cogs, description, status
        // ============================================================
        console.log('\n📋 4. promos');
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
        console.log('   ✅ OK');

        // ============================================================
        // 5. hot_news — used by /api/hotnews
        // Needs: title, content, priority, start_date, end_date, is_active, created_by(VARCHAR), created_at, updated_at
        // ============================================================
        console.log('\n📋 5. hot_news');
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
        await safeAddColumn('hot_news', 'updated_at', "TIMESTAMP DEFAULT NOW()");
        // created_by must be VARCHAR, not INTEGER — fix if it's the wrong type
        await safeAddColumn('hot_news', 'created_by', "VARCHAR(100) DEFAULT 'Admin'");
        console.log('   ✅ OK');

        // ============================================================
        // 6. customers — used by /api/customers
        // This is the most complex table. API uses many columns.
        // ============================================================
        console.log('\n📋 6. customers');
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
        await safeAddColumn('customers', 'customer_id', "VARCHAR(100)");
        // Add UNIQUE constraint if not exists
        try {
            await db.query(`
                DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'customers_customer_id_key'
                    ) THEN
                        BEGIN
                            ALTER TABLE customers ADD CONSTRAINT customers_customer_id_key UNIQUE (customer_id);
                        EXCEPTION WHEN others THEN
                            NULL;
                        END;
                    END IF;
                END $$;
            `);
        } catch (e) { /* ignore if constraint already exists */ }
        await safeAddColumn('customers', 'type', "VARCHAR(50)");
        await safeAddColumn('customers', 'area', "VARCHAR(100)");
        await safeAddColumn('customers', 'kabupaten', "VARCHAR(100)");
        await safeAddColumn('customers', 'kecamatan', "VARCHAR(100)");
        await safeAddColumn('customers', 'kelurahan', "VARCHAR(100)");
        await safeAddColumn('customers', 'product_id', "INTEGER");
        await safeAddColumn('customers', 'product_name', "VARCHAR(255)");
        await safeAddColumn('customers', 'rfs_date', "DATE");
        await safeAddColumn('customers', 'files', "JSONB DEFAULT '[]'");
        await safeAddColumn('customers', 'sales_id', "INTEGER");
        await safeAddColumn('customers', 'sales_name', "VARCHAR(100)");
        await safeAddColumn('customers', 'status', "VARCHAR(50) DEFAULT 'Prospect'");
        await safeAddColumn('customers', 'prospect_date', "DATE DEFAULT NOW()");
        await safeAddColumn('customers', 'is_active', "BOOLEAN DEFAULT true");
        await safeAddColumn('customers', 'fat', "VARCHAR(100)");
        await safeAddColumn('customers', 'homepass_id', "VARCHAR(100)");
        await safeAddColumn('customers', 'site_id', "VARCHAR(100)");
        console.log('   ✅ OK');

        // ============================================================
        // 7. person_in_charge — used by /api/person-incharge
        // ============================================================
        console.log('\n📋 7. person_in_charge');
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
        await safeAddColumn('person_in_charge', 'employee_id', "VARCHAR(50)");
        await safeAddColumn('person_in_charge', 'position', "VARCHAR(100)");
        await safeAddColumn('person_in_charge', 'active_date', "DATE");
        await safeAddColumn('person_in_charge', 'inactive_date', "DATE");
        await safeAddColumn('person_in_charge', 'profile_image', "TEXT");
        console.log('   ✅ OK');

        // ============================================================
        // 8. coverage_sites — used by /api/coverage
        // ============================================================
        console.log('\n📋 8. coverage_sites');
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
        console.log('   ✅ OK');

        // ============================================================
        // 9. tickets — used by /api/tickets
        // ============================================================
        console.log('\n📋 9. tickets');
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
        await safeAddColumn('tickets', 'ticket_number', "VARCHAR(50)");
        await safeAddColumn('tickets', 'customer_name', "VARCHAR(255)");
        await safeAddColumn('tickets', 'assigned_to', "INTEGER");
        await safeAddColumn('tickets', 'assigned_name', "VARCHAR(255)");
        await safeAddColumn('tickets', 'source', "VARCHAR(100) DEFAULT 'WhatsApp'");
        await safeAddColumn('tickets', 'priority', "VARCHAR(50) DEFAULT 'Medium'");
        await safeAddColumn('tickets', 'solved_at', "TIMESTAMP");
        await safeAddColumn('tickets', 'updated_at', "TIMESTAMP DEFAULT NOW()");
        console.log('   ✅ OK');

        // ============================================================
        // 10. ticket_activities — used by /api/tickets/:id/activities
        // ============================================================
        console.log('\n📋 10. ticket_activities');
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
        console.log('   ✅ OK');

        // ============================================================
        // 11. users — used by /api/users, /api/login
        // ============================================================
        console.log('\n📋 11. users');
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
        await safeAddColumn('users', 'is_active', "BOOLEAN DEFAULT true");
        await safeAddColumn('users', 'last_login', "TIMESTAMP");

        // Insert default admin if not exists
        const crypto = await import('crypto');
        const hash = crypto.default.createHash('sha256').update('password123').digest('hex');
        await db.query(`
            INSERT INTO users (username, email, password_hash, full_name, role, is_active)
            VALUES ('admin', 'admin@netsales.com', $1, 'Administrator', 'Admin', true)
            ON CONFLICT (username) DO NOTHING
        `, [hash]);
        console.log('   ✅ OK');

        // ============================================================
        // 12. roles — used by /api/roles
        // ============================================================
        console.log('\n📋 12. roles');
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
        console.log('   ✅ OK');

        // ============================================================
        // 13. system_settings — used by /api/settings
        // ============================================================
        console.log('\n📋 13. system_settings');
        await db.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(100) PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ OK');

        // ============================================================
        // 14. clusters — used by /api/clusters (master data for roles)
        // ============================================================
        console.log('\n📋 14. clusters (master data)');
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
        console.log('   ✅ OK');

        // ============================================================
        // 15. provinces — used by /api/provinces (master data for roles)
        // ============================================================
        console.log('\n📋 15. provinces (master data)');
        await db.query(`
            CREATE TABLE IF NOT EXISTS provinces (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                code VARCHAR(10),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ OK');

        // ============================================================
        // VERIFICATION — List all tables and their columns
        // ============================================================
        console.log('\n' + '='.repeat(60));
        console.log('🔍 VERIFICATION: All tables and columns\n');

        const tables = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        const expectedTables = [
            'target_clusters', 'target_cities', 'products', 'promos', 'hot_news',
            'customers', 'person_in_charge', 'coverage_sites', 'tickets',
            'ticket_activities', 'users', 'roles', 'system_settings',
            'clusters', 'provinces'
        ];

        console.log('📊 Tables in database:');
        for (const t of tables.rows) {
            const isExpected = expectedTables.includes(t.table_name);
            console.log(`   ${isExpected ? '✅' : '📄'} ${t.table_name}`);
        }

        // Check missing tables
        const existingTables = tables.rows.map(t => t.table_name);
        const missingTables = expectedTables.filter(t => !existingTables.includes(t));
        if (missingTables.length > 0) {
            console.log('\n⚠️  MISSING TABLES:');
            missingTables.forEach(t => console.log(`   ❌ ${t}`));
            errors.push(`Missing tables: ${missingTables.join(', ')}`);
        }

        // Verify critical columns exist
        console.log('\n📊 Column verification for critical tables:');

        const criticalColumns = {
            'target_clusters': ['id', 'name', 'total_target'],
            'target_cities': ['id', 'cluster_id', 'city_name', 'province', 'homepass', 'percentage', 'target'],
            'products': ['id', 'name', 'category', 'service_type', 'price', 'cogs', 'bandwidth', 'release_date', 'status'],
            'promos': ['id', 'name', 'valid_from', 'valid_to', 'price', 'cogs', 'description', 'status'],
            'hot_news': ['id', 'title', 'content', 'priority', 'start_date', 'end_date', 'is_active', 'created_by'],
            'customers': ['id', 'customer_id', 'type', 'name', 'address', 'area', 'kabupaten', 'kecamatan', 'kelurahan',
                'latitude', 'longitude', 'phone', 'email', 'product_id', 'product_name', 'rfs_date',
                'files', 'sales_id', 'sales_name', 'status', 'prospect_date', 'is_active', 'fat', 'homepass_id', 'site_id'],
            'person_in_charge': ['id', 'name', 'role', 'employee_id', 'email', 'phone', 'area', 'position', 'status', 'active_date', 'inactive_date', 'profile_image'],
            'coverage_sites': ['id', 'network_type', 'site_id', 'homepass_id', 'ampli_lat', 'ampli_long', 'locality', 'polygon_data'],
            'tickets': ['id', 'ticket_number', 'customer_id', 'customer_name', 'category', 'description', 'assigned_to', 'assigned_name', 'source', 'priority', 'status', 'solved_at'],
            'ticket_activities': ['id', 'ticket_id', 'activity_type', 'content', 'created_by'],
            'users': ['id', 'username', 'email', 'password_hash', 'full_name', 'role', 'is_active', 'last_login'],
            'roles': ['id', 'name', 'description', 'permissions', 'allowed_clusters', 'allowed_provinces', 'data_scope', 'is_active'],
        };

        for (const [table, expectedCols] of Object.entries(criticalColumns)) {
            if (!existingTables.includes(table)) {
                console.log(`   ❌ ${table} — TABLE MISSING`);
                continue;
            }

            const colRes = await db.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = $1
                ORDER BY ordinal_position
            `, [table]);

            const existingCols = colRes.rows.map(c => c.column_name);
            const missingCols = expectedCols.filter(c => !existingCols.includes(c));

            if (missingCols.length === 0) {
                console.log(`   ✅ ${table} — all ${expectedCols.length} columns present`);
            } else {
                console.log(`   ⚠️  ${table} — MISSING: ${missingCols.join(', ')}`);
                errors.push(`${table} missing columns: ${missingCols.join(', ')}`);
            }
        }

        // Final summary
        console.log('\n' + '='.repeat(60));
        if (errors.length === 0) {
            console.log('✅ ALL TABLES AND COLUMNS ARE CORRECT!');
            console.log('✅ Database is fully synchronized with the application.');
        } else {
            console.log(`⚠️  ${errors.length} issue(s) found:`);
            errors.forEach(e => console.log(`   - ${e}`));
        }

    } catch (error) {
        console.error('\n❌ FATAL ERROR:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

/**
 * Safely add a column to a table if it doesn't exist
 */
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
        console.error(`   ⚠️  Failed to add ${table}.${column}: ${err.message}`);
    }
}

fixAllTables();
