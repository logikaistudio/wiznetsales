import db from './db.js';

const tables = [
    'target_clusters', 'target_cities', 'products', 'promos', 'hot_news',
    'customers', 'person_in_charge', 'coverage_sites', 'tickets',
    'ticket_activities', 'users', 'roles', 'system_settings', 'clusters', 'provinces'
];

async function main() {
    console.log('=== DATABASE SCHEMA DIAGNOSIS ===\n');

    for (const t of tables) {
        try {
            const r = await db.query(
                "SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position",
                [t]
            );
            if (r.rows.length === 0) {
                console.log(`❌ ${t} - TABLE DOES NOT EXIST`);
            } else {
                console.log(`✅ ${t} (${r.rows.length} cols): ${r.rows.map(c => c.column_name).join(', ')}`);
            }
        } catch (e) {
            console.log(`❌ ${t} - ERROR: ${e.message}`);
        }
    }

    // Also check specific columns that are causing 500 errors
    console.log('\n=== CRITICAL COLUMN CHECKS ===\n');
    const checks = [
        ['target_clusters', 'name'],
        ['target_clusters', 'total_target'],
        ['target_cities', 'target'],
        ['target_cities', 'cluster_id'],
        ['target_cities', 'city_name'],
        ['target_cities', 'province'],
        ['target_cities', 'homepass'],
        ['target_cities', 'percentage'],
        ['hot_news', 'priority'],
        ['hot_news', 'start_date'],
        ['hot_news', 'end_date'],
        ['hot_news', 'is_active'],
        ['hot_news', 'created_by'],
        ['customers', 'customer_id'],
        ['customers', 'type'],
        ['customers', 'is_active'],
        ['products', 'cogs'],
        ['products', 'bandwidth'],
        ['products', 'release_date'],
        ['promos', 'valid_from'],
        ['promos', 'valid_to'],
        ['promos', 'cogs'],
        ['coverage_sites', 'ampli_lat'],
        ['coverage_sites', 'ampli_long'],
        ['coverage_sites', 'network_type'],
    ];

    for (const [table, col] of checks) {
        try {
            const r = await db.query(
                "SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2",
                [table, col]
            );
            if (r.rows.length === 0) {
                console.log(`❌ ${table}.${col} - MISSING!`);
            } else {
                console.log(`✅ ${table}.${col} - OK`);
            }
        } catch (e) {
            console.log(`❌ ${table}.${col} - ERROR: ${e.message}`);
        }
    }

    process.exit(0);
}

main();
