import db from './server/db.js';

async function setupSettings() {
    try {
        console.log('Setting up app_settings table...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS app_settings (
                key VARCHAR(50) PRIMARY KEY,
                value TEXT,
                description TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Insert default WA settings if not exist
        const defaults = [
            { key: 'wa_api_url', value: '', desc: 'WhatsApp API Endpoint URL' },
            { key: 'wa_api_token', value: '', desc: 'WhatsApp API Token / Key' },
            { key: 'wa_device_id', value: '', desc: 'Device ID / Sender Number' }
        ];

        for (const def of defaults) {
            await db.query(`
                INSERT INTO app_settings (key, value, description)
                VALUES ($1, $2, $3)
                ON CONFLICT (key) DO NOTHING
            `, [def.key, def.value, def.desc]);
        }

        console.log('Settings table created successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error setting up settings:', err);
        process.exit(1);
    }
}

setupSettings();
