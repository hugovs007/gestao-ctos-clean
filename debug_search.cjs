
const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function findTestCto() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT c.id, c.name, c.latitude, c.longitude, c.total_ports, ci.name as city_name
      FROM ctos c
      JOIN cities ci ON c.city_id = ci.id
      WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
      LIMIT 5
    `);
    
    console.log('--- Test CTOs available ---');
    console.table(res.rows);

    if (res.rows.length > 0) {
      const cto = res.rows[0];
      console.log(`\nTesting coordinate search for ${cto.name}:`);
      console.log(`Lat: ${cto.latitude}, Lng: ${cto.longitude}`);
      
      const searchRes = await client.query(`
        WITH cto_distances AS (
          SELECT 
            c.*, 
            (
              6371 * acos(
                LEAST(1.0, GREATEST(-1.0, 
                  cos(radians($1)) * cos(radians(c.latitude)) * 
                  cos(radians(c.longitude) - radians($2)) + 
                  sin(radians($1)) * sin(radians(c.latitude))
                ))
              )
            ) AS distance
          FROM ctos c
          WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
        )
        SELECT name, distance FROM cto_distances
        WHERE distance <= 1.0
        ORDER BY distance ASC
      `, [cto.latitude, cto.longitude]);
      
      console.log('\nSearch results within 1km:');
      console.table(searchRes.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

findTestCto();
