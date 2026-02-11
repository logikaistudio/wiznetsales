import db from './server/db.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

async function createSuperAdmin() {
    console.log('🔧 Creating superadmin user...\n');

    try {
        // Hash password 'p3h03lw4hyud1' dengan SHA256
        const passwordHash = crypto.createHash('sha256').update('p3h03lw4hyud1').digest('hex');

        console.log('📝 Creating superadmin user...');

        // Check if superadmin already exists
        const existing = await db.query(`SELECT * FROM users WHERE username = 'superadmin'`);

        if (existing.rows.length > 0) {
            console.log('⚠️  Superadmin already exists, updating...');
            await db.query(`
                UPDATE users 
                SET password_hash = $1, role = 'super_admin', is_active = true
                WHERE username = 'superadmin'
            `, [passwordHash]);
        } else {
            // Insert superadmin user
            await db.query(`
                INSERT INTO users (username, email, password_hash, full_name, role, is_active)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, ['superadmin', 'superadmin@netsales.com', passwordHash, 'Super Administrator', 'super_admin', true]);
        }

        console.log('✅ Superadmin user created successfully!');
        console.log('\nSuperadmin Login credentials:');
        console.log('  Username: superadmin');
        console.log('  Password: p3h03lw4hyud1');
        console.log('  Role: super_admin');
        console.log(`  Password Hash: ${passwordHash}\n`);

        console.log('📋 Current users in database:');
        const users = await db.query(`SELECT username, email, role, is_active FROM users ORDER BY id`);
        console.table(users.rows);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

createSuperAdmin();
