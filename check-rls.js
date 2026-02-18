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

    // Simulasi persis query yang dipakai API (table view, no filter)
    const countResult = await client.query('SELECT COUNT(*) FROM coverage_sites');
    console.log('COUNT(*) langsung:', countResult.rows[0].count);

    // Coba query persis seperti di API (table view)
    const tableColumns = 'id, network_type, site_id, homepass_id, ampli_lat, ampli_long, area_lat, area_long, locality, province, cluster, status, created_at';
    const q = `SELECT ${tableColumns} FROM coverage_sites ORDER BY id DESC LIMIT 1 OFFSET 0`;
    const result = await client.query(q);
    console.log('\nSample row dari query API:');
    console.log(result.rows[0]);

    // Cek apakah ada RLS (Row Level Security) di Supabase
    const rlsCheck = await client.query(`
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE tablename = 'coverage_sites'
    `);
    console.log('\nRLS status:', rlsCheck.rows[0]);

    // Cek policies
    const policies = await client.query(`
        SELECT policyname, cmd, qual 
        FROM pg_policies 
        WHERE tablename = 'coverage_sites'
    `);
    console.log('\nPolicies:', policies.rows.length > 0 ? policies.rows : 'Tidak ada policy');

    client.release();
    await pool.end();
    process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
