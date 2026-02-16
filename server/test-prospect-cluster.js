import db from './db.js';

async function testProspectWithCluster() {
    try {
        console.log('🧪 Testing Prospect insert with cluster data...\n');

        // 1. Get clusters
        const clustersRes = await db.query('SELECT * FROM target_clusters LIMIT 1');
        if (clustersRes.rows.length === 0) {
            console.log('⚠️  No clusters found. Creating a test cluster first...');

            const clusterRes = await db.query(
                'INSERT INTO target_clusters (name, total_target) VALUES ($1, $2) RETURNING id',
                ['Test Cluster', 100]
            );
            const clusterId = clusterRes.rows[0].id;

            await db.query(
                `INSERT INTO target_cities (cluster_id, city_name, province, homepass, percentage, target)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [clusterId, 'Jakarta Pusat', 'DKI Jakarta', 1000, 10, 100]
            );

            console.log('✅ Test cluster created\n');
        }

        // 2. Get cluster data
        const clusters = await db.query('SELECT * FROM target_clusters ORDER BY name ASC LIMIT 1');
        const cluster = clusters.rows[0];

        const cities = await db.query('SELECT * FROM target_cities WHERE cluster_id = $1 LIMIT 1', [cluster.id]);
        const city = cities.rows[0];

        console.log('Using cluster:', cluster.name);
        console.log('Using city:', city.city_name);

        // 3. Create prospect with cluster data
        const prospectData = {
            customerId: 'TEST-PROSPECT-' + Date.now(),
            type: 'Broadband Home',
            name: 'Test Customer with Cluster',
            address: 'Test Address',
            area: cluster.name,  // This is the cluster name
            kabupaten: city.city_name,  // This is the city name
            kecamatan: 'Test Kecamatan',
            kelurahan: 'Test Kelurahan',
            latitude: -6.1751,
            longitude: 106.8650,
            phone: '08123456789',
            email: 'test@example.com',
            productName: 'Test Product',
            status: 'Prospect',
            prospectDate: new Date().toISOString().split('T')[0],
            isActive: true
        };

        console.log('\nInserting prospect with data:');
        console.log(JSON.stringify(prospectData, null, 2));

        const result = await db.query(
            `INSERT INTO customers (
                customer_id, type, name, address, area, kabupaten, kecamatan, kelurahan,
                latitude, longitude, phone, email, product_name, status, prospect_date, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id`,
            [prospectData.customerId, prospectData.type, prospectData.name, prospectData.address,
            prospectData.area, prospectData.kabupaten, prospectData.kecamatan, prospectData.kelurahan,
            prospectData.latitude, prospectData.longitude, prospectData.phone, prospectData.email,
            prospectData.productName, prospectData.status, prospectData.prospectDate, prospectData.isActive]
        );

        console.log('\n✅ Prospect created with ID:', result.rows[0].id);

        // Cleanup
        await db.query('DELETE FROM customers WHERE id = $1', [result.rows[0].id]);
        console.log('✅ Test prospect cleaned up');

        console.log('\n✅ Test passed! Prospect with cluster data can be inserted successfully.');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Test failed:', err.message);
        console.error('Stack:', err.stack);
        process.exit(1);
    }
}

testProspectWithCluster();
