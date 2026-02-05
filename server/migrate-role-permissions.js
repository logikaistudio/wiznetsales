import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;

dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrateRolePermissions() {
    try {
        await client.connect();
        console.log('Connected to database');

        // Drop and recreate roles table with new structure
        await client.query(`
      DROP TABLE IF EXISTS roles CASCADE;
    `);

        await client.query(`
      CREATE TABLE roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        permissions JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        console.log('Roles table created with new structure');

        // Define menu permissions structure - MATCHING SIDEBAR EXACTLY
        const menus = [
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'achievement', label: 'Achievement' },
            { key: 'prospect_subscriber', label: 'Prospect Subscriber' },
            { key: 'coverage', label: 'Coverage' },
            { key: 'omniflow', label: 'Omniflow' },
            { key: 'person_incharge', label: 'Person Incharge' },
            { key: 'targets', label: 'Targets' },
            { key: 'coverage_management', label: 'Coverage Management' },
            { key: 'product_management', label: 'Product Management' },
            { key: 'promo', label: 'Promo' },
            { key: 'hot_news', label: 'Hot News' },
            { key: 'user_management', label: 'User Management' }
        ];

        const menuKeys = menus.map(m => m.key);

        // Helper function to create permissions object
        function createPermissions(allowedMenus, customPermissions = {}) {
            const permissions = {};

            menuKeys.forEach(menu => {
                if (allowedMenus.includes(menu)) {
                    permissions[menu] = customPermissions[menu] || {
                        view: true,
                        create: true,
                        edit: true,
                        delete: true,
                        import: true,
                        export: true
                    };
                } else {
                    permissions[menu] = {
                        view: false,
                        create: false,
                        edit: false,
                        delete: false,
                        import: false,
                        export: false
                    };
                }
            });

            return permissions;
        }

        // Seed default roles with permissions
        const roles = [
            {
                name: 'admin',
                description: 'Full system access with all permissions',
                permissions: createPermissions(menuKeys) // All menus, all actions
            },
            {
                name: 'leader',
                description: 'Team leader with management access',
                permissions: createPermissions([
                    'dashboard',
                    'achievement',
                    'prospect_subscriber',
                    'coverage',
                    'omniflow',
                    'person_incharge',
                    'targets',
                    'coverage_management',
                    'product_management',
                    'promo',
                    'hot_news'
                ])
            },
            {
                name: 'manager',
                description: 'Manager with limited management access',
                permissions: createPermissions([
                    'dashboard',
                    'achievement',
                    'prospect_subscriber',
                    'coverage',
                    'omniflow',
                    'person_incharge',
                    'targets',
                    'product_management',
                    'promo',
                    'hot_news'
                ], {
                    person_incharge: { view: true, create: true, edit: true, delete: false, import: true, export: true },
                    targets: { view: true, create: true, edit: true, delete: false, import: true, export: true }
                })
            },
            {
                name: 'sales',
                description: 'Sales staff with basic access',
                permissions: createPermissions([
                    'dashboard',
                    'achievement',
                    'prospect_subscriber',
                    'coverage'
                ], {
                    dashboard: { view: true, create: false, edit: false, delete: false, import: false, export: true },
                    achievement: { view: true, create: false, edit: false, delete: false, import: false, export: true },
                    prospect_subscriber: { view: true, create: true, edit: true, delete: false, import: false, export: true },
                    coverage: { view: true, create: false, edit: false, delete: false, import: false, export: false }
                })
            },
            {
                name: 'user',
                description: 'Basic user with view-only access',
                permissions: createPermissions([
                    'dashboard',
                    'achievement'
                ], {
                    dashboard: { view: true, create: false, edit: false, delete: false, import: false, export: false },
                    achievement: { view: true, create: false, edit: false, delete: false, import: false, export: false }
                })
            }
        ];

        for (const role of roles) {
            await client.query(
                `INSERT INTO roles (name, description, permissions, is_active) 
         VALUES ($1, $2, $3, true)`,
                [role.name, role.description, JSON.stringify(role.permissions)]
            );
            console.log(`✓ Seeded role: ${role.name}`);
        }

        console.log('\n✅ Role permissions migration completed successfully!');
        console.log('\n📋 Menu Structure (matching Sidebar):');
        menus.forEach((menu, idx) => {
            console.log(`   ${idx + 1}. ${menu.label} (${menu.key})`);
        });
        console.log('\n🔐 Permission Actions:');
        console.log('   - view, create, edit, delete, import, export');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await client.end();
    }
}

migrateRolePermissions();
