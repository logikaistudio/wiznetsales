import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixSequence() {
    const client = await pool.connect();

    try {
        console.log('=== FIXING SEQUENCE ===\n');

        // Get max ID from table
        const maxResult = await client.query('SELECT MAX(id) as max_id FROM coverage_sites');
        const maxId = maxResult.rows[0].max_id || 0;
        console.log('1. Current max ID:', maxId);

        // Get current sequence value
        const seqResult = await client.query("SELECT last_value FROM coverage_sites_id_seq");
        console.log('2. Current sequence value:', seqResult.rows[0].last_value);

        // Reset sequence to max + 1
        const newSeqValue = maxId + 1;
        await client.query(`ALTER SEQUENCE coverage_sites_id_seq RESTART WITH ${newSeqValue}`);
        console.log('3. Sequence reset to:', newSeqValue);

        // Verify
        const verifySeq = await client.query("SELECT last_value FROM coverage_sites_id_seq");
        console.log('4. New sequence value:', verifySeq.rows[0].last_value);

        console.log('\n✅ Sequence fixed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixSequence();
