import express from 'express';
import cors from 'cors';
import db from './db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.json({ status: 'ok', time: result.rows[0].now, db: 'connected' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database connection failed', details: err.message });
    }
});

// Setup Schema Route - IMPROVED for Vercel fixes
app.get('/api/setup-schema', async (req, res) => {
    try {
        console.log('Starting manual schema setup via API...');

        // 1. Target Cities Fix
        await db.query(`
            CREATE TABLE IF NOT EXISTS target_clusters (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                total_target INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS target_cities (
                id SERIAL PRIMARY KEY,
                cluster_id INTEGER REFERENCES target_clusters(id) ON DELETE CASCADE,
                city_name VARCHAR(100),
                province VARCHAR(100),
                homepass INTEGER DEFAULT 0,
                percentage DECIMAL(5,2) DEFAULT 0,
                target INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
            DO $$ BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='target_cities' AND column_name='target') THEN
                    ALTER TABLE target_cities ADD COLUMN target INTEGER DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='target_clusters' AND column_name='total_target') THEN
                    ALTER TABLE target_clusters ADD COLUMN total_target INTEGER DEFAULT 0;
                END IF;
            END $$;
        `);

        // 2. Hot News Fix
        await db.query(`
            CREATE TABLE IF NOT EXISTS hot_news (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255),
                content TEXT,
                priority INTEGER DEFAULT 1,
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                created_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW()
            );
            DO $$ BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hot_news' AND column_name='priority') THEN
                    ALTER TABLE hot_news ADD COLUMN priority INTEGER DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hot_news' AND column_name='start_date') THEN
                    ALTER TABLE hot_news ADD COLUMN start_date TIMESTAMP DEFAULT NOW();
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hot_news' AND column_name='end_date') THEN
                    ALTER TABLE hot_news ADD COLUMN end_date TIMESTAMP DEFAULT (NOW() + interval '30 days');
                END IF;
            END $$;
        `);

        // 3. Person In Charge Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS person_in_charge (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                role VARCHAR(100),
                employee_id VARCHAR(50),
                email VARCHAR(255),
                phone VARCHAR(50),
                area VARCHAR(100),
                position VARCHAR(100),
                status VARCHAR(50) DEFAULT 'Active',
                active_date DATE,
                inactive_date DATE,
                profile_image TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // 4. Promos Fix
        await db.query(`
            CREATE TABLE IF NOT EXISTS promos (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                valid_from DATE,
                valid_to DATE,
                price DECIMAL(12,2),
                cogs DECIMAL(12,2),
                description TEXT,
                status VARCHAR(50) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT NOW()
            );
            DO $$ BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='promos' AND column_name='valid_from') THEN
                    ALTER TABLE promos ADD COLUMN valid_from DATE DEFAULT NOW();
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='promos' AND column_name='valid_to') THEN
                    ALTER TABLE promos ADD COLUMN valid_to DATE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='promos' AND column_name='price') THEN
                    ALTER TABLE promos ADD COLUMN price DECIMAL(12,2) DEFAULT 0;
                END IF;
                 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='promos' AND column_name='cogs') THEN
                    ALTER TABLE promos ADD COLUMN cogs DECIMAL(12,2) DEFAULT 0;
                END IF;
                 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='promos' AND column_name='status') THEN
                    ALTER TABLE promos ADD COLUMN status VARCHAR(50) DEFAULT 'Active';
                END IF;
            END $$;
        `);

        // 5. Products Fix
        await db.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                category VARCHAR(100),
                service_type VARCHAR(50),
                price DECIMAL(12,2),
                cogs DECIMAL(12,2),
                bandwidth VARCHAR(50),
                release_date DATE,
                status VARCHAR(50) DEFAULT 'Active',
                 created_at TIMESTAMP DEFAULT NOW()
            );
            DO $$ BEGIN 
                 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='cogs') THEN
                    ALTER TABLE products ADD COLUMN cogs DECIMAL(12,2) DEFAULT 0;
                END IF;
                 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='bandwidth') THEN
                    ALTER TABLE products ADD COLUMN bandwidth VARCHAR(50);
                END IF;
                 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='release_date') THEN
                    ALTER TABLE products ADD COLUMN release_date DATE DEFAULT NOW();
                END IF;
                 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='status') THEN
                    ALTER TABLE products ADD COLUMN status VARCHAR(50) DEFAULT 'Active';
                END IF;
            END $$;
        `);

        // 6. Customers Fix
        await db.query(`
             DO $$ BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='is_active') THEN
                    ALTER TABLE customers ADD COLUMN is_active BOOLEAN DEFAULT true;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='fat') THEN
                    ALTER TABLE customers ADD COLUMN fat VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='homepass_id') THEN
                    ALTER TABLE customers ADD COLUMN homepass_id VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='prospect_date') THEN
                    ALTER TABLE customers ADD COLUMN prospect_date DATE DEFAULT NOW();
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='product_name') THEN
                    ALTER TABLE customers ADD COLUMN product_name VARCHAR(255);
                END IF;
                 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='type') THEN
                    ALTER TABLE customers ADD COLUMN type VARCHAR(50);
                END IF;
                  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='sales_id') THEN
                    ALTER TABLE customers ADD COLUMN sales_id INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='sales_name') THEN
                    ALTER TABLE customers ADD COLUMN sales_name VARCHAR(100);
                END IF;
                 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='product_id') THEN
                    ALTER TABLE customers ADD COLUMN product_id INTEGER;
                END IF;
                  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='customer_id') THEN
                    ALTER TABLE customers ADD COLUMN customer_id VARCHAR(100) UNIQUE;
                END IF;
                   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='area') THEN
                    ALTER TABLE customers ADD COLUMN area VARCHAR(100);
                END IF;
                  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='kabupaten') THEN
                    ALTER TABLE customers ADD COLUMN kabupaten VARCHAR(100);
                END IF;
                  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='kecamatan') THEN
                    ALTER TABLE customers ADD COLUMN kecamatan VARCHAR(100);
                END IF;
                  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='kelurahan') THEN
                    ALTER TABLE customers ADD COLUMN kelurahan VARCHAR(100);
                END IF;
                 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='files') THEN
                    ALTER TABLE customers ADD COLUMN files JSONB DEFAULT '[]';
                END IF;
                 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='rfs_date') THEN
                    ALTER TABLE customers ADD COLUMN rfs_date DATE;
                END IF;
            END $$;
        `);

        console.log('Schema setup completed successfully');
        res.json({ message: 'Schema setup completed successfully via API endpoint.' });
    } catch (err) {
        console.error('Schema setup failed:', err);
        res.status(500).json({ error: 'Schema setup failed', details: err.message });
    }
});

// Auto-migration for products service_type
const ensureServiceTypeColumn = async () => {
    try {
        await db.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='products' AND column_name='service_type') THEN
                    ALTER TABLE products ADD COLUMN service_type VARCHAR(50);
                END IF;
            END $$;
        `);
        console.log('Ensured products.service_type column exists');
    } catch (err) {
        console.error('Migration error:', err);
    }
};
ensureServiceTypeColumn();

