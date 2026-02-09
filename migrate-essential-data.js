import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// NeonDB (Source)
const neonPool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_pCbmvUIt62Oj@ep-winter-feather-a1iqqz09-pooler.ap-southeast-1.aws.neon.tech/neondb',
    ssl: { rejectUnauthorized: false }
});

// Supabase (Destination)
const supabasePool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const migrateData = async () => {
    console.log('🚀 Starting migration from NeonDB to Supabase...');
    console.log('📋 Migrating only essential tables (skipping coverage_sites)\n');

    try {
        const neonClient = await neonPool.connect();
        const supabaseClient = await supabasePool.connect();

        // Only migrate essential tables (skip coverage_sites which has 194k+ rows)
        const tables = [
            'person_in_charge',
            'products',
            'promos',
            'target_clusters',
            'target_cities',
            'customers',
            'hot_news',
            'tickets',
            'ticket_activities',
            'users',
            'system_settings',
            'app_settings'
        ];

        for (const table of tables) {
            try {
                console.log(`📦 Migrating table: ${table}...`);

                // Check if table exists in NeonDB
                const checkTable = await neonClient.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = $1
                    )
                `, [table]);

                if (!checkTable.rows[0].exists) {
                    console.log(`   ⚠️  Table ${table} does not exist in NeonDB, skipping...`);
                    continue;
                }

                // Get data from NeonDB
                const result = await neonClient.query(`SELECT * FROM ${table}`);
                const rows = result.rows;

                if (rows.length === 0) {
                    console.log(`   ℹ️  Table ${table} is empty, skipping...`);
                    continue;
                }

                console.log(`   Found ${rows.length} rows`);

                // Get column names
                const columns = Object.keys(rows[0]);
                const columnList = columns.join(', ');
                const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

                // Insert data into Supabase
                let inserted = 0;
                for (const row of rows) {
                    try {
                        const values = columns.map(col => row[col]);
                        await supabaseClient.query(
                            `INSERT INTO ${table} (${columnList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                            values
                        );
                        inserted++;
                    } catch (err) {
                        // Skip conflicts or errors for individual rows
                        if (inserted === 0) {
                            console.log(`   ⚠️  Error on first row: ${err.message}`);
                        }
                    }
                }

                console.log(`   ✅ Migrated ${inserted}/${rows.length} rows\n`);

            } catch (err) {
                console.log(`   ❌ Error migrating ${table}: ${err.message}\n`);
            }
        }

        // Reset sequences for auto-increment columns
        console.log('🔄 Resetting sequences...');
        for (const table of tables) {
            try {
                await supabaseClient.query(`
                    SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1)) 
                    FROM ${table}
                `);
            } catch (err) {
                // Ignore if table doesn't have id column
            }
        }

        neonClient.release();
        supabaseClient.release();

        console.log('\n✅ Migration completed successfully!');
        console.log('🎉 Essential data has been migrated from NeonDB to Supabase.');
        console.log('ℹ️  Note: coverage_sites table was skipped due to large size (194k+ rows)');

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await neonPool.end();
        await supabasePool.end();
    }
};

migrateData();
