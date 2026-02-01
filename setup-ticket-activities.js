import db from './server/db.js';

async function setupTicketActivities() {
    try {
        console.log('Setting up ticket_activities table...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS ticket_activities (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                activity_type VARCHAR(20) DEFAULT 'note', -- note, status_change, wa_chat
                content TEXT,
                created_by VARCHAR(100), -- User Name
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Index for faster retrieval
        await db.query(`CREATE INDEX IF NOT EXISTS idx_activities_ticket ON ticket_activities(ticket_id)`);

        console.log('Ticket Activities table created successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error setting up ticket activities:', err);
        process.exit(1);
    }
}

setupTicketActivities();
