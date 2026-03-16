
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function listAllCtos() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    console.log('--- Listing All Cities ---');
    const cities = await client.query("SELECT id, name FROM cities");
    console.table(cities.rows);

    console.log('\n--- Listing All CTOs (limited to 50) ---');
    const res = await client.query(
      "SELECT c.id, c.name, c.address, c.latitude, c.longitude, ci.name as city_name FROM ctos c JOIN cities ci ON c.city_id = ci.id LIMIT 50"
    );
    
    console.table(res.rows.map(r => ({
      city: r.city_name,
      name: r.name,
      address: r.address ? (r.address.length > 30 ? r.address.substring(0, 27) + '...' : r.address) : 'EMPTY',
      has_coords: r.latitude !== null && r.longitude !== null,
      lat: r.latitude,
      lng: r.longitude
    })));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

listAllCtos();
