import db from './db.js';

async function check() {
    const checks = [
        ['target_clusters', 'name'],
        ['target_cities', 'target'],
        ['hot_news', 'priority'],
        ['customers', 'customer_id'],
        ['coverage_sites', 'network_type']
    ];

    console.log('Final verification of problematic columns:');
    let allOk = true;
    for (const [t, c] of checks) {
        const r = await db.query(
            "SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2",
            [t, c]
        );
        if (r.rows.length > 0) {
            console.log(`✅ ${t}.${c} EXISTS`);
        } else {
            console.log(`❌ ${t}.${c} MISSING`);
            allOk = false;
        }
    }

    if (allOk) {
        console.log('\nSUCCESS: All critical columns verified in the database.');
    } else {
        console.log('\nFAILURE: Some columns are still missing.');
    }
    process.exit(0);
}

check();
