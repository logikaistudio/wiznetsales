import db from './server/db.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

async function fixAdminUser() {
    console.log('🔧 Fixing admin user...\n');

    try {
        // Hash password 'admin123' dengan SHA256
        const passwordHash = crypto.createHash('sha256').update('admin123').digest('hex');

        console.log('📝 Updating admin user with correct password hash...');

        // Delete existing admin user
        await db.query(`DELETE FROM users WHERE username = 'admin'`);

        // Insert admin user with correct hash
        await db.query(`
            INSERT INTO users (username, email, password_hash, full_name, role, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, ['admin', 'admin@netsales.com', passwordHash, 'Administrator', 'admin', true]);

        console.log('✅ Admin user updated successfully!');
        console.log('\nLogin credentials:');
        console.log('  Username: admin');
        console.log('  Password: admin123');
        console.log(`  Password Hash: ${passwordHash}\n`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

fixAdminUser();
