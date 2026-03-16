
const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Check columns
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ctos'
    `);
    console.log('Columns in ctos:', columns.rows.map(r => r.column_name).join(', '));

    const res = await client.query(`
      SELECT c.id, c.name, c.latitude, c.longitude, c.total_ports, ci.name as city_name
      FROM ctos c
      JOIN cities ci ON c.city_id = ci.id
      WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
      LIMIT 10
    `);
    
    if (res.rows.length === 0) {
      console.log('No CTOs with coordinates found in the entire database!');
    } else {
      console.log('--- Sample CTOs ---');
      console.table(res.rows);
      
      const cto = res.rows[0];
      const lat = parseFloat(cto.latitude);
      const lng = parseFloat(cto.longitude);

      console.log(`\nTesting search for: ${cto.name} (${lat}, ${lng})`);

      const searchRes = await client.query(`
        SELECT name, latitude, longitude FROM ctos
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        LIMIT 5
      `);
      console.log('Verifying standard select works:', searchRes.rows.length);

      // Simple Distance Check
      const distRes = await client.query(`
        SELECT name, latitude, longitude,
        (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0, 
              cos(radians($1)) * cos(radians(latitude)) * 
              cos(radians(longitude) - radians($2)) + 
              sin(radians($1)) * sin(radians(latitude))
            ))
          )
        ) AS distance
        FROM ctos
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY distance ASC
        LIMIT 5
      `, [lat, lng]);
      
      console.log('\nClosest results:');
      console.table(distRes.rows);
    }

  } catch (err) {
    console.error('FULL ERROR:', err);
  } finally {
    await client.end();
  }
}

run();
