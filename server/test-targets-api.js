import db from './db.js';

async function testTargetsAPI() {
    try {
        console.log('🧪 Testing /api/targets endpoint...\n');

        // Fetch all clusters
        const clustersRes = await db.query('SELECT * FROM target_clusters ORDER BY name ASC');
        const clusters = clustersRes.rows;

        console.log(`Found ${clusters.length} clusters`);

        // Fetch all cities for these clusters
        const citiesRes = await db.query('SELECT * FROM target_cities');
        const cities = citiesRes.rows;

        console.log(`Found ${cities.length} cities`);

        // Map cities to clusters
        const result = clusters.map(cluster => ({
            id: cluster.id,
            name: cluster.name,
            totalTarget: cluster.total_target,
            provinces: [...new Set(cities.filter(c => c.cluster_id === cluster.id).map(c => c.province))],
            cities: cities
                .filter(c => c.cluster_id === cluster.id)
                .map(c => ({
                    name: c.city_name,
                    province: c.province,
                    homepass: c.homepass,
                    percentage: parseFloat(c.percentage),
                    target: c.target
                }))
        }));

        console.log('\n📊 Result:');
        console.log(JSON.stringify(result, null, 2));

        if (result.length === 0) {
            console.log('\n⚠️  WARNING: No clusters found! This is why the dropdown is empty.');
            console.log('You need to add at least one cluster in the Targets page first.');
        } else {
            console.log(`\n✅ API would return ${result.length} clusters with cities`);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Test failed:', err.message);
        console.error('Stack:', err.stack);
        process.exit(1);
    }
}

testTargetsAPI();
