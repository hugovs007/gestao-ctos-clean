
const { Client } = require('pg');

async function debugData() {
  const connectionString = 'postgresql://neondb_owner:npg_oInDt2H6EWUh@ep-winter-mode-ac8fc3d9.sa-east-1.aws.neon.tech/neondb?sslmode=require';
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    
    // 1. Check a few CTOs that DO NOT have coordinates to see their addresses
    const noGps = await client.query(`
      SELECT c.name, c.address, ci.name as city_name 
      FROM ctos c 
      JOIN cities ci ON c.city_id = ci.id 
      WHERE c.latitude IS NULL 
      LIMIT 10
    `);
    console.log('\n--- CTOs without GPS (Sample) ---');
    console.table(noGps.rows);

    // 2. Check those 39 that DO have GPS
    const withGps = await client.query(`
      SELECT c.name, c.address, c.latitude, c.longitude, ci.name as city_name 
      FROM ctos c 
      JOIN cities ci ON c.city_id = ci.id 
      WHERE c.latitude IS NOT NULL 
      LIMIT 40
    `);
    console.log('\n--- CTOs with GPS (The 39) ---');
    console.table(withGps.rows);

    // 3. Check if there are multiple cities and how they are distributed
    const dist = await client.query(`
      SELECT ci.name, COUNT(c.id) as total, COUNT(c.latitude) as with_gps
      FROM cities ci
       JOIN ctos c ON c.city_id = ci.id
      GROUP BY ci.name
      HAVING COUNT(c.id) > 100
      ORDER BY total DESC
      LIMIT 10
    `);
    console.log('\n--- CTO Distribution by City ---');
    console.table(dist.rows);

  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await client.end();
  }
}

debugData();
