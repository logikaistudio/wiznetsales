
import db from './server/db.js';

const run = async () => {
    try {
        const res = await db.query("SELECT key, value FROM system_settings WHERE key IN ('ftthNodeColor', 'hfcNodeColor', 'ftthRadiusColor', 'hfcRadiusColor')");
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
run();

