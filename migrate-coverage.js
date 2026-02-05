import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const migrateCoverageTable = async () => {
    console.log('🔄 Migrating coverage_sites table to simplified structure...');
    try {
        const client = await pool.connect();
        console.log('✅ Connected to NeonDB');

        await client.query('BEGIN');

        // Drop old table and create new simplified one
        console.log('📋 Dropping old coverage_sites table...');
        await client.query('DROP TABLE IF EXISTS coverage_sites CASCADE');

        console.log('📋 Creating new simplified coverage_sites table...');
        await client.query(`
      CREATE TABLE coverage_sites (
        id SERIAL PRIMARY KEY,
        network_type VARCHAR(50) DEFAULT 'HFC',
        site_id VARCHAR(100) NOT NULL,
        ampli_lat DECIMAL(10, 8),
        ampli_long DECIMAL(11, 8),
        locality VARCHAR(200),
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        console.log('📋 Creating indexes...');
        await client.query('CREATE INDEX idx_coverage_site_id ON coverage_sites(site_id)');
        await client.query('CREATE INDEX idx_coverage_locality ON coverage_sites(locality)');
        await client.query('CREATE INDEX idx_coverage_network ON coverage_sites(network_type)');

        await client.query('COMMIT');
        console.log('✅ Migration completed successfully!');
        console.log('');
        console.log('New table structure:');
        console.log('  - network_type (VARCHAR 50)');
        console.log('  - site_id (VARCHAR 100)');
        console.log('  - ampli_lat (DECIMAL)');
        console.log('  - ampli_long (DECIMAL)');
        console.log('  - locality (VARCHAR 200)');
        console.log('  - status (VARCHAR 20)');
        console.log('');

        client.release();
        pool.end();
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('❌ Migration error:', err);
        process.exit(1);
    }
};

migrateCoverageTable();
