
import db from './server/db.js';

const run = async () => {
    try {
        await db.query("ALTER TABLE hot_news ADD COLUMN IF NOT EXISTS dashboard_order INTEGER DEFAULT 1");
        console.log("Column dashboard_order added (if not exists)");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
run();

