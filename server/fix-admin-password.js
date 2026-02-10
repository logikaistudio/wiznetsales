/**
 * Fix Admin Password Script
 * Fixes the admin user password hash in the database
 * Password: password123
 */
import db from './db.js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function fixAdminPassword() {
    console.log('🔧 Fixing admin password...\n');

    try {
        const passwordHash = crypto.createHash('sha256').update('password123').digest('hex');
        console.log('Generated SHA256 hash for "password123":', passwordHash);

        // Update admin password hash
        const result = await db.query(
            `UPDATE users SET password_hash = $1 WHERE username = 'admin' RETURNING id, username, email, full_name, role`,
            [passwordHash]
        );

        if (result.rows.length > 0) {
            console.log('\n✅ Admin password updated successfully!');
            console.log('User:', result.rows[0]);
            console.log('\nLogin credentials:');
            console.log('  Username: admin');
            console.log('  Password: password123');
        } else {
            console.log('\n⚠️ Admin user not found, creating...');
            const createResult = await db.query(
                `INSERT INTO users (username, email, password_hash, full_name, role, is_active) 
                 VALUES ('admin', 'admin@netsales.com', $1, 'Administrator', 'Admin', true)
                 RETURNING id, username`,
                [passwordHash]
            );
            console.log('✅ Admin user created:', createResult.rows[0]);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

fixAdminPassword();
