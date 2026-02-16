import db from './db.js';

async function testTargetInsert() {
    const client = await db.pool.connect();
    try {
        console.log('🧪 Testing target insert...\n');

        await client.query('BEGIN');

        // Test data
        const testData = {
            name: 'Test Cluster',
            cities: [
                {
                    name: 'Jakarta Pusat',
                    province: 'DKI Jakarta',
                    homepass: 1000,
                    percentage: 10.5,
                    target: 100
                }
            ]
        };

        console.log('Test data:', JSON.stringify(testData, null, 2));

        // 1. Create Cluster
        const totalTarget = testData.cities.reduce((sum, c) => sum + (parseInt(c.target) || 0), 0);
        console.log('\n1. Inserting cluster with total_target:', totalTarget);

        const clusterRes = await client.query(
            'INSERT INTO target_clusters (name, total_target) VALUES ($1, $2) RETURNING id',
            [testData.name, totalTarget]
        );
        const clusterId = clusterRes.rows[0].id;
        console.log('✅ Cluster created with ID:', clusterId);

        // 2. Create Cities
        if (testData.cities && testData.cities.length > 0) {
            console.log('\n2. Inserting cities...');
            for (const city of testData.cities) {
                console.log(`   Inserting city: ${city.name}, ${city.province}`);
                await client.query(
                    `INSERT INTO target_cities (cluster_id, city_name, province, homepass, percentage, target)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [clusterId, city.name, city.province, city.homepass, city.percentage, city.target]
                );
                console.log('   ✅ City inserted');
            }
        }

        await client.query('COMMIT');
        console.log('\n✅ Transaction committed successfully!');

        // Verify
        console.log('\n3. Verifying data...');
        const verifyCluster = await db.query('SELECT * FROM target_clusters WHERE id = $1', [clusterId]);
        console.log('Cluster:', verifyCluster.rows[0]);

        const verifyCities = await db.query('SELECT * FROM target_cities WHERE cluster_id = $1', [clusterId]);
        console.log('Cities:', verifyCities.rows);

        // Cleanup
        console.log('\n4. Cleaning up test data...');
        await db.query('DELETE FROM target_clusters WHERE id = $1', [clusterId]);
        console.log('✅ Test data cleaned up');

        console.log('\n✅ All tests passed!');
        process.exit(0);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n❌ Test failed:', err.message);
        console.error('Stack:', err.stack);
        process.exit(1);
    } finally {
        client.release();
    }
}

testTargetInsert();
