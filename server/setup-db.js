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

const setupSchema = async () => {
  console.log('Connecting to NeonDB...');
  try {
    const client = await pool.connect();
    console.log('Connected successfully!');

    // START TRANSACTION
    await client.query('BEGIN');

    const createTableQuery = `
      -- Coverage Sites (Simplified Structure)
      CREATE TABLE IF NOT EXISTS coverage_sites (
        id SERIAL PRIMARY KEY,
        network_type VARCHAR(50) DEFAULT 'HFC',
        site_id VARCHAR(100) NOT NULL,
        ampli_lat DECIMAL(10, 8),
        ampli_long DECIMAL(11, 8),
        locality VARCHAR(200),
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_coverage_site_id ON coverage_sites(site_id);
      CREATE INDEX IF NOT EXISTS idx_coverage_locality ON coverage_sites(locality);
      CREATE INDEX IF NOT EXISTS idx_coverage_network ON coverage_sites(network_type);

      -- Person In Charge
      CREATE TABLE IF NOT EXISTS person_in_charge (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL, -- Sales or Support
        employee_id VARCHAR(50),
        email VARCHAR(100),
        phone VARCHAR(50),
        area VARCHAR(100), -- For Sales
        position VARCHAR(100), -- For Support
        status VARCHAR(20) DEFAULT 'Active',
        active_date DATE,
        inactive_date DATE,
        profile_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Products
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL, -- Retail, Corporate
        service_type VARCHAR(50),
        price DECIMAL(15, 2) DEFAULT 0,
        cogs DECIMAL(15, 2) DEFAULT 0,
        bandwidth VARCHAR(50),
        release_date DATE,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Promos
      CREATE TABLE IF NOT EXISTS promos (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        valid_from DATE,
        valid_to DATE,
        price DECIMAL(15, 2) DEFAULT 0,
        cogs DECIMAL(15, 2) DEFAULT 0,
        description TEXT,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Targets (Cluster Level)
      CREATE TABLE IF NOT EXISTS target_clusters (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        total_target INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Targets (City Level in Cluster)
      CREATE TABLE IF NOT EXISTS target_cities (
        id SERIAL PRIMARY KEY,
        cluster_id INTEGER REFERENCES target_clusters(id) ON DELETE CASCADE,
        city_name VARCHAR(100) NOT NULL,
        province VARCHAR(100),
        homepass INTEGER DEFAULT 0,
        percentage DECIMAL(5, 2) DEFAULT 0,
        target INTEGER DEFAULT 0
      );
    `;

    console.log('Creating tables...');
    await client.query(createTableQuery);
    console.log('Tables created successfully!');

    await client.query('COMMIT');

    // Initial Seed if empty
    // ... skipping seed for now as we just want structure

    client.release();
    pool.end();
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error setup database:', err);
    process.exit(1);
  }
};

setupSchema();
