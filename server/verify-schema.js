import db from './db.js';

async function verify() {
    const criticalColumns = {
        'target_clusters': ['id', 'name', 'total_target'],
        'target_cities': ['id', 'cluster_id', 'city_name', 'province', 'homepass', 'percentage', 'target'],
        'products': ['id', 'name', 'category', 'service_type', 'price', 'cogs', 'bandwidth', 'release_date', 'status'],
        'promos': ['id', 'name', 'valid_from', 'valid_to', 'price', 'cogs', 'description', 'status'],
        'hot_news': ['id', 'title', 'content', 'priority', 'start_date', 'end_date', 'is_active', 'created_by'],
        'customers': ['id', 'customer_id', 'type', 'name', 'address', 'area', 'kabupaten', 'kecamatan', 'kelurahan',
            'latitude', 'longitude', 'phone', 'email', 'product_id', 'product_name', 'rfs_date',
            'files', 'sales_id', 'sales_name', 'status', 'prospect_date', 'is_active', 'fat', 'homepass_id', 'site_id'],
        'person_in_charge': ['id', 'name', 'role', 'employee_id', 'email', 'phone', 'area', 'position', 'status', 'active_date', 'inactive_date', 'profile_image'],
        'coverage_sites': ['id', 'network_type', 'site_id', 'homepass_id', 'ampli_lat', 'ampli_long', 'locality', 'polygon_data'],
        'tickets': ['id', 'ticket_number', 'customer_id', 'customer_name', 'category', 'description', 'assigned_to', 'assigned_name', 'source', 'priority', 'status', 'solved_at'],
        'ticket_activities': ['id', 'ticket_id', 'activity_type', 'content', 'created_by'],
        'users': ['id', 'username', 'email', 'password_hash', 'full_name', 'role', 'is_active', 'last_login'],
        'roles': ['id', 'name', 'description', 'permissions', 'allowed_clusters', 'allowed_provinces', 'data_scope', 'is_active'],
    };

    let allOk = true;

    for (const [table, expectedCols] of Object.entries(criticalColumns)) {
        try {
            const colRes = await db.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = $1
            `, [table]);

            const existingCols = colRes.rows.map(c => c.column_name);
            const missingCols = expectedCols.filter(c => !existingCols.includes(c));

            if (missingCols.length === 0) {
                console.log(`OK ${table} (${expectedCols.length} cols)`);
            } else {
                console.log(`FAIL ${table} - MISSING: ${missingCols.join(', ')}`);
                allOk = false;
            }
        } catch (e) {
            console.log(`FAIL ${table} - TABLE NOT FOUND`);
            allOk = false;
        }
    }

    console.log(allOk ? '\nALL OK' : '\nSOME ISSUES FOUND');
    process.exit(0);
}

verify();
