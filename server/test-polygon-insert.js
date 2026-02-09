import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testPolygonInsert() {
    const client = await pool.connect();
    const result = {};

    try {
        console.log('=== TEST POLYGON INSERT ===\n');

        // Test data - sample polygon
        const testPolygon = [
            [-6.2088, 106.8456],
            [-6.2090, 106.8460],
            [-6.2092, 106.8455],
            [-6.2088, 106.8456]
        ];

        console.log('1. Testing polygon insert...');
        console.log('   Polygon data:', JSON.stringify(testPolygon));

        // Try to insert
        const insertQuery = `
            INSERT INTO coverage_sites (
                network_type, site_id, ampli_lat, ampli_long, locality, status, polygon_data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `;

        const insertResult = await client.query(insertQuery, [
            'TEST',
            'TEST-POLYGON-' + Date.now(),
            -6.2089,
            106.8457,
            'Test Polygon Insert',
            'Active',
            JSON.stringify(testPolygon)
        ]);

        console.log('2. Insert successful! ID:', insertResult.rows[0].id);
        result.insertSuccess = true;
        result.insertedId = insertResult.rows[0].id;

        // Verify the data
        const verifyResult = await client.query(
            'SELECT id, site_id, polygon_data FROM coverage_sites WHERE id = $1',
            [insertResult.rows[0].id]
        );

        console.log('3. Verification:');
        console.log('   Site ID:', verifyResult.rows[0].site_id);
        console.log('   Polygon data:', verifyResult.rows[0].polygon_data);
        result.verifySuccess = true;
        result.polygonData = verifyResult.rows[0].polygon_data;

        // Clean up test data
        await client.query('DELETE FROM coverage_sites WHERE id = $1', [insertResult.rows[0].id]);
        console.log('4. Test data cleaned up');

        console.log('\n✅ ALL TESTS PASSED! Polygon insert works correctly.');
        result.allPassed = true;

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('Stack:', error.stack);
        result.error = error.message;
        result.stack = error.stack;
    } finally {
        fs.writeFileSync(join(__dirname, 'test-polygon-result.json'), JSON.stringify(result, null, 2));
        client.release();
        await pool.end();
    }
}

testPolygonInsert();
