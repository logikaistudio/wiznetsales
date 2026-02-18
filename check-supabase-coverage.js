import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabasePool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    const client = await supabasePool.connect();

    // Count total
    const total = await client.query('SELECT COUNT(*) FROM coverage_sites');
    console.log('Total coverage_sites di Supabase:', total.rows[0].count);

    // Check max id
    const maxId = await client.query('SELECT MAX(id), MIN(id) FROM coverage_sites');
    console.log('ID range:', maxId.rows[0].min, '-', maxId.rows[0].max);

    // Sample data
    const sample = await client.query('SELECT id, site_id, network_type, ampli_lat, ampli_long FROM coverage_sites ORDER BY id DESC LIMIT 5');
    console.log('\nSample 5 data terbaru:');
    sample.rows.forEach(r => console.log(r));

    client.release();
    await supabasePool.end();
    process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
