import db from './server/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function createMissingTables() {
    console.log('🔧 Creating missing tables...\n');

    try {
        // Target Cities table
        console.log('📍 Creating target_cities table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS target_cities (
                id SERIAL PRIMARY KEY,
                city_name VARCHAR(255) NOT NULL,
                province VARCHAR(100),
                cluster VARCHAR(100),
                homepass INTEGER DEFAULT 0,
                target_percentage DECIMAL(5, 2) DEFAULT 0,
                target_subscribers INTEGER DEFAULT 0,
                actual_subscribers INTEGER DEFAULT 0,
                year INTEGER,
                month INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ target_cities table created\n');

        // Target Clusters table
        console.log('📊 Creating target_clusters table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS target_clusters (
                id SERIAL PRIMARY KEY,
                cluster_name VARCHAR(255) NOT NULL,
                province VARCHAR(100),
                total_homepass INTEGER DEFAULT 0,
                target_percentage DECIMAL(5, 2) DEFAULT 0,
                target_subscribers INTEGER DEFAULT 0,
                actual_subscribers INTEGER DEFAULT 0,
                year INTEGER,
                month INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ target_clusters table created\n');

        // Person in Charge table
        console.log('👤 Creating person_in_charge table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS person_in_charge (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(50),
                position VARCHAR(100),
                sales_area VARCHAR(255),
                cluster VARCHAR(100),
                province VARCHAR(100),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ person_in_charge table created\n');

        // Tickets table
        console.log('🎫 Creating tickets table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id SERIAL PRIMARY KEY,
                ticket_number VARCHAR(50) UNIQUE,
                customer_id INTEGER,
                customer_name VARCHAR(255),
                category VARCHAR(100),
                description TEXT,
                priority VARCHAR(50) DEFAULT 'Medium',
                status VARCHAR(50) DEFAULT 'Open',
                assigned_to INTEGER,
                assigned_name VARCHAR(255),
                source VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                resolved_at TIMESTAMP
            )
        `);
        console.log('✅ tickets table created\n');

        // Ticket Activities table
        console.log('📝 Creating ticket_activities table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS ticket_activities (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                user_id INTEGER,
                user_name VARCHAR(255),
                action VARCHAR(100),
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ ticket_activities table created\n');

        // Helpdesk Agents table
        console.log('👨‍💼 Creating helpdesk_agents table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS helpdesk_agents (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(50),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ helpdesk_agents table created\n');

        console.log('✅ All missing tables created successfully!');

    } catch (error) {
        console.error('❌ Error creating tables:', error);
    } finally {
        process.exit(0);
    }
}

createMissingTables();
