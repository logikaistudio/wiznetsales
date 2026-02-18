import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// NeonDB (Source - lama)
const neonPool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_pCbmvUIt62Oj@ep-winter-feather-a1iqqz09-pooler.ap-southeast-1.aws.neon.tech/neondb',
    ssl: { rejectUnauthorized: false }
});

// Supabase (Destination - production)
const supabasePool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const tables = [
    'coverage_sites', 'person_in_charge', 'products', 'promos',
    'target_clusters', 'target_cities', 'customers', 'hot_news',
    'tickets', 'ticket_activities', 'users', 'system_settings'
];

async function checkBothDbs() {
    console.log('=== PERBANDINGAN DATA: NeonDB vs Supabase ===\n');
    console.log('Table                  | NeonDB | Supabase | Status');
    console.log('-'.repeat(60));

    const neonClient = await neonPool.connect();
    const supabaseClient = await supabasePool.connect();

    let totalNeon = 0, totalSupabase = 0;

    for (const table of tables) {
        let neonCount = 0, supabaseCount = 0;

        try {
            const r = await neonClient.query(`SELECT COUNT(*) FROM ${table}`);
            neonCount = parseInt(r.rows[0].count);
        } catch (e) {
            neonCount = -1; // table not found
        }

        try {
            const r = await supabaseClient.query(`SELECT COUNT(*) FROM ${table}`);
            supabaseCount = parseInt(r.rows[0].count);
        } catch (e) {
            supabaseCount = -1; // table not found
        }

        const status = neonCount === supabaseCount ? '✅ SAMA' :
            neonCount === -1 ? '⚠️  Tidak ada di Neon' :
                supabaseCount === -1 ? '❌ Tidak ada di Supabase' :
                    supabaseCount === 0 && neonCount > 0 ? '🔴 KOSONG di Supabase!' :
                        supabaseCount < neonCount ? '🟡 Kurang data' : '✅ OK';

        const tablePad = table.padEnd(22);
        const neonStr = (neonCount === -1 ? 'N/A' : neonCount.toString()).padEnd(6);
        const supStr = (supabaseCount === -1 ? 'N/A' : supabaseCount.toString()).padEnd(8);
        console.log(`${tablePad} | ${neonStr} | ${supStr} | ${status}`);

        if (neonCount > 0) totalNeon += neonCount;
        if (supabaseCount > 0) totalSupabase += supabaseCount;
    }

    console.log('-'.repeat(60));
    console.log(`TOTAL                  | ${totalNeon.toString().padEnd(6)} | ${totalSupabase.toString().padEnd(8)} |`);
    console.log('\n');

    if (totalNeon > totalSupabase) {
        console.log(`⚠️  Ada ${totalNeon - totalSupabase} baris data di NeonDB yang BELUM ada di Supabase!`);
        console.log('👉 Jalankan: node migrate-neon-to-supabase.js');
    } else {
        console.log('✅ Data sudah sinkron!');
    }

    neonClient.release();
    supabaseClient.release();
    await neonPool.end();
    await supabasePool.end();
    process.exit(0);
}

checkBothDbs().catch(e => { console.error(e); process.exit(1); });
