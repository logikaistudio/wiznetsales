import db from './server/db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

async function checkData() {
    try {
        console.log('🔍 Checking database data...\n');

        // Check products
        const products = await db.query('SELECT COUNT(*) FROM products');
        console.log(`📦 Products: ${products.rows[0].count} records`);

        // Check person_in_charge
        const persons = await db.query('SELECT COUNT(*) FROM person_in_charge');
        console.log(`👥 Person In Charge: ${persons.rows[0].count} records`);

        // Check promos
        const promos = await db.query('SELECT COUNT(*) FROM promos');
        console.log(`🎁 Promos: ${promos.rows[0].count} records`);

        // Check target_clusters
        const clusters = await db.query('SELECT COUNT(*) FROM target_clusters');
        console.log(`🎯 Target Clusters: ${clusters.rows[0].count} records`);

        // Check target_cities
        const cities = await db.query('SELECT COUNT(*) FROM target_cities');
        console.log(`🏙️  Target Cities: ${cities.rows[0].count} records`);

        // Check customers
        const customers = await db.query('SELECT COUNT(*) FROM customers');
        console.log(`👤 Customers: ${customers.rows[0].count} records`);

        // Check coverage_sites
        const coverage = await db.query('SELECT COUNT(*) FROM coverage_sites');
        console.log(`📡 Coverage Sites: ${coverage.rows[0].count} records`);

        console.log('\n✅ Data check complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

checkData();
