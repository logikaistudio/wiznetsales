import db from './server/db.js';

const migrate = async () => {
    try {
        console.log('Running migrations...');

        // Ensure columns exist
        await db.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='catatan')
                THEN ALTER TABLE customers ADD COLUMN catatan TEXT;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='prospect_status')
                THEN ALTER TABLE customers ADD COLUMN prospect_status VARCHAR(50) DEFAULT 'Covered';
                END IF;
            END $$;
        `);

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
