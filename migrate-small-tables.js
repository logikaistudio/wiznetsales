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

const migrateTables = async () => {
    console.log('🚀 Migrating SMALL tables from NeonDB to Supabase AWS-1 (Vercel Prod)...\n');

    const neonClient = await neonPool.connect();
    const supabaseClient = await supabasePool.connect();

    try {
        const tables = [
            'hot_news',
            'target_clusters',
            'target_cities',
            'products',
            'promos',
            'person_in_charge',
            'customers',
            'tickets',
            'ticket_activities',
            'users',
            'roles',
            'system_settings'
        ];

        for (const table of tables) {
            try {
                process.stdout.write(`📦 Table ${table.padEnd(20)}: `);

                // Get data from Neon
                let rows = [];
                try {
                    const result = await neonClient.query(`SELECT * FROM ${table}`);
                    rows = result.rows;
                } catch (e) {
                    console.log(`⚠️  SKIP (NeonDB missing/error: ${e.message})`);
                    continue;
                }

                if (rows.length === 0) {
                    console.log('Skipping (Empty in Neon)');
                    continue;
                }

                console.log(`Found ${rows.length} rows`);

                const columns = Object.keys(rows[0]);
                const columnList = columns.join(', ');
                const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

                let inserted = 0;
                for (const row of rows) {
                    try {
                        const values = columns.map(c => row[c]);
                        await supabaseClient.query(
                            `INSERT INTO ${table} (${columnList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                            values
                        );
                        inserted++;
                    } catch (e) {
                        // ignore dupes or constraint errors
                    }
                }
                console.log(`   ✅ Migrated ${inserted} rows`);

                // Reset Sequence
                try {
                    await supabaseClient.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1)) FROM ${table}`);
                } catch (seqErr) { }

            } catch (err) {
                console.log(`❌ Error processing ${table}: ${err.message}`);
            }
        }

        console.log('\n✅ Small Tables Migration Finished!');

    } finally {
        neonClient.release();
        supabaseClient.release();
        await neonPool.end();
        await supabasePool.end();
        process.exit(0);
    }
};

migrateTables().catch(e => { console.error(e); process.exit(1); });
