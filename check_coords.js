
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function checkDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    console.log('--- CTO Coordinate Statistics ---');
    const statsRes = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(latitude) as with_coords,
        COUNT(*) FILTER (WHERE latitude IS NULL) as missing_coords
      FROM ctos
    `);
    console.table(statsRes.rows);
    
    console.log('\n--- Sample CTOs WITHOUT Coords ---');
    const missingRes = await client.query('SELECT name, address FROM ctos WHERE latitude IS NULL LIMIT 5');
    console.table(missingRes.rows);

    console.log('\n--- Sample CTOs WITH Coords ---');
    const withRes = await client.query('SELECT name, address, latitude, longitude FROM ctos WHERE latitude IS NOT NULL LIMIT 5');
    console.table(withRes.rows);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkDb();
