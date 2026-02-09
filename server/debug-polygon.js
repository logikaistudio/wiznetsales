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

async function debugPolygonData() {
    const client = await pool.connect();
    const result = {};

    try {
        // Check if polygon_data column exists
        const colCheck = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'coverage_sites' AND column_name = 'polygon_data'
        `);
        result.columnExists = colCheck.rows.length > 0;
        result.columnType = colCheck.rows.length > 0 ? colCheck.rows[0].data_type : null;

        // Check total rows
        const total = await client.query('SELECT COUNT(*) as total FROM coverage_sites');
        result.totalRows = parseInt(total.rows[0].total);

        // Check rows with polygon_data
        const withPolygon = await client.query('SELECT COUNT(*) as count FROM coverage_sites WHERE polygon_data IS NOT NULL');
        result.rowsWithPolygon = parseInt(withPolygon.rows[0].count);

        // Check sample data
        const sample = await client.query(`
            SELECT id, site_id, locality, 
                   polygon_data IS NOT NULL as has_polygon
            FROM coverage_sites 
            ORDER BY id DESC
            LIMIT 10
        `);
        result.sampleData = sample.rows;

        // Check if there's any non-null polygon data
        const polygonExample = await client.query(`
            SELECT id, site_id, polygon_data
            FROM coverage_sites 
            WHERE polygon_data IS NOT NULL
            LIMIT 1
        `);

        if (polygonExample.rows.length > 0) {
            result.hasPolygonExample = true;
            const data = polygonExample.rows[0].polygon_data;
            result.polygonDataType = typeof data;
            result.polygonDataPreview = JSON.stringify(data).substring(0, 300);
            result.polygonDataLength = Array.isArray(data) ? data.length : 'not array';
        } else {
            result.hasPolygonExample = false;
        }

        // Write to file
        fs.writeFileSync(join(__dirname, 'debug-result.json'), JSON.stringify(result, null, 2));

    } catch (error) {
        result.error = error.message;
        fs.writeFileSync(join(__dirname, 'debug-result.json'), JSON.stringify(result, null, 2));
    } finally {
        client.release();
        await pool.end();
    }
}

debugPolygonData();
