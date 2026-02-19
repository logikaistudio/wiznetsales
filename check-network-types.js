
import db from './server/db.js';

const run = async () => {
    try {
        const res = await db.query("SELECT id, network_type FROM coverage_sites LIMIT 20");
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
run();

