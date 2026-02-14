import db from './db.js';

async function checkData() {
    try {
        console.log('Checking polygon data...');
        // Find a row with polygon data
        const res = await db.query("SELECT id, site_id, polygon_data FROM coverage_sites WHERE polygon_data IS NOT NULL AND polygon_data::text != 'null' LIMIT 1");

        if (res.rows.length === 0) {
            console.log('No polygon data found.');
        } else {
            const row = res.rows[0];
            console.log('Found ID:', row.id);
            console.log('Site ID:', row.site_id);
            console.log('Type of polygon_data:', typeof row.polygon_data);
            console.log('Value:', JSON.stringify(row.polygon_data, null, 2));

            if (typeof row.polygon_data === 'string') {
                try {
                    const parsed = JSON.parse(row.polygon_data);
                    console.log('Parsed type:', typeof parsed);
                    console.log('Is Array?', Array.isArray(parsed));
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        console.log('First point:', parsed[0]);
                        console.log('Is valid structure [[lat,lng]...]?');
                    }
                } catch (e) {
                    console.error('JSON parse error:', e.message);
                }
            } else if (Array.isArray(row.polygon_data)) {
                console.log('It is already an array.');
                console.log('Is Array?', Array.isArray(row.polygon_data));
                if (row.polygon_data.length > 0) {
                    console.log('First point:', row.polygon_data[0]);
                }
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkData();
