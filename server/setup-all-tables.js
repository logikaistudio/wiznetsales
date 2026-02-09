/**
 * Complete Database Setup Script
 * Run this to ensure all tables exist in Supabase
 */
import db from './db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function setupAllTables() {
    console.log('🔧 Starting complete database setup...\n');

    try {
        // ==========================================
        // 1. ROLES TABLE (with cluster/province support)
        // ==========================================
        console.log('📋 Setting up roles table...');
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

        // Add new columns if they don't exist
        await db.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='allowed_clusters') THEN
                    ALTER TABLE roles ADD COLUMN allowed_clusters JSONB DEFAULT '[]';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='allowed_provinces') THEN
                    ALTER TABLE roles ADD COLUMN allowed_provinces JSONB DEFAULT '[]';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='data_scope') THEN
                    ALTER TABLE roles ADD COLUMN data_scope VARCHAR(50) DEFAULT 'all';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='is_active') THEN
                    ALTER TABLE roles ADD COLUMN is_active BOOLEAN DEFAULT true;
                END IF;
            END $$;
        `);

        // Insert default roles
        await db.query(`
            INSERT INTO roles (name, description, permissions, data_scope) VALUES
            ('Admin', 'Full system access', '["all"]', 'all'),
            ('Sales', 'Sales and prospect management', '["prospects", "customers", "coverage"]', 'cluster'),
            ('Manager', 'View reports and manage team', '["reports", "prospects", "customers"]', 'province')
            ON CONFLICT (name) DO NOTHING
        `);
        console.log('✅ Roles table ready\n');

        // ==========================================
        // 2. USERS TABLE
        // ==========================================
        console.log('👤 Setting up users table...');
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

        // Add cluster/province columns if not exist
        await db.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='cluster') THEN
                    ALTER TABLE users ADD COLUMN cluster VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='province') THEN
                    ALTER TABLE users ADD COLUMN province VARCHAR(100);
                END IF;
            END $$;
        `);

        // Insert default admin
        await db.query(`
            INSERT INTO users (username, email, password_hash, full_name, role, is_active) VALUES
            ('admin', 'admin@netsales.com', 'admin123', 'Administrator', 'Admin', true)
            ON CONFLICT (username) DO NOTHING
        `);
        console.log('✅ Users table ready\n');

        // ==========================================
        // 3. COVERAGE_SITES TABLE
        // ==========================================
        console.log('📍 Setting up coverage_sites table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS coverage_sites (
                id SERIAL PRIMARY KEY,
                network_type VARCHAR(50),
                site_id VARCHAR(100),
                homepass_id VARCHAR(100),
                ampli_lat DECIMAL(10, 8),
                ampli_long DECIMAL(11, 8),
                area_lat DECIMAL(10, 8),
                area_long DECIMAL(11, 8),
                locality VARCHAR(255),
                province VARCHAR(100),
                cluster VARCHAR(100),
                status VARCHAR(50) DEFAULT 'active',
                polygon_data JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Add homepass_id, province, cluster columns if not exist
        await db.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coverage_sites' AND column_name='homepass_id') THEN
                    ALTER TABLE coverage_sites ADD COLUMN homepass_id VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coverage_sites' AND column_name='province') THEN
                    ALTER TABLE coverage_sites ADD COLUMN province VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coverage_sites' AND column_name='cluster') THEN
                    ALTER TABLE coverage_sites ADD COLUMN cluster VARCHAR(100);
                END IF;
            END $$;
        `);
        console.log('✅ Coverage_sites table ready\n');

        // ==========================================
        // 4. PROSPECTS TABLE
        // ==========================================
        console.log('📝 Setting up prospects table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS prospects (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                email VARCHAR(255),
                address TEXT,
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                province VARCHAR(100),
                cluster VARCHAR(100),
                locality VARCHAR(255),
                product_interest VARCHAR(100),
                status VARCHAR(50) DEFAULT 'new',
                source VARCHAR(100),
                notes TEXT,
                assigned_to INTEGER,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Prospects table ready\n');

        // ==========================================
        // 5. CUSTOMERS TABLE
        // ==========================================
        console.log('👥 Setting up customers table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                email VARCHAR(255),
                address TEXT,
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                province VARCHAR(100),
                cluster VARCHAR(100),
                locality VARCHAR(255),
                product VARCHAR(100),
                subscription_date DATE,
                status VARCHAR(50) DEFAULT 'active',
                homepass_id VARCHAR(100),
                site_id VARCHAR(100),
                monthly_fee DECIMAL(12, 2),
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Customers table ready\n');

        // ==========================================
        // 6. PRODUCTS TABLE
        // ==========================================
        console.log('📦 Setting up products table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                service_type VARCHAR(50),
                price DECIMAL(12, 2),
                speed VARCHAR(50),
                features JSONB DEFAULT '[]',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Products table ready\n');

        // ==========================================
        // 7. TARGETS TABLE
        // ==========================================
        console.log('🎯 Setting up targets table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS targets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                cluster VARCHAR(100),
                province VARCHAR(100),
                year INTEGER,
                month INTEGER,
                target_prospects INTEGER DEFAULT 0,
                target_customers INTEGER DEFAULT 0,
                target_revenue DECIMAL(15, 2) DEFAULT 0,
                actual_prospects INTEGER DEFAULT 0,
                actual_customers INTEGER DEFAULT 0,
                actual_revenue DECIMAL(15, 2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Targets table ready\n');

        // ==========================================
        // 8. CLUSTERS TABLE (Master data)
        // ==========================================
        console.log('🏢 Setting up clusters table...');
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

        // Insert sample clusters
        await db.query(`
            INSERT INTO clusters (name, province) VALUES
            ('Jakarta Pusat', 'DKI Jakarta'),
            ('Jakarta Selatan', 'DKI Jakarta'),
            ('Jakarta Barat', 'DKI Jakarta'),
            ('Jakarta Timur', 'DKI Jakarta'),
            ('Jakarta Utara', 'DKI Jakarta'),
            ('Bandung', 'Jawa Barat'),
            ('Bekasi', 'Jawa Barat'),
            ('Bogor', 'Jawa Barat'),
            ('Depok', 'Jawa Barat'),
            ('Tangerang', 'Banten'),
            ('Surabaya', 'Jawa Timur'),
            ('Semarang', 'Jawa Tengah'),
            ('Medan', 'Sumatera Utara'),
            ('Makassar', 'Sulawesi Selatan'),
            ('Denpasar', 'Bali')
            ON CONFLICT (name) DO NOTHING
        `);
        console.log('✅ Clusters table ready\n');

        // ==========================================
        // 9. PROVINCES TABLE (Master data)
        // ==========================================
        console.log('🗺️ Setting up provinces table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS provinces (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                code VARCHAR(10),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Insert Indonesian provinces
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
        console.log('✅ Provinces table ready\n');

        // ==========================================
        // 10. SYSTEM_SETTINGS TABLE
        // ==========================================
        console.log('⚙️ Setting up system_settings table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                id SERIAL PRIMARY KEY,
                key VARCHAR(100) NOT NULL UNIQUE,
                value TEXT,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Insert default settings
        await db.query(`
            INSERT INTO system_settings (key, value) VALUES
            ('app_name', 'Netsales'),
            ('app_description', 'ISP Sales Dashboard'),
            ('app_logo', '')
            ON CONFLICT (key) DO NOTHING
        `);
        console.log('✅ System_settings table ready\n');

        // ==========================================
        // 11. HOT_NEWS TABLE
        // ==========================================
        console.log('📰 Setting up hot_news table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS hot_news (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT,
                category VARCHAR(100),
                image_url TEXT,
                is_active BOOLEAN DEFAULT true,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Hot_news table ready\n');

        // ==========================================
        // 12. PROMOS TABLE
        // ==========================================
        console.log('🎁 Setting up promos table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS promos (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                discount_type VARCHAR(50),
                discount_value DECIMAL(10, 2),
                start_date DATE,
                end_date DATE,
                terms TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Promos table ready\n');

        // ==========================================
        // VERIFY ALL TABLES
        // ==========================================
        console.log('🔍 Verifying all tables...');
        const tables = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        console.log('\n📊 Tables in database:');
        tables.rows.forEach(t => console.log(`   - ${t.table_name}`));

        console.log('\n✅ Database setup complete!');

    } catch (error) {
        console.error('❌ Setup error:', error);
    } finally {
        process.exit(0);
    }
}

setupAllTables();
