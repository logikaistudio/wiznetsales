import db from './server/db.js';

async function setupTickets() {
    try {
        console.log('Setting up tickets table...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id SERIAL PRIMARY KEY,
                ticket_number VARCHAR(50) UNIQUE NOT NULL,
                customer_id INTEGER,
                customer_name VARCHAR(100),
                category VARCHAR(50), -- Gangguan, Billing, Request, Information, Other
                description TEXT,
                source VARCHAR(20) DEFAULT 'WhatsApp',
                priority VARCHAR(20) DEFAULT 'Medium', -- Low, Medium, High, Critical
                status VARCHAR(20) DEFAULT 'Open', -- Open, In Progress, Solved, Closed
                assigned_to INTEGER, -- ID of CS/Helpdesk from person_in_charge
                assigned_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                solved_at TIMESTAMP
            );
        `);

        // Index for faster search
        await db.query(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_id)`);

        console.log('Tickets table created successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error setting up tickets:', err);
        process.exit(1);
    }
}

setupTickets();
