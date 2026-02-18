import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const neonPool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_pCbmvUIt62Oj@ep-winter-feather-a1iqqz09-pooler.ap-southeast-1.aws.neon.tech/neondb',
    ssl: { rejectUnauthorized: false }
});

const supabasePool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const resetAndMigrate = async () => {
    console.log('🚀 Resetting & Migrating Critical Tables in Supabase (Vercel)...\n');

    const neonClient = await neonPool.connect();
    const supabaseClient = await supabasePool.connect();

    try {
        // 1. DROP Tables (Clean Slate)
        console.log('🗑️  Dropping tables with incorrect schema...');
        await supabaseClient.query('DROP TABLE IF EXISTS target_cities CASCADE');
        await supabaseClient.query('DROP TABLE IF EXISTS target_clusters CASCADE');
        await supabaseClient.query('DROP TABLE IF EXISTS hot_news CASCADE');

        // 2. CREATE Tables (Correct Schema from setup-all-tables.js logic)
        console.log('🏗️  Re-creating tables with correct schema...');

        // target_clusters
        await supabaseClient.query(`
            CREATE TABLE target_clusters (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100),
                total_target INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ target_clusters created');

        // target_cities
        await supabaseClient.query(`
            CREATE TABLE target_cities (
                id SERIAL PRIMARY KEY,
                cluster_id INTEGER REFERENCES target_clusters(id) ON DELETE CASCADE,
                city_name VARCHAR(100),
                province VARCHAR(100),
                homepass INTEGER DEFAULT 0,
                percentage NUMERIC(5,2) DEFAULT 0,
                target INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ target_cities created');

        // hot_news
        await supabaseClient.query(`
            CREATE TABLE hot_news (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT,
                category VARCHAR(50),
                image_url TEXT,
                is_active BOOLEAN DEFAULT true,
                created_by INTEGER,
                priority INTEGER DEFAULT 0,
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ hot_news created');

        // 3. MIGRATE DATA
        console.log('\n📦 Migrating Data...');

        // Target Clusters
        let res = await neonClient.query('SELECT * FROM target_clusters');
        for (const row of res.rows) {
            await supabaseClient.query(
                'INSERT INTO target_clusters (id, name, total_target, created_at) VALUES ($1, $2, $3, $4)',
                [row.id, row.name, row.total_target, row.created_at]
            );
        }
        await supabaseClient.query(`SELECT setval('target_clusters_id_seq', (SELECT MAX(id) FROM target_clusters))`);
        console.log(`   ✅ target_clusters: Migrated ${res.rows.length} rows`);

        // Target Cities
        res = await neonClient.query('SELECT * FROM target_cities');
        for (const row of res.rows) {
            await supabaseClient.query(
                `INSERT INTO target_cities (id, cluster_id, city_name, province, homepass, percentage, target) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [row.id, row.cluster_id, row.city_name, row.province, row.homepass, row.percentage, row.target]
            );
        }
        await supabaseClient.query(`SELECT setval('target_cities_id_seq', (SELECT MAX(id) FROM target_cities))`);
        console.log(`   ✅ target_cities: Migrated ${res.rows.length} rows`);

        // Hot News
        res = await neonClient.query('SELECT * FROM hot_news');
        for (const row of res.rows) {
            // Fix created_by: If string 'System', use NULL or Admin(1). Let's use NULL if not integer.
            let creator = null;
            if (typeof row.created_by === 'number') creator = row.created_by;

            await supabaseClient.query(
                `INSERT INTO hot_news (id, title, content, priority, start_date, end_date, is_active, created_by, created_at, updated_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [row.id, row.title, row.content, row.priority || 0, row.start_date, row.end_date, row.is_active, creator, row.created_at, row.updated_at]
            );
        }
        await supabaseClient.query(`SELECT setval('hot_news_id_seq', (SELECT MAX(id) FROM hot_news))`);
        console.log(`   ✅ hot_news: Migrated ${res.rows.length} rows`);

        console.log('\n✅ All critical tables fixed and migrated!');

    } catch (err) {
        console.error('❌ Error during reset/migrate:', err);
    } finally {
        neonClient.release();
        supabaseClient.release();
        await neonPool.end();
        await supabasePool.end();
        process.exit(0);
    }
};

resetAndMigrate();
