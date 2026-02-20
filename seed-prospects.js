import db from './server/db.js';

const seedDummyProspects = async () => {
    try {
        console.log('Seeding dummy prospects...');

        const dummyData = [
            {
                customer_id: 'PR-001',
                name: 'Budi Santoso',
                address: 'Jl. Merdeka No. 123, Jakarta',
                phone: '081234567890',
                status: 'Prospect',
                prospect_status: 'Covered',
                catatan: 'Customer sudah dihubungi, tertarik paket 50Mbps.',
                latitude: -6.2088,
                longitude: 106.8456
            },
            {
                customer_id: 'PR-002',
                name: 'Siti Aminah',
                address: 'Jl. Mawar No. 45, Jakarta',
                phone: '081298765432',
                status: 'Prospect',
                prospect_status: 'Covered',
                catatan: 'Area tercover FAT terdekat.',
                latitude: -6.2100,
                longitude: 106.8500
            },
            {
                customer_id: 'PR-003',
                name: 'Agus Salim',
                address: 'Jl. Melati No. 12, Jakarta',
                phone: '085678901234',
                status: 'Prospect',
                prospect_status: 'Case Activation',
                catatan: 'Butuh penarikan kabel lebih dari 200m.',
                latitude: -6.1900,
                longitude: 106.8400
            },
            {
                customer_id: 'PR-004',
                name: 'Dewi Sartika',
                address: 'Jl. Kenanga No. 8, Jakarta',
                phone: '081345678901',
                status: 'Prospect',
                prospect_status: 'Case Activation',
                catatan: 'Tunggu konfirmasi tim teknis untuk area blank spot.',
                latitude: -6.2200,
                longitude: 106.8600
            }
        ];

        for (const item of dummyData) {
            await db.query(`
                INSERT INTO customers (
                    customer_id, name, address, phone, status, prospect_status, catatan, latitude, longitude, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
                ON CONFLICT (customer_id) DO NOTHING
            `, [
                item.customer_id, item.name, item.address, item.phone, item.status, item.prospect_status, item.catatan, item.latitude, item.longitude
            ]);
        }

        console.log('Seed completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err);
        process.exit(1);
    }
};

seedDummyProspects();
