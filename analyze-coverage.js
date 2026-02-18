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
    ssl: { rejectUnauthorized: false }
});

async function check() {
    const client = await pool.connect();

    // Total
    const total = await client.query('SELECT COUNT(*) FROM coverage_sites');
    console.log('Total semua:', total.rows[0].count);

    // Yang punya lat/long
    const withCoords = await client.query('SELECT COUNT(*) FROM coverage_sites WHERE ampli_lat IS NOT NULL AND ampli_long IS NOT NULL');
    console.log('Yang punya koordinat:', withCoords.rows[0].count);

    // Yang tidak punya lat/long
    const noCoords = await client.query('SELECT COUNT(*) FROM coverage_sites WHERE ampli_lat IS NULL OR ampli_long IS NULL');
    console.log('Yang TIDAK punya koordinat:', noCoords.rows[0].count);

    // Status breakdown
    const byStatus = await client.query('SELECT status, COUNT(*) FROM coverage_sites GROUP BY status ORDER BY COUNT(*) DESC');
    console.log('\nBreakdown per status:');
    byStatus.rows.forEach(r => console.log(`  ${r.status || 'NULL'}: ${r.count}`));

    // Network type breakdown
    const byNetwork = await client.query('SELECT network_type, COUNT(*) FROM coverage_sites GROUP BY network_type ORDER BY COUNT(*) DESC LIMIT 10');
    console.log('\nTop 10 network_type:');
    byNetwork.rows.forEach(r => console.log(`  ${r.network_type || 'NULL'}: ${r.count}`));

    client.release();
    await pool.end();
    process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
