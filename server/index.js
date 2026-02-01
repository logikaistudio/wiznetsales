import express from 'express';
import cors from 'cors';
import db from './db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// Setup Schema Route
app.get('/api/setup-schema', async (req, res) => {
    // Just a wrapper to manual setup if needed, but preferred to use script
    res.json({ message: 'Please run npm run server:setup' });
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
        ampli ILIKE $1 OR 
        city_town ILIKE $1 OR 
        cluster_id ILIKE $1`;
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
                siteId: row.site_id,
                ampli: row.ampli,
                clusterId: row.cluster_id,
                cityTown: row.city_town,
                kecamatan: row.kecamatan,
                kelurahan: row.kelurahan,
                networkType: row.network_type,
                fibernode: row.fibernode,
                fibernodeDesc: row.fibernode_desc,
                areaLat: parseFloat(row.area_lat),
                areaLong: parseFloat(row.area_long),
                ampliLat: parseFloat(row.ampli_lat),
                ampliLong: parseFloat(row.ampli_long),
                location: row.location,
                streetName: row.street_name,
                streetBlock: row.street_block,
                streetNo: row.street_no,
                rtrw: row.rtrw,
                dwelling: row.dwelling,
                status: row.status
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
                site_id, ampli, cluster_id, city_town, kecamatan, kelurahan, 
                network_type, fibernode, fibernode_desc, area_lat, area_long,
                ampli_lat, ampli_long, location, street_name, street_block, 
                street_no, rtrw, dwelling, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING id
        `;
        const values = [
            item.siteId, item.ampli, item.clusterId, item.cityTown, item.kecamatan, item.kelurahan,
            item.networkType, item.fibernode, item.fibernodeDesc, item.areaLat || 0, item.areaLong || 0,
            item.ampliLat || 0, item.ampliLong || 0, item.location, item.streetName, item.streetBlock,
            item.streetNo, item.rtrw, item.dwelling, item.status || 'Active'
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
                site_id=$1, ampli=$2, cluster_id=$3, city_town=$4, kecamatan=$5, kelurahan=$6, 
                network_type=$7, fibernode=$8, fibernode_desc=$9, area_lat=$10, area_long=$11,
                ampli_lat=$12, ampli_long=$13, location=$14, street_name=$15, street_block=$16, 
                street_no=$17, rtrw=$18, dwelling=$19, status=$20
            WHERE id = $21
        `;
        const values = [
            item.siteId, item.ampli, item.clusterId, item.cityTown, item.kecamatan, item.kelurahan,
            item.networkType, item.fibernode, item.fibernodeDesc, item.areaLat || 0, item.areaLong || 0,
            item.ampliLat || 0, item.ampliLong || 0, item.location, item.streetName, item.streetBlock,
            item.streetNo, item.rtrw, item.dwelling, item.status || 'Active',
            id
        ];

        await db.query(query, values);
        res.json({ message: 'Site updated' });
    } catch (err) {
        console.error(err);
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
        const { data } = req.body;
        if (!data || !Array.isArray(data)) {
            throw new Error('Invalid data format');
        }
        const query = `
      INSERT INTO coverage_sites (
        site_id, ampli, cluster_id, city_town, kecamatan, kelurahan, 
        network_type, fibernode, fibernode_desc, area_lat, area_long,
        ampli_lat, ampli_long, location, street_name, street_block, 
        street_no, rtrw, dwelling, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    `;
        let count = 0;
        for (const item of data) {
            await db.query(query, [
                item.siteId, item.ampli, item.clusterId, item.cityTown, item.kecamatan, item.kelurahan,
                item.networkType, item.fibernode, item.fibernodeDesc, item.areaLat || 0, item.areaLong || 0,
                item.ampliLat || 0, item.ampliLong || 0, item.location, item.streetName, item.streetBlock,
                item.streetNo, item.rtrw, item.dwelling, item.status || 'Active'
            ]);
            count++;
        }
        res.json({ message: `Imported ${count} rows` });
    } catch (err) {
        console.error(err);
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

        if (result.rows.length > 0) {
            const nearest = result.rows[0];
            const distance = Math.round(nearest.distance); // meters
            const isCovered = distance <= 250; // 250m threshold

            res.json({
                covered: isCovered,
                distance: distance,
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
        const { name, category, price, cogs, bandwidth, releaseDate, status } = req.body;
        const query = `
      INSERT INTO products (name, category, price, cogs, bandwidth, release_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `;
        const result = await db.query(query, [name, category, price, cogs, bandwidth, releaseDate, status || 'Active']);
        res.json({ id: result.rows[0].id, message: 'Created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, price, cogs, bandwidth, releaseDate, status } = req.body;
        const query = `
      UPDATE products SET name=$1, category=$2, price=$3, cogs=$4, bandwidth=$5, release_date=$6, status=$7
      WHERE id=$8
    `;
        await db.query(query, [name, category, price, cogs, bandwidth, releaseDate, status, id]);
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
            openTicketCount: row.open_ticket_count || 0
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
                files, sales_id, sales_name, status, prospect_date, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            RETURNING id
        `;

        const values = [
            customerId, item.type, item.name, item.address, item.area, item.kabupaten, item.kecamatan, item.kelurahan,
            item.latitude, item.longitude, item.phone, item.email, item.productId, item.productName, item.rfsDate,
            item.files ? JSON.stringify(item.files) : '[]', item.salesId, item.salesName, item.status || 'Prospect', item.prospectDate || new Date(),
            item.isActive !== false
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
                files=$16, sales_id=$17, sales_name=$18, status=$19, prospect_date=$20, is_active=$21
            WHERE id = $22
        `;

        const values = [
            item.customerId, item.type, item.name, item.address, item.area, item.kabupaten, item.kecamatan, item.kelurahan,
            item.latitude, item.longitude, item.phone, item.email, item.productId, item.productName, item.rfsDate,
            item.files ? JSON.stringify(item.files) : '[]', item.salesId, item.salesName, item.status, item.prospectDate,
            item.isActive !== false,
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


// ==========================================
// APP SETTINGS
// ==========================================

app.get('/api/settings', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM app_settings');
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
        const settings = req.body; // { key: value, key2: value2 }

        for (const [key, value] of Object.entries(settings)) {
            await db.query(`
                INSERT INTO app_settings (key, value, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
            `, [key, value]);
        }

        res.json({ message: 'Settings saved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export default app;