// ==========================================
// ROLES MANAGEMENT
// ==========================================

// Auto-create roles table if not exists
const ensureRolesTable = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                permissions JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Insert default roles if empty
        const countResult = await db.query('SELECT COUNT(*) FROM roles');
        if (parseInt(countResult.rows[0].count) === 0) {
            await db.query(`
                INSERT INTO roles (name, description, permissions) VALUES
                ('Admin', 'Full system access', '["all"]'),
                ('Sales', 'Sales and prospect management', '["prospects", "customers", "coverage"]'),
                ('Manager', 'View reports and manage team', '["reports", "prospects", "customers"]')
                ON CONFLICT (name) DO NOTHING
            `);
            console.log('Default roles created');
        }
        console.log('Ensured roles table exists');
    } catch (err) {
        console.error('Roles table migration error:', err);
    }
};
ensureRolesTable();

app.get('/api/roles', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM roles ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching roles:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/roles', async (req, res) => {
    try {
        const { name, description, permissions, data_scope, allowed_clusters, allowed_provinces } = req.body;
        const result = await db.query(
            `INSERT INTO roles (
                name, description, permissions, data_scope, allowed_clusters, allowed_provinces
            ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
                name,
                description,
                JSON.stringify(permissions || []),
                data_scope || 'all',
                JSON.stringify(allowed_clusters || []),
                JSON.stringify(allowed_provinces || [])
            ]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/roles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, permissions, isActive, data_scope, allowed_clusters, allowed_provinces } = req.body;

        // Dynamic update query
        let query = 'UPDATE roles SET updated_at=NOW()';
        const values = [];
        let paramCount = 1;

        if (name) { query += `, name=$${paramCount++}`; values.push(name); }
        if (description !== undefined) { query += `, description=$${paramCount++}`; values.push(description); }
        if (permissions) { query += `, permissions=$${paramCount++}`; values.push(JSON.stringify(permissions)); }
        if (isActive !== undefined) { query += `, is_active=$${paramCount++}`; values.push(isActive); }
        if (data_scope) { query += `, data_scope=$${paramCount++}`; values.push(data_scope); }
        if (allowed_clusters) { query += `, allowed_clusters=$${paramCount++}`; values.push(JSON.stringify(allowed_clusters)); }
        if (allowed_provinces) { query += `, allowed_provinces=$${paramCount++}`; values.push(JSON.stringify(allowed_provinces)); }

        query += ` WHERE id=$${paramCount} RETURNING *`;
        values.push(id);

        const result = await db.query(query, values);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/clusters', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM clusters ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching clusters:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/provinces', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM provinces ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching provinces:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/roles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM roles WHERE id = $1', [id]);
        res.json({ message: 'Role deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// COVERAGE MANAGEMENT
// ==========================================

app.get('/api/coverage', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    try {
        let queryText = 'SELECT * FROM coverage_sites';
        let countQueryText = 'SELECT COUNT(*) FROM coverage_sites';
        let queryParams = [];

        if (search) {
            const searchClause = ` WHERE 
        site_id ILIKE $1 OR 
        locality ILIKE $1 OR 
        network_type ILIKE $1`;
            queryText += searchClause;
            countQueryText += searchClause;
            queryParams.push(`%${search}%`);
        }

        queryText += ` ORDER BY id DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;

        const countResult = await db.query(countQueryText, queryParams);
        const totalRows = parseInt(countResult.rows[0].count);

        const dataResponse = await db.query(queryText, [...queryParams, limit, offset]);

        res.json({
            data: dataResponse.rows.map(row => ({
                id: row.id,
                networkType: row.network_type,
                siteId: row.site_id,
                ampliLat: parseFloat(row.ampli_lat),
                ampliLong: parseFloat(row.ampli_long),
                locality: row.locality,
                status: row.status,
                homepassId: row.homepass_id || null,
                createdAt: row.created_at,
                // JSONB returns object directly, but handle string case too
                polygonData: row.polygon_data
                    ? (typeof row.polygon_data === 'string' ? JSON.parse(row.polygon_data) : row.polygon_data)
                    : null
            })),
            pagination: {
                page,
                limit,
                totalRows,
                totalPages: Math.ceil(totalRows / limit)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/coverage', async (req, res) => {
    try {
        const item = req.body;
        const query = `
            INSERT INTO coverage_sites (
                network_type, site_id, ampli_lat, ampli_long, locality, status
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `;
        const values = [
            item.networkType || 'HFC',
            item.siteId,
            item.ampliLat || 0,
            item.ampliLong || 0,
            item.locality,
            item.status || 'Active'
        ];

        const result = await db.query(query, values);
        res.json({ message: 'Site created', id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/coverage/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const item = req.body;
        const query = `
            UPDATE coverage_sites SET
                network_type=$1, site_id=$2, ampli_lat=$3, ampli_long=$4, locality=$5, status=$6, homepass_id=$7
            WHERE id = $8
        `;
        const values = [
            item.networkType || 'HFC',
            item.siteId,
            item.ampliLat || 0,
            item.ampliLong || 0,
            item.locality,
            item.status || 'Active',
            item.homepassId || null,
            id
        ];

        await db.query(query, values);
        res.json({ message: 'Site updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/coverage/all', async (req, res) => {
    try {
        await db.query('TRUNCATE TABLE coverage_sites RESTART IDENTITY');
        res.json({ message: 'All sites deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/coverage/bulk-delete', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Valid IDs array required' });
        }
        await db.query('DELETE FROM coverage_sites WHERE id = ANY($1)', [ids]);
        res.json({ message: 'Selected sites deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/coverage/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM coverage_sites WHERE id = $1', [id]);
        res.json({ message: 'Site deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/coverage/bulk', async (req, res) => {
    try {
        const { data, importMode } = req.body;
        if (!data || !Array.isArray(data)) {
            throw new Error('Invalid data format');
        }

        const mode = importMode || 'insert'; // 'insert' = add new only, 'upsert' = update existing + add new
        console.log(`[Bulk Import] Starting ${mode} import of ${data.length} items`);

        let processed = 0;
        let updated = 0;
        let skipped = 0;
        let errors = [];

        for (const item of data) {
            try {
                // Mandatory fields validation: Network, Lat, Long
                if (!item.networkType) throw new Error('Network Type is required');
                if (item.ampliLat === undefined || item.ampliLat === null || item.ampliLat === '') throw new Error('Latitude is required');
                if (item.ampliLong === undefined || item.ampliLong === null || item.ampliLong === '') throw new Error('Longitude is required');

                const polygonJson = item.polygonData ? JSON.stringify(item.polygonData) : null;
                // Auto-generate Site ID if missing
                const siteId = item.siteId || `SITE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                const lat = parseFloat(item.ampliLat);
                const lng = parseFloat(item.ampliLong);

                if (isNaN(lat) || isNaN(lng)) throw new Error('Invalid coordinates');

                if (mode === 'upsert') {
                    // Check if a record with same site_id matches (if siteId provided) 
                    // OR check by coordinates if siteId was auto-generated? 
                    // Usually upsert relies on a unique key. If user didn't provide siteId, we can't really upsert by ID.
                    // We will assume if siteId IS provided, we check it. If not, we check coordinates.

                    let existing = { rows: [] };
                    if (item.siteId) {
                        existing = await db.query(
                            `SELECT id FROM coverage_sites WHERE site_id = $1 LIMIT 1`,
                            [siteId]
                        );
                    } else {
                        // Fallback check by coordinates if no Site ID provided in input
                        existing = await db.query(
                            `SELECT id FROM coverage_sites WHERE ampli_lat = $1 AND ampli_long = $2 LIMIT 1`,
                            [lat, lng]
                        );
                    }

                    if (existing.rows.length > 0) {
                        // Update existing record
                        await db.query(
                            `UPDATE coverage_sites SET 
                                network_type = $1, locality = $2, status = $3, polygon_data = $4, homepass_id = $5, updated_at = NOW()
                             WHERE id = $6`,
                            [item.networkType, item.locality || '', item.status || 'Active', polygonJson, item.homepassId || null, existing.rows[0].id]
                        );
                        updated++;
                    } else {
                        // Insert new record
                        await db.query(
                            `INSERT INTO coverage_sites (network_type, site_id, ampli_lat, ampli_long, locality, status, polygon_data, homepass_id)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                            [item.networkType, siteId, lat, lng, item.locality || '', item.status || 'Active', polygonJson, item.homepassId || null]
                        );
                        processed++;
                    }
                } else {
                    // Insert mode: always add as new data
                    await db.query(
                        `INSERT INTO coverage_sites (network_type, site_id, ampli_lat, ampli_long, locality, status, polygon_data, homepass_id)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [item.networkType, siteId, lat, lng, item.locality || '', item.status || 'Active', polygonJson, item.homepassId || null]
                    );
                    processed++;
                }
            } catch (itemErr) {
                console.error(`[Bulk Import] Error on item ${processed}:`, itemErr.message);
                errors.push({ index: processed, error: itemErr.message, siteId: item.siteId });
                if (errors.length > 50) {
                    throw new Error(`Too many errors (${errors.length}). First error: ${errors[0].error}`);
                }
            }
        }

        console.log(`[Bulk Import] Done. Mode: ${mode}, New: ${processed}, Updated: ${updated}, Errors: ${errors.length}`);
        res.json({
            message: mode === 'upsert'
                ? `Upsert: ${processed} baru ditambahkan, ${updated} data diupdate`
                : `Import: ${processed} data baru ditambahkan`,
            count: processed,
            updated,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (err) {
        console.error('[Bulk Import] Fatal error:', err.message);
        console.error('[Bulk Import] Stack:', err.stack);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/coverage/check-point', async (req, res) => {
    try {
        const lat = parseFloat(req.query.lat);
        const long = parseFloat(req.query.long);

        if (isNaN(lat) || isNaN(long)) {
            return res.status(400).json({ error: 'Invalid lat/long parameters' });
        }

        // Haversine formula in SQL (Distance in Meters)
        // 6371000 meters earth radius
        const query = `
            SELECT 
                site_id, ampli, network_type,
                ampli_lat, ampli_long,
                (
                    6371000 * acos(
                        least(1.0, greatest(-1.0, 
                            cos(radians($1)) * cos(radians(ampli_lat)) * 
                            cos(radians(ampli_long) - radians($2)) + 
                            sin(radians($1)) * sin(radians(ampli_lat))
                        ))
                    )
                ) AS distance
            FROM coverage_sites
            WHERE ampli_lat IS NOT NULL AND ampli_long IS NOT NULL
            ORDER BY distance ASC
            LIMIT 1
        `;

        const result = await db.query(query, [lat, long]);

        // Get dynamic radius
        const setRes = await db.query("SELECT value FROM system_settings WHERE key = 'coverageRadius'");
        const limitMetres = setRes.rows.length > 0 ? parseInt(setRes.rows[0].value) : 250;

        if (result.rows.length > 0) {
            const nearest = result.rows[0];
            const distance = Math.round(nearest.distance); // meters
            const isCovered = distance <= limitMetres;

            res.json({
                covered: isCovered,
                distance: distance,
                radiusLimit: limitMetres,
                nearestNode: {
                    site_id: nearest.site_id,
                    ampli: nearest.ampli,
                    network: nearest.network_type,
                    lat: nearest.ampli_lat,
                    long: nearest.ampli_long
                }
            });
        } else {
            res.json({ covered: false, distance: -1, message: 'No coverage data available' });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// PERSON IN CHARGE
// ==========================================

app.get('/api/person-incharge', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM person_in_charge ORDER BY id DESC');
        res.json(result.rows.map(row => ({
            id: row.id,
            name: row.name,
            role: row.role, // Sales, Support
            employeeId: row.employee_id,
            email: row.email,
            phone: row.phone,
            area: row.area,
            position: row.position,
            status: row.status,
            activeDate: row.active_date,
            inactiveDate: row.inactive_date,
            profileImage: row.profile_image
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/person-incharge', async (req, res) => {
    try {
        const { name, role, employeeId, email, phone, area, position, status, activeDate, inactiveDate, profileImage } = req.body;
        const query = `
      INSERT INTO person_in_charge (name, role, employee_id, email, phone, area, position, status, active_date, inactive_date, profile_image)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id
    `;
        const result = await db.query(query, [name, role, employeeId, email, phone, area, position, status || 'Active', activeDate, inactiveDate, profileImage]);
        res.json({ id: result.rows[0].id, message: 'Created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/person-incharge/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, employeeId, email, phone, area, position, status, activeDate, inactiveDate, profileImage } = req.body;
        const query = `
      UPDATE person_in_charge SET 
      name=$1, role=$2, employee_id=$3, email=$4, phone=$5, area=$6, position=$7, status=$8, active_date=$9, inactive_date=$10, profile_image=$11
      WHERE id=$12
    `;
        await db.query(query, [name, role, employeeId, email, phone, area, position, status, activeDate, inactiveDate, profileImage, id]);
        res.json({ message: 'Updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/person-incharge/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM person_in_charge WHERE id=$1', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ==========================================
// PRODUCTS
// ==========================================

app.get('/api/products', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM products ORDER BY id DESC');
        res.json(result.rows.map(row => ({
            id: row.id,
            name: row.name,
            category: row.category,
            serviceType: row.service_type,
            price: parseFloat(row.price),
            cogs: parseFloat(row.cogs),
            bandwidth: row.bandwidth,
            releaseDate: row.release_date,
            status: row.status
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { name, category, serviceType, price, cogs, bandwidth, releaseDate, status } = req.body;
        const query = `
      INSERT INTO products (name, category, service_type, price, cogs, bandwidth, release_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
    `;
        const result = await db.query(query, [name, category, serviceType, price, cogs, bandwidth, releaseDate, status || 'Active']);
        res.json({ id: result.rows[0].id, message: 'Created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, serviceType, price, cogs, bandwidth, releaseDate, status } = req.body;
        const query = `
      UPDATE products SET name=$1, category=$2, service_type=$3, price=$4, cogs=$5, bandwidth=$6, release_date=$7, status=$8
      WHERE id=$9
    `;
        await db.query(query, [name, category, serviceType, price, cogs, bandwidth, releaseDate, status, id]);
        res.json({ message: 'Updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM products WHERE id=$1', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ==========================================
// PROMOS
// ==========================================

app.get('/api/promos', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM promos ORDER BY id DESC');
        res.json(result.rows.map(row => ({
            id: row.id,
            name: row.name,
            validFrom: row.valid_from,
            validTo: row.valid_to,
            price: parseFloat(row.price),
            cogs: parseFloat(row.cogs),
            description: row.description,
            status: row.status
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/promos', async (req, res) => {
    try {
        const { name, validFrom, validTo, price, cogs, description, status } = req.body;
        const query = `
      INSERT INTO promos (name, valid_from, valid_to, price, cogs, description, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `;
        const result = await db.query(query, [name, validFrom, validTo, price, cogs, description, status || 'Active']);
        res.json({ id: result.rows[0].id, message: 'Created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/promos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, validFrom, validTo, price, cogs, description, status } = req.body;
        const query = `
      UPDATE promos SET name=$1, valid_from=$2, valid_to=$3, price=$4, cogs=$5, description=$6, status=$7
      WHERE id=$8
    `;
        await db.query(query, [name, validFrom, validTo, price, cogs, description, status, id]);
        res.json({ message: 'Updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/promos/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM promos WHERE id=$1', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ==========================================
// TARGETS (Clusters & Cities)
// ==========================================

app.get('/api/targets', async (req, res) => {
    try {
        // Fetch all clusters
        const clustersRes = await db.query('SELECT * FROM target_clusters ORDER BY name ASC');
        const clusters = clustersRes.rows;

        // Fetch all cities for these clusters
        // Efficiently fetch all and map in JS, better than N+1 queries
        const citiesRes = await db.query('SELECT * FROM target_cities');
        const cities = citiesRes.rows;

        // Map cities to clusters
        const result = clusters.map(cluster => ({
            id: cluster.id,
            name: cluster.name,
            totalTarget: cluster.total_target,
            provinces: [...new Set(cities.filter(c => c.cluster_id === cluster.id).map(c => c.province))], // Extract unique provinces
            cities: cities
                .filter(c => c.cluster_id === cluster.id)
                .map(c => ({
                    name: c.city_name,
                    province: c.province,
                    homepass: c.homepass,
                    percentage: parseFloat(c.percentage),
                    target: c.target
                }))
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/targets', async (req, res) => {
    const client = await db.pool.connect(); // We need transaction
    try {
        await client.query('BEGIN');
        const { name, cities } = req.body; // cities = [{name, province, homepass, percentage, target}]

        // 1. Create Cluster
        const totalTarget = cities.reduce((sum, c) => sum + (parseInt(c.target) || 0), 0);
        const clusterRes = await client.query(
            'INSERT INTO target_clusters (name, total_target) VALUES ($1, $2) RETURNING id',
            [name, totalTarget]
        );
        const clusterId = clusterRes.rows[0].id;

        // 2. Create Cities
        if (cities && cities.length > 0) {
            for (const city of cities) {
                await client.query(
                    `INSERT INTO target_cities (cluster_id, city_name, province, homepass, percentage, target)
           VALUES ($1, $2, $3, $4, $5, $6)`,
                    [clusterId, city.name, city.province, city.homepass, city.percentage, city.target]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ id: clusterId, message: 'Cluster created' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.put('/api/targets/:id', async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { name, cities } = req.body;

        // 1. Update Cluster Name & Total
        const totalTarget = cities.reduce((sum, c) => sum + (parseInt(c.target) || 0), 0);
        await client.query(
            'UPDATE target_clusters SET name=$1, total_target=$2 WHERE id=$3',
            [name, totalTarget, id]
        );

        // 2. Sync Cities (Strategy: Delete all old ones, insert new ones. Simplest for this logic)
        await client.query('DELETE FROM target_cities WHERE cluster_id=$1', [id]);

        if (cities && cities.length > 0) {
            for (const city of cities) {
                await client.query(
                    `INSERT INTO target_cities (cluster_id, city_name, province, homepass, percentage, target)
           VALUES ($1, $2, $3, $4, $5, $6)`,
                    [id, city.name, city.province, city.homepass, city.percentage, city.target]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Cluster updated' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.delete('/api/targets/:id', async (req, res) => {
    try {
        // Cascade delete ensures cities are deleted too
        await db.query('DELETE FROM target_clusters WHERE id=$1', [req.params.id]);
        res.json({ message: 'Cluster deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// CUSTOMERS & PROSPECTS
// ==========================================

// ==========================================
// SETTINGS
// ==========================================

app.get('/api/settings', async (req, res) => {
    try {
        // Create table if not exists (lazy migration)
        await db.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(50) PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        const result = await db.query('SELECT * FROM system_settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', async (req, res) => {
    try {
        const { key, value } = req.body;
        await db.query(`
            INSERT INTO system_settings (key, value, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `, [key, String(value)]);
        res.json({ message: 'Setting saved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/settings', async (req, res) => {
    try {
        const settings = req.body;
        for (const [key, value] of Object.entries(settings)) {
            await db.query(`
                INSERT INTO system_settings (key, value, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
            `, [key, String(value)]);
        }
        res.json({ message: 'Settings updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ==========================================
// CUSTOMERS & PROSPECTS
// ==========================================

app.post('/api/customers/bulk', async (req, res) => {
    try {
        const { data, importMode } = req.body;
        if (!data || !Array.isArray(data)) throw new Error('Invalid data format');

        const mode = importMode || 'insert'; // 'insert' = add new only, 'upsert' = update existing + add new
        console.log(`[Customer Bulk] Starting ${mode} import of ${data.length} items`);

        let count = 0;
        let errors = [];
        for (const item of data) {
            try {
                const customerId = item.customerId || `CUST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                if (mode === 'upsert') {
                    await db.query(`
                        INSERT INTO customers (
                            customer_id, type, name, address, area, kabupaten, kecamatan, kelurahan,
                            latitude, longitude, phone, email, product_name, status, prospect_date, is_active
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                        ON CONFLICT (customer_id) DO UPDATE SET
                            type = EXCLUDED.type,
                            name = EXCLUDED.name,
                            address = EXCLUDED.address,
                            area = EXCLUDED.area,
                            kabupaten = EXCLUDED.kabupaten,
                            kecamatan = EXCLUDED.kecamatan,
                            kelurahan = EXCLUDED.kelurahan,
                            latitude = EXCLUDED.latitude,
                            longitude = EXCLUDED.longitude,
                            phone = EXCLUDED.phone,
                            email = EXCLUDED.email,
                            product_name = EXCLUDED.product_name,
                            status = EXCLUDED.status,
                            prospect_date = EXCLUDED.prospect_date,
                            is_active = EXCLUDED.is_active
                    `, [
                        customerId, item.type || 'Broadband Home', item.name, item.address, item.area, item.kabupaten, item.kecamatan, item.kelurahan,
                        item.latitude || 0, item.longitude || 0, item.phone, item.email, item.productName, item.status || 'Prospect',
                        item.prospectDate || new Date(), item.isActive !== false
                    ]);
                } else {
                    await db.query(`
                        INSERT INTO customers (
                            customer_id, type, name, address, area, kabupaten, kecamatan, kelurahan,
                            latitude, longitude, phone, email, product_name, status, prospect_date, is_active
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                        ON CONFLICT (customer_id) DO NOTHING
                    `, [
                        customerId, item.type || 'Broadband Home', item.name, item.address, item.area, item.kabupaten, item.kecamatan, item.kelurahan,
                        item.latitude || 0, item.longitude || 0, item.phone, item.email, item.productName, item.status || 'Prospect',
                        item.prospectDate || new Date(), item.isActive !== false
                    ]);
                }
                count++;
            } catch (itemErr) {
                errors.push({ index: count, error: itemErr.message });
            }
        }
        res.json({
            message: mode === 'upsert'
                ? `Upsert completed: ${count} rows processed (existing data updated, new data added)`
                : `Imported ${count} new customers`,
            count,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/customers', async (req, res) => {
    try {
        const query = `
            SELECT c.*, 
                (SELECT COUNT(*)::int FROM tickets t WHERE t.customer_id = c.id AND t.status IN ('Open', 'In Progress')) as open_ticket_count
            FROM customers c 
            ORDER BY c.created_at DESC
        `;
        const result = await db.query(query);
        res.json(result.rows.map(row => ({
            id: row.id,
            customerId: row.customer_id,
            type: row.type,
            name: row.name,
            address: row.address,
            area: row.area,
            kabupaten: row.kabupaten,
            kecamatan: row.kecamatan,
            kelurahan: row.kelurahan,
            latitude: row.latitude ? parseFloat(row.latitude) : null,
            longitude: row.longitude ? parseFloat(row.longitude) : null,
            phone: row.phone,
            email: row.email,
            productId: row.product_id,
            productName: row.product_name,
            rfsDate: row.rfs_date,
            files: row.files ? JSON.parse(row.files) : [],
            salesId: row.sales_id,
            salesName: row.sales_name,
            status: row.status,
            isActive: row.is_active !== false,
            prospectDate: row.prospect_date,
            openTicketCount: row.open_ticket_count || 0,
            fat: row.fat,
            homepassId: row.homepass_id // Added homepassId
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/customers', async (req, res) => {
    try {
        const item = req.body;
        // Generate a simple Customer ID if not provided (e.g., CUST-TIMESTAMP)
        const customerId = item.customerId || `CUST-${Date.now()}`;

        const query = `
            INSERT INTO customers (
                customer_id, type, name, address, area, kabupaten, kecamatan, kelurahan,
                latitude, longitude, phone, email, product_id, product_name, rfs_date,
                files, sales_id, sales_name, status, prospect_date, is_active, fat, homepass_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
            RETURNING id
        `;

        const values = [
            customerId, item.type, item.name, item.address, item.area, item.kabupaten, item.kecamatan, item.kelurahan,
            item.latitude, item.longitude, item.phone, item.email, item.productId, item.productName, item.rfsDate,
            item.files ? JSON.stringify(item.files) : '[]', item.salesId, item.salesName, item.status || 'Prospect', item.prospectDate || new Date(),
            item.isActive !== false, item.fat, item.homepassId
        ];

        const result = await db.query(query, values);
        res.json({ message: 'Customer created', id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/customers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const item = req.body;

        const query = `
            UPDATE customers SET
                customer_id=$1, type=$2, name=$3, address=$4, area=$5, kabupaten=$6, kecamatan=$7, kelurahan=$8,
                latitude=$9, longitude=$10, phone=$11, email=$12, product_id=$13, product_name=$14, rfs_date=$15,
                files=$16, sales_id=$17, sales_name=$18, status=$19, prospect_date=$20, is_active=$21, fat=$22, homepass_id=$23
            WHERE id = $24
        `;

        const values = [
            item.customerId, item.type, item.name, item.address, item.area, item.kabupaten, item.kecamatan, item.kelurahan,
            item.latitude, item.longitude, item.phone, item.email, item.productId, item.productName, item.rfsDate,
            item.files ? JSON.stringify(item.files) : '[]', item.salesId, item.salesName, item.status, item.prospectDate,
            item.isActive !== false, item.fat, item.homepassId,
            id
        ];

        await db.query(query, values);
        res.json({ message: 'Customer updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/customers/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
        res.json({ message: 'Customer deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// HOT NEWS
// ==========================================

app.get('/api/hotnews', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT * FROM hot_news 
            WHERE is_active = true 
            AND start_date <= NOW() 
            AND end_date >= NOW()
            ORDER BY priority DESC, created_at DESC
        `);
        res.json(result.rows.map(row => ({
            id: row.id,
            title: row.title,
            content: row.content,
            priority: row.priority,
            startDate: row.start_date,
            endDate: row.end_date,
            isActive: row.is_active,
            createdBy: row.created_by,
            createdAt: row.created_at
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/hotnews/all', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM hot_news ORDER BY created_at DESC');
        res.json(result.rows.map(row => ({
            id: row.id,
            title: row.title,
            content: row.content,
            priority: row.priority,
            startDate: row.start_date,
            endDate: row.end_date,
            isActive: row.is_active,
            createdBy: row.created_by,
            createdAt: row.created_at
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/hotnews', async (req, res) => {
    try {
        const { title, content, priority, startDate, endDate, isActive, createdBy } = req.body;
        const result = await db.query(
            `INSERT INTO hot_news (title, content, priority, start_date, end_date, is_active, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [title, content, priority || 1, startDate, endDate, isActive !== false, createdBy || 'Admin']
        );
        res.json({ message: 'Hot news created', id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/hotnews/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, priority, startDate, endDate, isActive } = req.body;
        await db.query(
            `UPDATE hot_news SET title=$1, content=$2, priority=$3, start_date=$4, end_date=$5, is_active=$6, updated_at=NOW()
             WHERE id=$7`,
            [title, content, priority, startDate, endDate, isActive, id]
        );
        res.json({ message: 'Hot news updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/hotnews/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM hot_news WHERE id = $1', [req.params.id]);
        res.json({ message: 'Hot news deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// DASHBOARD STATS
// ==========================================

app.get('/api/dashboard/stats', async (req, res) => {
    try {
        // Total Target (sum of all targets from all cities)
        const totalTarget = await db.query(
            `SELECT COALESCE(SUM(target), 0) as total FROM target_cities`
        );

        // Total Cities (count of cities in target_cities table)
        const totalCities = await db.query(
            `SELECT COUNT(*) as count FROM target_cities`
        );

        // New Subscribers (active customers with is_active = true)
        const newSubscribers = await db.query(
            `SELECT COUNT(*) as count FROM customers WHERE is_active = true`
        );

        // Total Achievement (sum of all targets achieved - simplified)
        const achievement = await db.query(
            `SELECT COALESCE(SUM(total_target), 0) as total FROM target_clusters`
        );

        // Monthly sales data for chart (Jan-Dec)
        const monthlySales = await db.query(`
            SELECT 
                EXTRACT(MONTH FROM prospect_date) as month,
                COUNT(*) as count
            FROM customers
            WHERE EXTRACT(YEAR FROM prospect_date) = EXTRACT(YEAR FROM NOW())
            GROUP BY EXTRACT(MONTH FROM prospect_date)
            ORDER BY month
        `);

        res.json({
            totalTarget: parseInt(totalTarget.rows[0].total),
            totalCities: parseInt(totalCities.rows[0].count),
            newSubscribers: parseInt(newSubscribers.rows[0].count),
            achievement: parseInt(achievement.rows[0].total),
            monthlySales: monthlySales.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// ACHIEVEMENT DATA
// ==========================================

app.get('/api/achievement', async (req, res) => {
    try {
        // Achievement by City
        const cityAchievement = await db.query(`
            SELECT 
                tc.city_name,
                tc.province,
                tc.target,
                COUNT(CASE WHEN c.is_active = true THEN 1 END) as actual,
                ROUND((COUNT(CASE WHEN c.is_active = true THEN 1 END)::numeric / NULLIF(tc.target, 0)) * 100, 2) as percentage
            FROM target_cities tc
            LEFT JOIN customers c ON c.kabupaten = tc.city_name AND c.is_active = true
            GROUP BY tc.id, tc.city_name, tc.province, tc.target
            ORDER BY percentage DESC
        `);

        // Achievement by Sales Person
        const salesAchievement = await db.query(`
            SELECT 
                p.id,
                p.name,
                p.area,
                COUNT(c.id) as actual,
                0 as target,
                0 as percentage
            FROM person_in_charge p
            LEFT JOIN customers c ON c.sales_id = p.id AND c.is_active = true
            WHERE p.role = 'Sales'
            GROUP BY p.id, p.name, p.area
            ORDER BY actual DESC
        `);

        // Total Summary
        const totalTarget = await db.query(`SELECT COALESCE(SUM(target), 0) as total FROM target_cities`);
        const totalActual = await db.query(`SELECT COUNT(*) as total FROM customers WHERE is_active = true`);

        const target = parseInt(totalTarget.rows[0].total);
        const actual = parseInt(totalActual.rows[0].total);
        const percentage = target > 0 ? ((actual / target) * 100).toFixed(2) : 0;

        res.json({
            summary: {
                totalTarget: target,
                totalActual: actual,
                percentage: parseFloat(percentage)
            },
            byCity: cityAchievement.rows.map(row => ({
                cityName: row.city_name,
                province: row.province,
                target: parseInt(row.target),
                actual: parseInt(row.actual),
                percentage: parseFloat(row.percentage || 0)
            })),
            bySales: salesAchievement.rows.map(row => ({
                id: row.id,
                name: row.name,
                area: row.area,
                actual: parseInt(row.actual),
                target: parseInt(row.target),
                percentage: parseFloat(row.percentage || 0)
            }))
        });
    } catch (err) {
        console.error('Achievement error:', err);
        res.status(500).json({ error: err.message });
    }
});


// Duplicate settings routes removed
// See lines ~794 for active settings routes

// ==========================================
// TICKET MANAGEMENT (OMNIFLOW)
// ==========================================

// Helper to generate Ticket ID
const generateTicketNumber = async () => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `TIK-${date}`;

    // Check last ticket today
    const res = await db.query(`SELECT ticket_number FROM tickets WHERE ticket_number LIKE '${prefix}-%' ORDER BY id DESC LIMIT 1`);

    let sequence = 1;
    if (res.rows.length > 0) {
        const lastTicket = res.rows[0].ticket_number;
        const lastSeq = parseInt(lastTicket.split('-')[2]);
        sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(3, '0')}`;
};

// Get all tickets with Customer Phone
app.get('/api/tickets', async (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT t.*, c.phone as customer_phone 
            FROM tickets t
            LEFT JOIN customers c ON t.customer_id = c.id
        `;
        const params = [];

        if (status && status !== 'All') {
            query += ' WHERE t.status = $1';
            params.push(status);
        }

        query += ' ORDER BY t.created_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new ticket
app.post('/api/tickets', async (req, res) => {
    try {
        const { customerId, customerName, category, description, assignedTo, assignedName, source, priority } = req.body;
        const ticketNumber = await generateTicketNumber();

        const query = `
            INSERT INTO tickets (
                ticket_number, customer_id, customer_name, category, description, 
                assigned_to, assigned_name, source, priority, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Open')
            RETURNING *
        `;

        const values = [
            ticketNumber, customerId, customerName, category, description,
            assignedTo, assignedName, source || 'WhatsApp', priority || 'Medium'
        ];

        const result = await db.query(query, values);

        // Auto-create initial activity
        await db.query(`
            INSERT INTO ticket_activities (ticket_id, activity_type, content, created_by)
            VALUES ($1, 'status_change', 'Ticket created', 'System')
        `, [result.rows[0].id]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Update ticket status
app.put('/api/tickets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assignedTo, assignedName, updatedBy } = req.body;

        let query = 'UPDATE tickets SET status = $1, updated_at = NOW()';
        const values = [status];
        let idx = 2;

        if (status === 'Solved') {
            query += `, solved_at = NOW()`;
        }

        if (assignedTo) {
            query += `, assigned_to = $${idx++}, assigned_name = $${idx++}`;
            values.push(assignedTo, assignedName);
        }

        query += ` WHERE id = $${idx}`;
        values.push(id);

        await db.query(query, values);

        // Log activity
        let logMsg = `Status updated to ${status}`;
        if (assignedName) logMsg += ` & Assigned to ${assignedName}`;

        await db.query(`
            INSERT INTO ticket_activities (ticket_id, activity_type, content, created_by)
            VALUES ($1, 'status_change', $2, $3)
        `, [id, logMsg, updatedBy || 'System']);

        res.json({ message: 'Ticket updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Ticket Activities
app.get('/api/tickets/:id/activities', async (req, res) => {
    try {
        const result = await db.query(`SELECT * FROM ticket_activities WHERE ticket_id = $1 ORDER BY created_at ASC`, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Ticket Activity
app.post('/api/tickets/:id/activities', async (req, res) => {
    try {
        const { id } = req.params;
        const { activityType, content, createdBy } = req.body;

        const result = await db.query(`
            INSERT INTO ticket_activities (ticket_id, activity_type, content, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [id, activityType || 'note', content, createdBy || 'System']);

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Helpdesk/CS Agents
app.get('/api/helpdesk-agents', async (req, res) => {
    try {
        const result = await db.query(`SELECT id, name, role FROM person_in_charge WHERE role IN ('CS', 'Helpdesk', 'Sales') ORDER BY name`);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ==========================================
// AUTHENTICATION
// ==========================================

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const passwordHash = hashPassword(password);

        // Check against users table and get role permissions
        const result = await db.query(
            `SELECT u.id, u.username, u.email, u.full_name, u.role, r.permissions as role_permissions 
             FROM users u
             LEFT JOIN roles r ON LOWER(u.role) = LOWER(r.name)
             WHERE (u.username = $1 OR u.email = $1) AND u.password_hash = $2 AND u.is_active = true`,
            [username, passwordHash]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            // Update last login
            await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
            res.json({ success: true, user });
        } else {
            res.status(401).json({ error: 'Invalid credentials or inactive account' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Validate session - check if stored user is still valid/active
app.post('/api/me', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(401).json({ valid: false, error: 'No user ID provided' });
        }

        const result = await db.query(
            `SELECT u.id, u.username, u.email, u.full_name, u.role, r.permissions as role_permissions 
             FROM users u
             LEFT JOIN roles r ON LOWER(u.role) = LOWER(r.name)
             WHERE u.id = $1 AND u.is_active = true`,
            [userId]
        );

        if (result.rows.length > 0) {
            res.json({ valid: true, user: result.rows[0] });
        } else {
            res.status(401).json({ valid: false, error: 'User not found or inactive' });
        }
    } catch (err) {
        res.status(500).json({ valid: false, error: err.message });
    }
});

// ==========================================
// USER MANAGEMENT
// ==========================================

const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

app.get('/api/users', async (req, res) => {
    try {
        const result = await db.query('SELECT id, username, email, full_name, role, is_active, last_login, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { username, email, password, fullName, role } = req.body;
        const passwordHash = hashPassword(password);

        const query = `
            INSERT INTO users (username, email, password_hash, full_name, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, username
        `;
        const result = await db.query(query, [username, email, passwordHash, fullName, role || 'user']);
        res.json({ message: 'User created', user: result.rows[0] });
    } catch (err) {
        console.error('Error creating user:', err);

        // Handle unique constraint violations (duplicate username or email)
        if (err.code === '23505') {
            if (err.constraint === 'users_username_key') {
                return res.status(400).json({ error: 'Username already exists' });
            } else if (err.constraint === 'users_email_key') {
                return res.status(400).json({ error: 'Email already exists' });
            }
            return res.status(400).json({ error: 'User with this username or email already exists' });
        }

        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, password, fullName, role, isActive } = req.body;

        let query = 'UPDATE users SET username=$1, email=$2, full_name=$3, role=$4, is_active=$5';
        const values = [username, email, fullName, role, isActive];
        let idx = 6;

        if (password) {
            query += `, password_hash=$${idx}`;
            values.push(hashPassword(password));
            idx++;
        }

        query += ` WHERE id=$${idx}`;
        values.push(id);

        await db.query(query, values);
        res.json({ message: 'User updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// ROLES MANAGEMENT
// ==========================================

app.get('/api/roles', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM roles ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new role
app.post('/api/roles', async (req, res) => {
    try {
        const { name, description, permissions, data_scope, allowed_clusters, allowed_provinces } = req.body;

        await db.query(
            `INSERT INTO roles (
                name, description, permissions, data_scope, allowed_clusters, allowed_provinces, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())`,
            [
                name,
                description || '',
                JSON.stringify(permissions || {}),
                data_scope || 'all',
                JSON.stringify(allowed_clusters || []),
                JSON.stringify(allowed_provinces || [])
            ]
        );

        res.json({ message: 'Role created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update role
app.put('/api/roles/:id', async (req, res) => {
    try {
        const { name, description, permissions, data_scope, allowed_clusters, allowed_provinces, isActive } = req.body;

        if (isActive !== undefined && Object.keys(req.body).length === 1) {
            // Quick status update only
            await db.query('UPDATE roles SET is_active = $1, updated_at = NOW() WHERE id = $2', [isActive, req.params.id]);
            return res.json({ message: 'Role status updated' });
        }

        await db.query(
            `UPDATE roles SET 
                name = $1, 
                description = $2, 
                permissions = $3, 
                data_scope = $4,
                allowed_clusters = $5,
                allowed_provinces = $6,
                updated_at = NOW() 
             WHERE id = $7`,
            [
                name,
                description || '',
                JSON.stringify(permissions || {}),
                data_scope || 'all',
                JSON.stringify(allowed_clusters || []),
                JSON.stringify(allowed_provinces || []),
                req.params.id
            ]
        );

        res.json({ message: 'Role updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete role
app.delete('/api/roles/:id', async (req, res) => {
    try {
        // Prevent deleting core roles to avoid lockout (optional safely guard)
        const roleCheck = await db.query('SELECT name FROM roles WHERE id = $1', [req.params.id]);
        if (roleCheck.rows.length > 0) {
            const rName = roleCheck.rows[0].name.toLowerCase();
            if (rName === 'admin' || rName === 'super_admin') {
                return res.status(403).json({ error: 'Cannot delete core system roles' });
            }
        }

        await db.query('DELETE FROM roles WHERE id = $1', [req.params.id]);
        res.json({ message: 'Role deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// SYSTEM SETTINGS
// ==========================================

app.get('/api/settings', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM system_settings');
        // Convert array to object
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/settings', async (req, res) => {
    try {
        const settings = req.body;
        // Upsert each setting
        for (const [key, value] of Object.entries(settings)) {
            await db.query(`
                INSERT INTO system_settings (key, value, updated_at) 
                VALUES ($1, $2, NOW())
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
            `, [key, value]);
        }
        res.json({ message: 'Settings updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export default app;
