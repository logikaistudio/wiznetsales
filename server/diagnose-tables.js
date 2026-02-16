import db from './db.js';

async function diagnoseTables() {
    try {
        console.log('🔍 Diagnosing database tables...\n');

        // Check target_clusters table
        console.log('1. Checking target_clusters table...');
        try {
            const clustersCheck = await db.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'target_clusters'
                ORDER BY ordinal_position
            `);
            if (clustersCheck.rows.length > 0) {
                console.log('✅ target_clusters table exists with columns:');
                clustersCheck.rows.forEach(col => {
                    console.log(`   - ${col.column_name} (${col.data_type})`);
                });
            } else {
                console.log('❌ target_clusters table does NOT exist');
            }
        } catch (err) {
            console.log('❌ Error checking target_clusters:', err.message);
        }

        // Check target_cities table
        console.log('\n2. Checking target_cities table...');
        try {
            const citiesCheck = await db.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'target_cities'
                ORDER BY ordinal_position
            `);
            if (citiesCheck.rows.length > 0) {
                console.log('✅ target_cities table exists with columns:');
                citiesCheck.rows.forEach(col => {
                    console.log(`   - ${col.column_name} (${col.data_type})`);
                });
            } else {
                console.log('❌ target_cities table does NOT exist');
            }
        } catch (err) {
            console.log('❌ Error checking target_cities:', err.message);
        }

        // Check products table
        console.log('\n3. Checking products table...');
        try {
            const productsCheck = await db.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'products'
                ORDER BY ordinal_position
            `);
            if (productsCheck.rows.length > 0) {
                console.log('✅ products table exists with columns:');
                productsCheck.rows.forEach(col => {
                    console.log(`   - ${col.column_name} (${col.data_type})`);
                });
            } else {
                console.log('❌ products table does NOT exist');
            }
        } catch (err) {
            console.log('❌ Error checking products:', err.message);
        }

        // Check promos table
        console.log('\n4. Checking promos table...');
        try {
            const promosCheck = await db.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'promos'
                ORDER BY ordinal_position
            `);
            if (promosCheck.rows.length > 0) {
                console.log('✅ promos table exists with columns:');
                promosCheck.rows.forEach(col => {
                    console.log(`   - ${col.column_name} (${col.data_type})`);
                });
            } else {
                console.log('❌ promos table does NOT exist');
            }
        } catch (err) {
            console.log('❌ Error checking promos:', err.message);
        }

        // Check hot_news table
        console.log('\n5. Checking hot_news table...');
        try {
            const hotNewsCheck = await db.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'hot_news'
                ORDER BY ordinal_position
            `);
            if (hotNewsCheck.rows.length > 0) {
                console.log('✅ hot_news table exists with columns:');
                hotNewsCheck.rows.forEach(col => {
                    console.log(`   - ${col.column_name} (${col.data_type})`);
                });
            } else {
                console.log('❌ hot_news table does NOT exist');
            }
        } catch (err) {
            console.log('❌ Error checking hot_news:', err.message);
        }

        // Check customers table
        console.log('\n6. Checking customers table...');
        try {
            const customersCheck = await db.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'customers'
                ORDER BY ordinal_position
            `);
            if (customersCheck.rows.length > 0) {
                console.log('✅ customers table exists with columns:');
                customersCheck.rows.forEach(col => {
                    console.log(`   - ${col.column_name} (${col.data_type})`);
                });
            } else {
                console.log('❌ customers table does NOT exist');
            }
        } catch (err) {
            console.log('❌ Error checking customers:', err.message);
        }

        console.log('\n✅ Diagnosis complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Fatal error during diagnosis:', err);
        process.exit(1);
    }
}

diagnoseTables();
