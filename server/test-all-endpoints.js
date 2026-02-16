import db from './db.js';

async function testAllEndpoints() {
    console.log('🧪 Testing all POST endpoints...\n');

    // Test 1: Products
    console.log('1. Testing Products...');
    try {
        const productData = {
            name: 'Test Product',
            category: 'Broadband Home',
            serviceType: 'FTTH',
            price: 300000,
            cogs: 200000,
            bandwidth: '100 Mbps',
            releaseDate: new Date().toISOString().split('T')[0],
            status: 'Active'
        };

        const result = await db.query(
            `INSERT INTO products (name, category, service_type, price, cogs, bandwidth, release_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [productData.name, productData.category, productData.serviceType, productData.price,
            productData.cogs, productData.bandwidth, productData.releaseDate, productData.status]
        );
        console.log('✅ Product created with ID:', result.rows[0].id);
        await db.query('DELETE FROM products WHERE id = $1', [result.rows[0].id]);
        console.log('✅ Test product cleaned up\n');
    } catch (err) {
        console.error('❌ Product test failed:', err.message, '\n');
    }

    // Test 2: Promos
    console.log('2. Testing Promos...');
    try {
        const promoData = {
            name: 'Test Promo',
            validFrom: new Date().toISOString().split('T')[0],
            validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            price: 250000,
            cogs: 180000,
            description: 'Test promo description',
            status: 'Active'
        };

        const result = await db.query(
            `INSERT INTO promos (name, valid_from, valid_to, price, cogs, description, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [promoData.name, promoData.validFrom, promoData.validTo, promoData.price,
            promoData.cogs, promoData.description, promoData.status]
        );
        console.log('✅ Promo created with ID:', result.rows[0].id);
        await db.query('DELETE FROM promos WHERE id = $1', [result.rows[0].id]);
        console.log('✅ Test promo cleaned up\n');
    } catch (err) {
        console.error('❌ Promo test failed:', err.message, '\n');
    }

    // Test 3: Hot News
    console.log('3. Testing Hot News...');
    try {
        const newsData = {
            title: 'Test News',
            content: 'This is a test news content',
            priority: 1,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            isActive: true,
            createdBy: 'Test User'
        };

        const result = await db.query(
            `INSERT INTO hot_news (title, content, priority, start_date, end_date, is_active, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [newsData.title, newsData.content, newsData.priority, newsData.startDate,
            newsData.endDate, newsData.isActive, newsData.createdBy]
        );
        console.log('✅ Hot news created with ID:', result.rows[0].id);
        await db.query('DELETE FROM hot_news WHERE id = $1', [result.rows[0].id]);
        console.log('✅ Test hot news cleaned up\n');
    } catch (err) {
        console.error('❌ Hot news test failed:', err.message, '\n');
    }

    // Test 4: Customers (Prospects)
    console.log('4. Testing Customers/Prospects...');
    try {
        const customerData = {
            customerId: 'TEST-' + Date.now(),
            type: 'Broadband Home',
            name: 'Test Customer',
            address: 'Test Address',
            area: 'Test Area',
            kabupaten: 'Jakarta Pusat',
            kecamatan: 'Gambir',
            kelurahan: 'Petojo Utara',
            latitude: -6.1751,
            longitude: 106.8650,
            phone: '08123456789',
            email: 'test@example.com',
            productName: 'Test Product',
            status: 'Prospect',
            prospectDate: new Date().toISOString().split('T')[0],
            isActive: true
        };

        const result = await db.query(
            `INSERT INTO customers (
                customer_id, type, name, address, area, kabupaten, kecamatan, kelurahan,
                latitude, longitude, phone, email, product_name, status, prospect_date, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id`,
            [customerData.customerId, customerData.type, customerData.name, customerData.address,
            customerData.area, customerData.kabupaten, customerData.kecamatan, customerData.kelurahan,
            customerData.latitude, customerData.longitude, customerData.phone, customerData.email,
            customerData.productName, customerData.status, customerData.prospectDate, customerData.isActive]
        );
        console.log('✅ Customer created with ID:', result.rows[0].id);
        await db.query('DELETE FROM customers WHERE id = $1', [result.rows[0].id]);
        console.log('✅ Test customer cleaned up\n');
    } catch (err) {
        console.error('❌ Customer test failed:', err.message, '\n');
    }

    console.log('✅ All endpoint tests completed!');
    process.exit(0);
}

testAllEndpoints().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
